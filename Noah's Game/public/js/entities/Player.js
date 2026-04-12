class Player {
  constructor(scene, x, y, controls, stats, team) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.controls = controls;
    this.stats    = stats;
    this.team     = team;

    this.hasBall     = false;
    this.state       = 'idle';
    this.facingRight = (team === 'curry');
    this.isShooting  = false;

    this.gfx = scene.add.graphics();
    this.label = scene.add.text(x, y - 52, '', {
      fontSize: '10px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    this._buildKeys();
  }

  _buildKeys() {
    this.keys = this.scene.input.keyboard.addKeys({
      up:       this.controls.up,
      down:     this.controls.down,
      left:     this.controls.left,
      right:    this.controls.right,
      shoot:    this.controls.shoot,
      dribble:  this.controls.dribble,
      pass:     this.controls.pass,
      pumpfake: this.controls.pumpfake
    });
  }

  update(delta) {
    if (this.isShooting) return;
    this._handleMovement(delta);
  }

  _handleMovement(delta) {
    var speed = GAME_CONFIG.PLAYER_SPEED * (delta / 1000);
    var moved = false;

    if (this.keys.left.isDown)  { this.x -= speed; this.facingRight = false; moved = true; }
    if (this.keys.right.isDown) { this.x += speed; this.facingRight = true;  moved = true; }
    if (this.keys.up.isDown)    { this.y -= speed * 0.6; moved = true; }
    if (this.keys.down.isDown)  { this.y += speed * 0.6; moved = true; }

    this.x = Phaser.Math.Clamp(this.x, 130, 830);
    this.y = Phaser.Math.Clamp(this.y, 170, 400);

    this.state = moved ? 'running' : 'idle';
  }

  _perspectiveScale() {
    var t = (this.y - 170) / (400 - 170);
    return Phaser.Math.Linear(0.72, 1.0, t);
  }

  draw() {
    this.gfx.clear();
    var s = this._perspectiveScale();
    this._drawBody(this.x, this.y, s);
    this.label.setPosition(this.x, this.y - 52 * s);
    this.gfx.setDepth(this.y);
    this.label.setDepth(this.y + 1);
  }

  _drawBody(x, y, s) {
    var g = this.gfx;
    g.fillStyle(0x1d428a);
    g.fillCircle(x, y - 36 * s, 14 * s);
    g.fillRect(x - 12 * s, y - 22 * s, 24 * s, 28 * s);
  }
}
