// game/entities/characters/Dex.js
import { Fighter } from '../Fighter.js';

export class Dex extends Fighter {
  // Throw: spinning calculator
  _doThrow(opponent) {
    this._launchProjectile('🧮', opponent, 12, '26px', 500);
    // Nerd quip
    const quips = ['CALCULATING…', 'PROJECTILE LAUNCHED', 'MATH HURTS'];
    const q = this.scene.add.text(this.x, this.y - 90,
      quips[Math.floor(Math.random() * quips.length)], {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#a855f7', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: q, y: q.y - 40, alpha: 0, duration: 1200,
      onComplete: () => q.destroy(),
    });
  }

  // Special: Static Shock — ground slam + stun
  _doSpecial(opponent) {
    const slam = this.scene.add.rectangle(this.x, this.y + 30, 120, 8, 0xa855f7);
    this.scene.tweens.add({
      targets: slam, scaleX: 3, alpha: 0, duration: 400,
      onComplete: () => slam.destroy(),
    });
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.text(
        this.x + Phaser.Math.Between(-60, 60),
        this.y + Phaser.Math.Between(-20, 20),
        '⚡', { fontSize: '16px' }
      );
      this.scene.tweens.add({
        targets: spark, y: spark.y - 30, alpha: 0, duration: 300, delay: i * 40,
        onComplete: () => spark.destroy(),
      });
    }
    if (this._inRange(opponent)) {
      opponent.takeDamage(this.config.specialDamage, this.playerIndex, false);
      opponent.stun(1200);
    }
  }
}
