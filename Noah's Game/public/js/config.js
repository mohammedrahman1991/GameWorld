var GAME_CONFIG = {
  WIDTH: 960,
  HEIGHT: 540,

  // Court trapezoid vertices
  COURT: {
    farLeft:   { x: 210, y: 155 },
    farRight:  { x: 750, y: 155 },
    nearRight: { x: 870, y: 415 },
    nearLeft:  { x:  90, y: 415 }
  },

  // Hoop positions (center of rim)
  LEFT_HOOP:  { x: 165, y: 285 },
  RIGHT_HOOP: { x: 795, y: 285 },

  // Zone distances (pixels from hoop center)
  THREE_POINT_DIST: 135,
  DUNK_ZONE_DIST:    55,

  // Player movement speed
  PLAYER_SPEED: 220,

  // Shot meter timing (ms to fill full bar)
  SHOT_METER_FILL_TIME: 1000,

  // Shot clock (ms)
  SHOT_CLOCK_MS: 24000,

  // Win score
  WIN_SCORE: 21,

  // Ball arc height (negative = upward)
  BALL_ARC_HEIGHT: -180,
  BALL_ARC_DURATION: 750
};
