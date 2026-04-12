class ScorestreakSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentStreak = 0;
    this.bombsAvailable = 0;
    this.bombSelectMode = false;
    this._bombPointerHandler = null;
  }

  onKill() {
    this.currentStreak++;
    if (this.currentStreak >= 5) {
      this.currentStreak = 0;
      this.bombsAvailable++;
      this.scene.uiSystem.showKillFeed('\uD83D\uDD25 5 KILL STREAK! PLANE BOMB READY!');
      this.scene.uiSystem.showBombMode(true);
      this.enterBombSelectMode();
    }
  }

  onDeath() {
    this.currentStreak = 0;
    this.cancelBombMode();
  }

  enterBombSelectMode() {
    this.bombSelectMode = true;
    this._bombPointerHandler = (pointer) => {
      if (!this.bombSelectMode) return;
      const wx = this.scene.cameras.main.scrollX + pointer.x;
      const wy = this.scene.cameras.main.scrollY + pointer.y;
      this.dropBomb(wx, wy);
    };
    this.scene.input.once('pointerup', this._bombPointerHandler);
  }

  cancelBombMode() {
    this.bombSelectMode = false;
    this.scene.uiSystem.showBombMode(false);
    if (this._bombPointerHandler) {
      this.scene.input.off('pointerup', this._bombPointerHandler);
      this._bombPointerHandler = null;
    }
  }

  dropBomb(wx, wy) {
    this.bombSelectMode = false;
    this.bombsAvailable = Math.max(0, this.bombsAvailable - 1);
    this.scene.uiSystem.showBombMode(false);

    // Targeting reticle
    const reticle = this.scene.add.graphics().setDepth(50);
    reticle.lineStyle(3, 0xff4444, 1);
    reticle.strokeCircle(wx, wy, 80);
    reticle.lineStyle(2, 0xff4444, 0.5);
    reticle.lineBetween(wx - 110, wy, wx + 110, wy);
    reticle.lineBetween(wx, wy - 110, wx, wy + 110);

    // Blink reticle
    this.scene.tweens.add({
      targets: reticle,
      alpha: 0.3,
      yoyo: true,
      repeat: 5,
      duration: 260
    });

    // Plane sprite (drawn with graphics)
    const plane = this.scene.add.graphics().setDepth(50);
    plane.fillStyle(0xaaaacc, 1);
    plane.fillTriangle(-18, 0, 18, 0, 0, -14);
    plane.fillStyle(0x888888, 1);
    plane.fillRect(-3, 0, 6, 10);
    plane.x = -80;
    plane.y = wy - 100;

    this.scene.tweens.add({
      targets: plane,
      x: this.scene.MAP_W + 120,
      duration: 2000,
      ease: 'Linear',
      onComplete: () => {
        plane.destroy();
        reticle.destroy();
        this.explodeBomb(wx, wy);
      }
    });

    this.scene.uiSystem.showKillFeed('\u2708 PLANE INBOUND...');
  }

  explodeBomb(cx, cy) {
    const RADIUS = 180;

    // Multi-stage explosion
    [0, 120, 250].forEach((delay, i) => {
      this.scene.time.delayedCall(delay, () => {
        const ox = cx + Phaser.Math.Between(-40, 40);
        const oy = cy + Phaser.Math.Between(-40, 40);
        const expl = this.scene.add.sprite(ox, oy, 'explosion').setDepth(52);
        expl.setScale(0.3 + i * 0.2);
        this.scene.tweens.add({
          targets: expl,
          scaleX: (2 + i) * 1.5,
          scaleY: (2 + i) * 1.5,
          alpha: 0,
          duration: 700 + delay,
          onComplete: () => expl.destroy()
        });
      });
    });

    this.scene.cameras.main.shake(600, 0.04);

    // Damage bots
    this.scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const d = Phaser.Math.Distance.Between(cx, cy, bot.x, bot.y);
      if (d < RADIUS) {
        const dmg = 220 * (1 - d / RADIUS);
        bot.takeDamage(dmg);
      }
    });

    // Damage player if caught in blast
    const dp = Phaser.Math.Distance.Between(cx, cy, this.scene.player.x, this.scene.player.y);
    if (dp < RADIUS) {
      this.scene.takeDamage(50 * (1 - dp / RADIUS));
    }

    this.scene.uiSystem.showKillFeed('\uD83D\uDCA5 BOMB HIT!');
    this.scene.fetchCommentary(this.scene.kills, 'plane bomb');
  }

  update(time, delta) {}
}
