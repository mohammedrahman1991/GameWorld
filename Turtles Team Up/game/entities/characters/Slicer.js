// game/entities/characters/Slicer.js
import { Fighter } from '../Fighter.js';

export class Slicer extends Fighter {
  // Draw a dark blade villain
  _buildCharacterVisual() {
    const color = this.config.color;
    const g = this.scene.add.graphics();

    // Flowing dark cape
    g.fillStyle(0x1a0000);
    g.fillTriangle(-26, 46, 26, 46, -36, -14);
    g.fillTriangle(26, 46, -26, 46, 36, -14);

    // Body — slender
    g.fillStyle(color);
    g.fillRoundedRect(-20, -10, 40, 56, 8);

    // Armor plate
    g.fillStyle(0x7f1d1d);
    g.fillRect(-16, -8, 32, 24);
    g.lineStyle(1, 0xff0000, 0.9);
    g.strokeRect(-16, -8, 32, 24);

    // Belt
    g.fillStyle(0x111111);
    g.fillRect(-20, 28, 40, 7);
    g.fillStyle(0xff0000);
    g.fillRoundedRect(-5, 26, 10, 11, 2);

    // Head — angular with ninja hood
    g.fillStyle(0x3d0000);
    g.fillCircle(0, -34, 21);

    // Lower mask
    g.fillStyle(0x1a0000);
    g.fillEllipse(0, -28, 36, 18);

    // Evil red glowing eyes
    g.fillStyle(0xff0000, 0.85);
    g.fillEllipse(-8, -38, 15, 9);
    g.fillEllipse(8, -38, 15, 9);
    g.fillStyle(0xffffff);
    g.fillCircle(-8, -38, 3);
    g.fillCircle(8, -38, 3);
    g.fillStyle(0xff2222);
    g.fillCircle(-8, -38, 2);
    g.fillCircle(8, -38, 2);

    // Horns
    g.fillStyle(0x7f1d1d);
    g.fillTriangle(-16, -50, -9, -50, -12, -67);
    g.fillTriangle(9, -50, 16, -50, 12, -67);

    // Scar line
    g.lineStyle(2, 0xff6666, 0.9);
    g.lineBetween(5, -42, 13, -27);

    // Arms
    g.fillStyle(0x7f1d1d);
    g.fillCircle(-24, 4, 8);
    g.fillCircle(24, 4, 8);

    // Blade on right arm
    g.fillStyle(0xd1d5db);
    g.fillTriangle(28, -4, 30, 14, 46, 2);
    g.fillStyle(0x9ca3af);
    g.fillRect(26, 6, 6, 3);

    // Feet
    g.fillStyle(0x450a0a);
    g.fillEllipse(-10, 46, 22, 10);
    g.fillEllipse(10, 46, 22, 10);

    this.container.add(g);
    this._graphics = g;

    this._brow = this.scene.add.graphics();
    this.container.add(this._brow);
    this._drawBrow('idle');
  }

  // Throw: triple shurikans in quick succession
  _doThrow(opponent) {
    [0, 120, 240].forEach(delay => {
      this.scene.time.delayedCall(delay, () => {
        this._launchProjectile('✴️', opponent, this.config.lightDamage * 1.4, '20px', 640);
      });
    });
    const taunt = this.scene.add.text(this.x, this.y - 90, 'PATHETIC!', {
      fontSize: '14px', fontFamily: 'Impact, sans-serif',
      color: '#fca5a5', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: taunt, y: taunt.y - 40, alpha: 0, duration: 1000,
      onComplete: () => taunt.destroy(),
    });
  }

  // Special: Shurikan Storm — 6 shurikans spiral outward
  _doSpecial(opponent) {
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 70, () => {
        const angle = (i / 6) * Math.PI * 2;
        const sh = this.scene.add.text(
          this.x + Math.cos(angle) * 28,
          this.y - 30 + Math.sin(angle) * 18,
          '✴️', { fontSize: '22px' }
        ).setOrigin(0.5);
        this.scene.physics.add.existing(sh);
        const tx = opponent.x - sh.x;
        const ty = (opponent.y - 30) - sh.y;
        const len = Math.sqrt(tx * tx + ty * ty) || 1;
        sh.body.setVelocity((tx / len) * 560, (ty / len) * 560);
        sh.body.setAllowGravity(false);
        this.scene.tweens.add({ targets: sh, angle: 720, duration: 600 });
        this.scene.time.delayedCall(750, () => { if (sh.active) sh.destroy(); });
      });
    }
    if (this._inRange(opponent)) {
      this.scene.time.delayedCall(280, () => {
        opponent.takeDamage(this.config.specialDamage, this.playerIndex, false);
        opponent.stun(900);
      });
    }
  }
}
