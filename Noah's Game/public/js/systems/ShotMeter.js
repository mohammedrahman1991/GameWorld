class ShotMeter {
  constructor(scene) {
    this.scene    = scene;
    this.active   = false;
    this.progress = 0;
    this._x       = 0;
    this._y       = 0;

    this.bg  = scene.add.graphics().setDepth(900);
    this.bar = scene.add.graphics().setDepth(901);
    this.bg.setVisible(false);
    this.bar.setVisible(false);
  }

  start(x, y) {
    this.active   = true;
    this.progress = 0;
    this._x = x - 22;
    this._y = y - 70;
    this.bg.setVisible(true);
    this.bar.setVisible(true);
  }

  update(delta) {
    if (!this.active) return;
    this.progress = Math.min(1, this.progress + delta / GAME_CONFIG.SHOT_METER_FILL_TIME);
    this._draw();
  }

  release() {
    this.active = false;
    var score   = this.progress;
    this.bg.setVisible(false);
    this.bar.setVisible(false);
    this.progress = 0;
    return score;
  }

  hide() {
    this.active   = false;
    this.progress = 0;
    this.bg.setVisible(false);
    this.bar.setVisible(false);
  }

  moveTo(x, y) {
    this._x = x - 22;
    this._y = y - 70;
    if (this.active) this._draw();
  }

  _draw() {
    var x = this._x, y = this._y, W = 10, H = 52;
    var filled = this.progress * H;

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.72);
    this.bg.fillRect(x, y, W, H);
    this.bg.lineStyle(1, 0x555555);
    this.bg.strokeRect(x, y, W, H);

    this.bar.clear();
    var p = this.progress;
    var red   = Math.max(0, 255 - Math.round(p * 510));
    var green = Math.min(255, Math.round(p * 510));
    this.bar.fillStyle(Phaser.Display.Color.GetColor(red, green, 0));
    this.bar.fillRect(x + 1, y + H - filled + 1, W - 2, filled - 1);

    // Green zone marker line at 70%
    this.bar.lineStyle(1.5, 0x00ff00, 0.9);
    this.bar.beginPath();
    this.bar.moveTo(x - 2, y + H * 0.3);
    this.bar.lineTo(x + W + 2, y + H * 0.3);
    this.bar.strokePath();
  }
}
