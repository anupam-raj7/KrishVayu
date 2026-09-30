"""Wraps the saved Koraput XGBoost models so the Node backend can call them.
Feature engineering mirrors the training/test script exactly (one location only)."""
import json
import os
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from xgboost import XGBClassifier, XGBRegressor

MODEL_DIR = os.getenv("MODEL_DIR", "koraput_xgboost_improved")
FEATURES = joblib.load(f"{MODEL_DIR}/features.joblib")
MEDIANS = joblib.load(f"{MODEL_DIR}/feature_medians.joblib")
THRESHOLD = float(json.load(open(f"{MODEL_DIR}/rain_threshold.json"))["classification_threshold"])

classifier = XGBClassifier()
classifier.load_model(f"{MODEL_DIR}/koraput_rain_classifier.json")
regressor = XGBRegressor()
regressor.load_model(f"{MODEL_DIR}/koraput_rainfall_regressor.json")

WEATHER = ["temperature_C", "dewpoint_C", "humidity"]
app = FastAPI()


class Day(BaseModel):
    date: str
    rain: Optional[float] = None
    temp: Optional[float] = None
    dewPoint: Optional[float] = None
    humidity: Optional[float] = None


class Request(BaseModel):
    district: str
    block: str
    village: str
    date: str
    temperature: float
    dewPoint: float
    humidity: float
    blockRainfall: float
    history: List[Day] = []


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    d = df["date"]
    df["year"], df["month"], df["day"] = d.dt.year, d.dt.month, d.dt.day
    df["day_of_year"], df["day_of_week"] = d.dt.dayofyear, d.dt.dayofweek
    df["week_of_year"] = d.dt.isocalendar().week.astype(int)
    df["quarter"] = d.dt.quarter
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["doy_sin"] = np.sin(2 * np.pi * df["day_of_year"] / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * df["day_of_year"] / 365.25)
    df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

    rain = df["rainfall_mm"]
    for lag in [1, 2, 3, 5, 7, 10, 14, 21, 30]:
        df[f"rain_lag_{lag}"] = rain.shift(lag)

    prev = rain.shift(1)
    for w in [3, 7, 14, 21, 30]:
        r = prev.rolling(w, min_periods=1)
        df[f"rain_mean_{w}"], df[f"rain_sum_{w}"], df[f"rain_max_{w}"] = r.mean(), r.sum(), r.max()
        df[f"rain_std_{w}"] = prev.rolling(w, min_periods=2).std()
    for w in [3, 7, 14, 30]:
        r = prev.rolling(w, min_periods=1)
        df[f"rain_days_{w}"] = r.apply(lambda y: np.sum(y > 0.1), raw=True)
        df[f"heavy_days_{w}"] = r.apply(lambda y: np.sum(y >= 20), raw=True)

    dry = (~(rain > 0.1)).astype(int)
    df["dry_streak"] = dry.groupby((dry == 0).cumsum()).cumsum().shift(1)

    for c in WEATHER:
        for lag in [1, 2, 3, 7]:
            df[f"{c}_lag_{lag}"] = df[c].shift(lag)
        p = df[c].shift(1)
        for w in [3, 7]:
            df[f"{c}_mean_{w}"] = p.rolling(w, min_periods=1).mean()

    df["temperature_dewpoint_diff"] = df["temperature_C"] - df["dewpoint_C"]
    df["humidity_temperature"] = df["humidity"] * df["temperature_C"]
    df["humidity_dewpoint"] = df["humidity"] * df["dewpoint_C"]
    return df


def category(mm: float) -> str:
    return "No Rain" if mm < 0.1 else "Light" if mm < 2.5 else "Moderate" if mm < 15.6 else "Heavy" if mm < 64.5 else "Very Heavy"


@app.get("/health")
def health():
    return {"ok": True, "features": len(FEATURES)}


@app.post("/predict")
def predict(req: Request):
    rows = [
        {"date": h.date, "rainfall_mm": h.rain, "temperature_C": h.temp, "dewpoint_C": h.dewPoint, "humidity": h.humidity}
        for h in req.history
    ]
    # Target day: its own rainfall is never used as a feature (all rain features are shifted).
    rows.append({"date": req.date, "rainfall_mm": req.blockRainfall, "temperature_C": req.temperature,
                 "dewpoint_C": req.dewPoint, "humidity": req.humidity})
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = build_features(df.sort_values("date").reset_index(drop=True))

    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        print("WARNING: features not built here, filled with medians:", missing)
    X = df.tail(1).reindex(columns=FEATURES).replace([np.inf, -np.inf], np.nan)
    X = X.fillna({c: MEDIANS.get(c, 0.0) for c in FEATURES}).astype(float)

    probability = float(classifier.predict_proba(X)[0, 1])
    amount = max(0.0, float(np.expm1(regressor.predict(X)[0])))
    rainfall = amount if probability >= THRESHOLD else 0.0
    if rainfall < 0.1:
        rainfall = 0.0
    return {"rainfall": round(rainfall, 2), "rain_probability": round(probability, 4), "category": category(rainfall)}
