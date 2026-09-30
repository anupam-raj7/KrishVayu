const data = require('../data/koraput.json');
const blocks = data.blocks.map(b => ({ ...b, villages: b.villages.split(',') }));

exports.district = () => data.district;
exports.blocks = () => blocks.map(b => b.name);
exports.villages = blockName => (blocks.find(b => b.name === blockName) || { villages: [] }).villages;

// Returns coordinates for a valid block+village, else null.
// The dataset has no village coordinates yet, so the block centre is used.
exports.find = (blockName, village) => {
  const b = blocks.find(x => x.name === blockName);
  return b && b.villages.includes(village) ? { lat: b.lat, lon: b.lon } : null;
};
