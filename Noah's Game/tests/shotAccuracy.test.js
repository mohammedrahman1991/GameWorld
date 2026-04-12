const { calcAccuracy } = require('../public/js/systems/ShotAccuracy.js');

describe('calcAccuracy', () => {
  test('perfect green release with high stat returns high accuracy', () => {
    const acc = calcAccuracy(99, 'three', 1.0);
    expect(acc).toBeGreaterThan(0.9);
  });
  test('red release returns low accuracy regardless of stat', () => {
    const acc = calcAccuracy(99, 'three', 0.0);
    expect(acc).toBeLessThan(0.4);
  });
  test('curry three stat gives wider green (higher base)', () => {
    const curry = calcAccuracy(99, 'three', 0.8);
    const ant   = calcAccuracy(82, 'three', 0.8);
    expect(curry).toBeGreaterThan(ant);
  });
});
