// Block-level rainfall (mm) comes from the weather API at the block centre.
exports.blockRainfall = (days, date) => (days.find(d => d.date === date) || {}).rain ?? 0;
exports.recentTotals = (days, from, to) => days.slice(from, to).reduce((s, d) => s + (d.rain || 0), 0);
