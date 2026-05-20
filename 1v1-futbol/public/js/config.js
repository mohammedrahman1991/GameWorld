const CFG = {
  WIDTH:  960,
  HEIGHT: 540,

  // Perspective trapezoid field corners
  FIELD: {
    farLeft:   { x: 185, y: 135 },
    farRight:  { x: 775, y: 135 },
    nearRight: { x: 895, y: 425 },
    nearLeft:  { x: 65,  y: 425 },
  },

  // Goals (logical center points for ball targeting)
  LEFT_GOAL:  { x: 118, y: 278, halfH: 52, postW: 28 },
  RIGHT_GOAL: { x: 842, y: 278, halfH: 52, postW: 28 },

  // Penalty box bounds (for shot zone detection)
  LEFT_BOX:  { x1: 155, y1: 195, x2: 300, y2: 365 },
  RIGHT_BOX: { x1: 660, y1: 195, x2: 805, y2: 365 },

  // Zone distances from goal center (used by ScoreZone)
  CLOSE_DIST: 95,   // inside box → accuracy bonus
  LONG_DIST:  225,  // beyond this → accuracy penalty

  // Physics
  PLAYER_SPEED:         215,
  BALL_ARC_HEIGHT:     -125,
  BALL_ARC_DURATION:    660,   // ms
  SHOT_METER_FILL_TIME: 1050,  // ms to fill meter

  // Match rules
  WIN_GOALS:    5,
  MATCH_TIME_S: 180,   // 3 minutes

  // Tackle / steal
  TACKLE_RANGE:  62,
  TACKLE_CHANCE: 0.44,

  // Perspective y-scale (far=0.68, near=1.0)
  SCALE_FAR:  0.68,
  SCALE_NEAR: 1.0,
  Y_FAR:  135,
  Y_NEAR: 425,
};
