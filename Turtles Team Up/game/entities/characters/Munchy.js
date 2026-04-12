// game/entities/characters/Munchy.js
import { Fighter } from '../Fighter.js';
import { GAME } from '../../../config.js';

export class Munchy extends Fighter {
  constructor(scene, x, y, config, playerIndex, voiceSystem) {
    super(scene, x, y, config, playerIndex, voiceSystem);
    this._pizzaTimer = null;
  }

  startPizzaTimer() {
    this._schedulePizzaLine();
  }

  _schedulePizzaLine() {
    const delay = Phaser.Math.Between(GAME.pizzaTimerMin, GAME.pizzaTimerMax);
    this._pizzaTimer = this.scene.time.delayedCall(delay, () => {
      this.voiceSystem.speak(this.config.voiceId, this.config.lines.random);
      const txt = this.scene.add.text(this.x, this.y - 90, "🍕 IT'S PIZZA TIME! 🍕", {
        fontSize: '17px', fontFamily: 'Impact, sans-serif',
        color: '#fb923c', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5);
      this.scene.tweens.add({
        targets: txt, y: txt.y - 50, alpha: 0, duration: 1800,
        onComplete: () => txt.destroy(),
      });
      this._schedulePizzaLine();
    });
  }

  stopPizzaTimer() {
    if (this._pizzaTimer) { this._pizzaTimer.destroy(); this._pizzaTimer = null; }
  }

  // Throw: pizza slice + laugh
  _doThrow(opponent) {
    this._launchProjectile('🍕', opponent, 13, '30px', 460);
    // Laugh bubble
    const laugh = this.scene.add.text(this.x, this.y - 95, '😂 HA HA HA!', {
      fontSize: '16px', fontFamily: 'Impact, sans-serif',
      color: '#fb923c', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: laugh, y: laugh.y - 40, alpha: 0, duration: 1400,
      onComplete: () => laugh.destroy(),
    });
  }

  // Special: big pizza slam + random line
  _doSpecial(opponent) {
    this._launchProjectile('🍕', opponent, this.config.specialDamage, '40px', 520);
    this.voiceSystem.speak(this.config.voiceId, this.config.lines.random);
  }

  destroy() {
    this.stopPizzaTimer();
    super.destroy();
  }
}
