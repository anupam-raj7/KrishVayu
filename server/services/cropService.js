// Simple rule-based logic: crops that suit the month, ranked by how well their
// water need matches the rain expected in the next 7 days.
const CROPS = [
  { key: 'rice', months: [6, 7, 8], water: 'high' },
  { key: 'ragi', months: [6, 7, 8], water: 'low' },
  { key: 'maize', months: [6, 7, 9, 10, 11], water: 'medium' },
  { key: 'arhar', months: [6, 7, 8], water: 'low' },
  { key: 'ginger', months: [4, 5, 6], water: 'medium' },
  { key: 'mustard', months: [10, 11, 12], water: 'low' },
  { key: 'potato', months: [10, 11, 12], water: 'medium' },
  { key: 'vegetables', months: [1, 2, 3, 4, 5, 9, 10, 11, 12], water: 'medium' },
  { key: 'groundnut', months: [1, 2, 3, 6, 7], water: 'medium' }
];

exports.recommend = (month, upcoming) => {
  const weeklyRain = Math.round(upcoming.reduce((s, d) => s + (d.rain || 0), 0) * 10) / 10;
  const level = weeklyRain < 10 ? 'low' : weeklyRain < 50 ? 'medium' : 'high';
  const list = CROPS.filter(c => c.months.includes(month))
    .sort((a, b) => (b.water === level) - (a.water === level))
    .slice(0, 4)
    .map(({ key, water }) => ({ key, water }));
  return { weeklyRain, list };
};

// Thresholds follow the rainfall categories used by the model (mm/day).
exports.advice = next3 => {
  const maxRain = Math.max(...next3.map(d => d.rain || 0));
  if (maxRain >= 64.5) return 'very_heavy';
  if (maxRain >= 15.6) return 'heavy';
  if (next3.every(d => (d.rain || 0) < 1 && d.tmax >= 35)) return 'dry';
  return 'ok';
};
