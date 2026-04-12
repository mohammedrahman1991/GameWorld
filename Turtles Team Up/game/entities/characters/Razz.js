// game/entities/characters/Razz.js
import { Fighter } from '../Fighter.js';

export class Razz extends Fighter {
  // Throw: rapid dagger burst (3 quick daggers)
  _doThrow(opponent) {
    [0, 120, 240].forEach(delay => {
      this.scene.time.delayedCall(delay, () => {
        this._launchProjectile('🗡️', opponent, 6, '20px', 600);
      });
    });
  }

  // Special: Rage Rush — 5 rapid lunging jabs
  _doSpecial(opponent) {
    let hits = 0;
    const interval = this.scene.time.addEvent({
      delay: 75,
      repeat: 4,
      callback: () => {
        hits++;
        if (this._inRange(opponent)) opponent.takeDamage(4, this.playerIndex, false);
        const dir = this.facingRight ? 1 : -1;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x + dir * 14, 40, 860);
        if (hits === 5) interval.destroy();
      },
    });
  }
}
