const { isThreePointer, isDunkZone } = require('../public/js/systems/ScoreZone.js');

const LEFT_HOOP  = { x: 165, y: 285 };
const RIGHT_HOOP = { x: 795, y: 285 };

describe('isThreePointer', () => {
  test('returns false when player is inside left arc', () => {
    expect(isThreePointer(220, 285, LEFT_HOOP)).toBe(false);
  });
  test('returns true when player is outside left arc', () => {
    expect(isThreePointer(400, 285, LEFT_HOOP)).toBe(true);
  });
  test('returns false when player is inside right arc', () => {
    expect(isThreePointer(730, 285, RIGHT_HOOP)).toBe(false);
  });
  test('returns true when player is outside right arc', () => {
    expect(isThreePointer(600, 285, RIGHT_HOOP)).toBe(true);
  });
});

describe('isDunkZone', () => {
  test('returns true when player is very close to hoop', () => {
    expect(isDunkZone(175, 285, LEFT_HOOP)).toBe(true);
  });
  test('returns false when player is far from hoop', () => {
    expect(isDunkZone(400, 285, LEFT_HOOP)).toBe(false);
  });
});
