class Player {
  constructor(scene, x, y, controls, stats, team) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.controls = controls;
    this.stats    = stats;  // { pace, shooting, dribbling, tackle }
    this.team     = team;   // 'messai' | 'ronalda'

    this.vx       = 0;
    this.vy       = 0;
    this.hasBall  = false;
    this.facingR  = (team === 'messai');
    this.state    = 'idle';  // idle | running | kicking | celebrating | stunned
    this.stateT   = 0;

    // Kick state
    this.isCharging  = false;
    this.kickReleased = false;

    // Dribble burst cooldown
    this.burstCD = 0;
    this.bursting = false;
    this.burstT   = 0;

    // Stun (after failed tackle)
    this.stunT = 0;

    this._gfx = scene.add.graphics();
    this._shadow = scene.add.graphics();
  }

  // ── perspective scale based on y ──────────────────────────────
  get scale() {
    const t = (this.y - CFG.Y_FAR) / (CFG.Y_NEAR - CFG.Y_FAR);
    return CFG.SCALE_FAR + t * (CFG.SCALE_NEAR - CFG.SCALE_FAR);
  }

  update(delta) {
    if (this.stunT > 0) {
      this.stunT -= delta;
      this._draw();
      return;
    }

    const keys   = this.controls;
    const speed  = (CFG.PLAYER_SPEED + (this.stats.pace / 99) * 30)
                 * (this.bursting ? 1.55 : 1.0)
                 * this.scale;
    const dt     = delta / 1000;

    let moved = false;

    if (keys.left.isDown)  { this.x -= speed * dt; this.facingR = false; moved = true; }
    if (keys.right.isDown) { this.x += speed * dt; this.facingR = true;  moved = true; }
    if (keys.up.isDown)    { this.y -= speed * dt * 0.65; moved = true; }
    if (keys.down.isDown)  { this.y += speed * dt * 0.65; moved = true; }

    this.state = moved ? 'running' : 'idle';

    // Bounds
    this.x = Phaser.Math.Clamp(this.x, 145, 815);
    this.y = Phaser.Math.Clamp(this.y, 165, 405);

    // Burst timer
    if (this.bursting) {
      this.burstT -= delta;
      if (this.burstT <= 0) this.bursting = false;
    }
    if (this.burstCD > 0) this.burstCD -= delta;

    this._draw();
  }

  startBurst() {
    if (this.burstCD > 0) return;
    this.bursting = true;
    this.burstT   = 380;
    this.burstCD  = 1800;
  }

  stun(ms) {
    this.stunT = ms;
  }

  celebrate() {
    this.state = 'celebrating';
    this.scene.tweens.add({
      targets:  this,
      y:        this.y - 22,
      duration: 180,
      yoyo:     true,
      repeat:   3,
    });
  }

  // ── drawing ───────────────────────────────────────────────────
  _draw() {
    this._gfx.clear();
    this._shadow.clear();
    const sc  = this.scale;
    const px  = this.x;
    const py  = this.y;

    // Depth so far players render behind near players
    this._shadow.setDepth(this.y - 1);
    this._gfx.setDepth(this.y);

    // Ground shadow
    this._shadow.fillStyle(0x000000, 0.18);
    this._shadow.fillEllipse(px, py + 2 * sc, 28 * sc, 8 * sc);

    this._drawBody(px, py, sc);
  }

  // Override in subclass
  _drawBody(x, y, sc) {}

  destroy() {
    this._gfx.destroy();
    this._shadow.destroy();
  }
}
