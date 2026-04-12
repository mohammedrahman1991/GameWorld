var ScoreZone = {
  isThreePointer: function(px, py, hoop) {
    var dx = px - hoop.x;
    var dy = py - hoop.y;
    return Math.sqrt(dx * dx + dy * dy) > 135;
  },
  isDunkZone: function(px, py, hoop) {
    var dx = px - hoop.x;
    var dy = py - hoop.y;
    return Math.sqrt(dx * dx + dy * dy) < 55;
  }
};

if (typeof module !== 'undefined') {
  module.exports = ScoreZone;
}
