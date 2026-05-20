class Ball {
  constructor(scene, x, y) {
    this.scene   = scene;
    this.x       = x;
    this.y       = y;
    this.owner   = null;    // reference to Player who has it
    this.inFlight = false;
    this._bobT   = 0;

    this._shadow = scene.add.graphics().setDepth(199);
    this._gfx    = scene.add.graphics().setDepth(500);
  }

  attachTo(player) {
    this.owner   = player;
    this.inFlight = false;
  }

  detach() {
    this.owner = null;
  }

  // Kick toward goal. Returns a Promise that resolves with { scored, x, y }
  kickToward(goal, accuracy, arcH) {
    this.inFlight = true;
    const roll    = Math.random();
    const scored  = roll < accuracy;

    let targetX, targetY;
    if (scored) {
      // Aim at goal center with tiny random offset
      targetX = goal.x + (Math.random() - 0.5) * 30;
      targetY = goal.y + (Math.random() - 0.5) * goal.halfH * 0.8;
    } else {
      // Miss — random direction
      const side = Math.random() < 0.5 ? -1 : 1;
      targetX = goal.x + side * (60 + Math.random() * 80);
      targetY = goal.y + (Math.random() - 0.5) * 100;
    }

    const startX = this.x;
    const startY = this.y;
    const height = arcH || CFG.BALL_ARC_HEIGHT;

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets:  { t: 0 },
        t:        1,
        duration: CFG.BALL_ARC_DURATION,
        ease:     'Linear',
        onUpdate: (tween, target) => {
          const t = target.t;
          this.x = startX + (targetX - startX) * t;
          this.y = startY + (targetY - startY) * t + height * Math.sin(Math.PI * t);
          this._draw();
        },
        onComplete: () => {
          this.x       = targetX;
          this.y       = targetY;
          this.inFlight = false;
          this._draw();
          resolve({ scored, x: targetX, y: targetY });
        },
      });
    });
  }

  update(delta) {
    if (this.inFlight) return;
    if (this.owner) {
      // Follow owner's feet with slight dribble bounce
      this._bobT += delta * 0.012;
      const targetX = this.owner.x + (this.owner.facingR ? 14 : -14) * this.owner.scale;
      const targetY = this.owner.y + 24 * this.owner.scale + Math.abs(Math.sin(this._bobT)) * 5;
      this.x = Phaser.Math.Linear(this.x, targetX, 0.28);
      this.y = Phaser.Math.Linear(this.y, targetY, 0.28);
    }
    this._draw();
  }

  _draw() {
    const g  = this._gfx;
    const sh = this._shadow;
    const r  = 8;
    g.setDepth(this.y + 1);
    sh.setDepth(this.y);

    g.clear(); sh.clear();

    // Shadow
    sh.fillStyle(0x000000, 0.22);
    sh.fillEllipse(this.x + 1, this.y + r + 2, r * 2.8, r * 0.9);

    // White ball
    g.fillStyle(0xffffff, 1);
    g.fillCircle(this.x, this.y, r);

    // Black pentagon patches (simplified arcs)
    g.lineStyle(1.5, 0x111111, 1);
    g.strokeCircle(this.x, this.y, r);

    // Pentagon-like patches
    g.fillStyle(0x111111, 1);
    g.fillCircle(this.x, this.y, r * 0.32);

    // 5 outer patch hints
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = this.x + Math.cos(a) * r * 0.6;
      const py = this.y + Math.sin(a) * r * 0.6;
      g.fillStyle(0x222222, 0.7);
      g.fillCircle(px, py, r * 0.22);
    }

    // Shine
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(this.x - r * 0.32, this.y - r * 0.36, r * 0.28);
  }

  resetTo(x, y) {
    this.x = x; this.y = y;
    this.inFlight = false;
    this.owner    = null;
    this._draw();
  }

  destroy() {
    this._gfx.destroy();
    this._shadow.destroy();
  }
}
