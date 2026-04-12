class Ball {
  constructor(scene, x, y) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.inFlight = false;
    this.owner    = null;
    this.gfx      = scene.add.graphics().setDepth(500);
    this._bounceY   = 0;
    this._bounceDir = 1;
  }

  update(delta) {
    if (this.inFlight || !this.owner) return;

    var dir     = this.owner.facingRight ? 1 : -1;
    var targetX = this.owner.x + dir * 18;
    var targetY = this.owner.y + 10;
    this.x = Phaser.Math.Linear(this.x, targetX, 0.3);
    this.y = Phaser.Math.Linear(this.y, targetY, 0.3);

    if (this.owner.state === 'running') {
      this._bounceY += this._bounceDir * 0.55;
      if (this._bounceY > 10 || this._bounceY < 0) this._bounceDir *= -1;
    } else {
      this._bounceY = Phaser.Math.Linear(this._bounceY, 0, 0.2);
    }
    this.draw();
  }

  draw() {
    this.gfx.clear();
    var by = this.y + this._bounceY;
    var s  = this.owner ? this.owner._perspectiveScale() : 1;

    // Shadow
    var shadowY = this.owner ? this.owner.y + 36 * s : by + 10;
    this.gfx.fillStyle(0x000000, 0.22);
    this.gfx.fillEllipse(this.x, shadowY, 18 * s, 6 * s);

    // Ball
    this.gfx.fillStyle(0xe67e22);
    this.gfx.fillCircle(this.x, by, 10 * s);
    this.gfx.lineStyle(1.5, 0x333333, 0.9);
    this.gfx.strokeCircle(this.x, by, 10 * s);
    this.gfx.beginPath();
    this.gfx.moveTo(this.x - 10 * s, by); this.gfx.lineTo(this.x + 10 * s, by);
    this.gfx.strokePath();
    this.gfx.beginPath();
    this.gfx.moveTo(this.x, by - 10 * s); this.gfx.lineTo(this.x, by + 10 * s);
    this.gfx.strokePath();
  }

  shootTo(hoop, accuracy, isThree, onScore, onMiss) {
    this.inFlight = true;
    this.owner    = null;

    var fromX = this.x, fromY = this.y;
    var makes = Math.random() < accuracy;
    var toX   = hoop.x + (makes ? 0 : (Math.random() - 0.5) * 60);
    var toY   = hoop.y + (makes ? 0 : (Math.random() - 0.5) * 30);
    var arcH  = GAME_CONFIG.BALL_ARC_HEIGHT;
    var self  = this;

    var prog = { t: 0 };
    this.scene.tweens.add({
      targets: prog, t: 1,
      duration: GAME_CONFIG.BALL_ARC_DURATION, ease: 'Linear',
      onUpdate: function() {
        var t  = prog.t;
        self.x = Phaser.Math.Linear(fromX, toX, t);
        self.y = Phaser.Math.Linear(fromY, toY, t) + arcH * Math.sin(Math.PI * t);
        self.draw();
      },
      onComplete: function() {
        self.inFlight = false;
        if (makes) { self._playSwish(); if (onScore) onScore(isThree); }
        else        { if (onMiss)  onMiss(); }
      }
    });
  }

  _playSwish() {
    var flash = this.scene.add.graphics().setDepth(510);
    flash.fillStyle(0xffffff, 0.75);
    flash.fillCircle(this.x, this.y, 16);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 280,
      onComplete: function() { flash.destroy(); }
    });
  }

  reset(x, y, owner) {
    this.inFlight   = false;
    this.x          = x;
    this.y          = y;
    this._bounceY   = 0;
    this._bounceDir = 1;
    this.owner      = owner;
    if (owner) owner.hasBall = true;
  }
}
