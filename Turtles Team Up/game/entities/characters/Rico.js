// game/entities/characters/Rico.js
import { Fighter } from '../Fighter.js';

export class Rico extends Fighter {
  // Throw: spinning sword
  _doThrow(opponent) {
    this._launchProjectile('⚔️', opponent, 14, '28px', 520);
  }

  // Special: Shadow Slash — dash forward + 3-hit blade combo
  _doSpecial(opponent) {
    const dashX = this.facingRight
      ? Math.min(this.x + 200, 860)
      : Math.max(this.x - 200, 40);

    this.scene.tweens.add({
      targets: this.sprite,
      x: dashX,
      duration: 140,
      ease: 'Power2',
      onComplete: () => {
        [0, 110, 220].forEach(delay => {
          this.scene.time.delayedCall(delay, () => {
            if (this._inRange(opponent)) opponent.takeDamage(8, this.playerIndex, false);
          });
        });
      },
    });
  }
}
