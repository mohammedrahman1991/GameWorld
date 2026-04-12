var ShotAccuracy = {
  // meterScore: 0.0 (red) to 1.0 (perfect green)
  // stat: 0-99 player rating for this shot type
  // Returns: 0.0 to 1.0 probability of making the shot
  calcAccuracy: function(stat, zone, meterScore) {
    var baseChance = stat / 99;         // 0.0 – 1.0 from stat
    var meterBonus = meterScore * 0.56;  // up to +0.56 for perfect timing
    var zonePenalty = (zone === 'three') ? 0.15 : 0; // slight penalty for 3s
    var raw = baseChance * 0.5 + meterBonus - zonePenalty;
    return Math.max(0, Math.min(1, raw));
  }
};

if (typeof module !== 'undefined') {
  module.exports = ShotAccuracy;
}
