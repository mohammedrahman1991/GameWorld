// game/systems/CombatSystem.js

const BLOCK_MULTIPLIER = 0.3;
const SPECIAL_METER_PER_DAMAGE = 1; // 1% meter per 1 damage dealt/received
const KNOCKBACK_AMOUNT = 60;

/**
 * Calculate damage after blocking.
 * @param {number} baseDamage
 * @param {boolean} isBlocking
 * @returns {number}
 */
export function calcDamage(baseDamage, isBlocking) {
  if (isBlocking) return Math.floor(baseDamage * BLOCK_MULTIPLIER);
  return baseDamage;
}

/**
 * Update special meter — gains 1% per point of damage dealt or received.
 * @param {number} current  0-100
 * @param {number} damageDealt
 * @param {number} damageReceived
 * @returns {number} new meter value, clamped 0-100
 */
export function updateSpecialMeter(current, damageDealt, damageReceived) {
  const gain = (damageDealt + damageReceived) * SPECIAL_METER_PER_DAMAGE;
  return Math.min(100, Math.max(0, current + gain));
}

/**
 * Check if a round has ended.
 * @param {number} p1Hp   0-100
 * @param {number} p2Hp   0-100
 * @param {number} timeLeft  seconds remaining
 * @returns {0|1|null}  winner index (0=p1, 1=p2) or null if still going
 */
export function checkRoundEnd(p1Hp, p2Hp, timeLeft) {
  if (p2Hp <= 0) return 0;
  if (p1Hp <= 0) return 1;
  if (timeLeft <= 0) {
    if (p1Hp > p2Hp) return 0;
    if (p2Hp > p1Hp) return 1;
    return null; // draw — continue (sudden death)
  }
  return null;
}

/**
 * Get knockback velocity for the defender.
 * @param {number} attackerIndex  0=p1, 1=p2
 * @returns {{ dx: number }}  velocity to add to defender
 */
export function applyKnockback(attackerIndex) {
  return { dx: attackerIndex === 0 ? KNOCKBACK_AMOUNT : -KNOCKBACK_AMOUNT };
}
