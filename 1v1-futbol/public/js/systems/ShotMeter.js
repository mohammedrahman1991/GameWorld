class ShotMeter {
  constructor(scene) {
    this.scene   = scene;
    this.active  = false;
    this.progress = 0;  // 0..1
    this._owner  = null;

    this._bg  = scene.add.graphics().setDepth(900);
    this._bar = scene.add.graphics().setDepth(901);
    this._perfect = scene.add.graphics().setDepth(902);
    this._hide();
  }

  start(owner) {
    this._owner   = owner;
    this.active   = true;
    this.progress = 0;
  }

  update(delta) {
    if (!this.active || !this._owner) return;
    this.progress = Math.min(1, this.progress + delta / CFG.SHOT_METER_FILL_TIME);
    this._draw();
  }

  release() {
    const score = this.progress;
    this.active  = false;
    this.progress = 0;
    this._owner  = null;
    this._hide();
    return score;
  }

  _draw() {
    if (!this._owner) return;
    const x = this._owner.x + 22;
    const y = this._owner.y - 55;
    const w = 10, h = 48;
    const fill = h * this.progress;
    const pct  = this.progress;
    const r = pct < 0.5 ? 255 : Math.round(255 * (1 - pct) * 2);
    const g = pct > 0.5 ? 255 : Math.round(255 * pct * 2);

    this._bg.clear();
    this._bg.fillStyle(0x111111, 0.85);
    this._bg.fillRect(x, y - h, w, h + 4);

    this._bar.clear();
    this._bar.fillStyle(Phaser.Display.Color.GetColor(r, g, 30), 1);
    this._bar.fillRect(x + 1, y - fill + 2, w - 2, fill);

    // Perfect zone marker (green line at 70%)
    this._perfect.clear();
    this._perfect.lineStyle(2, 0x00ff44, 1);
    this._perfect.beginPath();
    this._perfect.moveTo(x - 2, y - h * 0.70);
    this._perfect.lineTo(x + w + 2, y - h * 0.70);
    this._perfect.strokePath();
  }

  _hide() {
    this._bg.clear();
    this._bar.clear();
    this._perfect.clear();
  }

  destroy() {
    this._bg.destroy();
    this._bar.destroy();
    this._perfect.destroy();
  }
}
