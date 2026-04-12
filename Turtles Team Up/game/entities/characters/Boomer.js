// game/entities/characters/Boomer.js
import { Fighter } from '../Fighter.js';

export class Boomer extends Fighter {
  // Draw a kangaroo instead of raccoon
  _buildCharacterVisual() {
    const color = this.config.color;
    const g = this.scene.add.graphics();

    // Big thick tail
    g.fillStyle(0x5a8a3c);
    g.fillEllipse(-32, 22, 24, 72);

    // Body — stocky
    g.fillStyle(color);
    g.fillRoundedRect(-24, -8, 48, 58, 10);

    // Chest fluff
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(0, 10, 26, 32);

    // Pouch
    g.fillStyle(0x16a34a, 0.7);
    g.fillEllipse(6, 24, 30, 22);

    // Belt
    g.fillStyle(0x111111);
    g.fillRect(-24, 30, 48, 7);
    g.fillStyle(0xffd700);
    g.fillRoundedRect(-7, 28, 14, 11, 3);

    // Head — elongated kangaroo snout
    g.fillStyle(0x4ade80);
    g.fillCircle(0, -36, 22);
    // Snout extension
    g.fillStyle(0x22c55e);
    g.fillEllipse(10, -28, 26, 16);

    // Big tall ears
    g.fillStyle(0x4ade80);
    g.fillEllipse(-14, -60, 13, 32);
    g.fillEllipse(14, -60, 13, 32);
    g.fillStyle(0xff9aaa, 0.7);
    g.fillEllipse(-14, -60, 7, 22);
    g.fillEllipse(14, -60, 7, 22);

    // Eyes — wide & goofy
    g.fillStyle(0xffffff);
    g.fillCircle(-8, -38, 8);
    g.fillCircle(8, -38, 8);
    g.fillStyle(0x111111);
    g.fillCircle(-7, -38, 4);
    g.fillCircle(9, -38, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(-5, -40, 2);
    g.fillCircle(11, -40, 2);

    // Nose
    g.fillStyle(0x333333);
    g.fillEllipse(12, -24, 9, 6);

    // Big grin
    g.fillStyle(0x333333);
    g.fillEllipse(6, -18, 18, 10);
    g.fillStyle(0xffffff);
    g.fillRect(-1, -22, 5, 6);
    g.fillRect(5, -22, 5, 6);

    // Arms — short & punchy
    g.fillStyle(0x4ade80);
    g.fillCircle(-28, 2, 9);
    g.fillCircle(28, 2, 9);
    g.fillStyle(0x22c55e);
    [-32, -28, -24].forEach(cx => g.fillRect(cx, 8, 3, 5));
    [24, 28, 32].forEach(cx => g.fillRect(cx, 8, 3, 5));

    // Big kangaroo feet
    g.fillStyle(0x4ade80);
    g.fillEllipse(-12, 50, 30, 12);
    g.fillEllipse(14, 50, 30, 12);

    this.container.add(g);
    this._graphics = g;

    this._brow = this.scene.add.graphics();
    this.container.add(this._brow);
    this._drawBrow('idle');
  }

  // Throw: flying kick projectile
  _doThrow(opponent) {
    this._launchProjectile('🦵', opponent, this.config.lightDamage * 2, '30px', 560);
    const shout = this.scene.add.text(this.x, this.y - 90, "CRIKEY! KICK!", {
      fontSize: '14px', fontFamily: 'Impact, sans-serif',
      color: '#4ade80', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: shout, y: shout.y - 40, alpha: 0, duration: 1200,
      onComplete: () => shout.destroy(),
    });
  }

  // Special: Mega Kick — massive hit + big knockback + stun
  _doSpecial(opponent) {
    const dir = this.facingRight ? 1 : -1;

    // Wind-up whoosh
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        const puff = this.scene.add.text(
          this.x + dir * (20 + i * 18),
          this.y - 20 + Phaser.Math.Between(-15, 15),
          '💨', { fontSize: '20px' }
        );
        this.scene.tweens.add({
          targets: puff, x: puff.x + dir * 50, alpha: 0, duration: 280,
          onComplete: () => puff.destroy(),
        });
      });
    }

    if (this._inRange(opponent)) {
      opponent.takeDamage(this.config.specialDamage, this.playerIndex, false);
      opponent.stun(1500);
      opponent.sprite.body.setVelocityX(dir * 900);
    }

    const boom = this.scene.add.text(this.x + dir * 55, this.y - 25, '🦵💥', {
      fontSize: '52px',
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: boom, scale: 2.2, alpha: 0, duration: 600,
      onComplete: () => boom.destroy(),
    });
  }
}
