class Edwards extends Player {
  constructor(scene, x, y) {
    super(
      scene, x, y,
      { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
        shoot: 'FORWARD_SLASH', dribble: 'COMMA', pass: 'PERIOD', pumpfake: 'M' },
      { speed: 92, threePoint: 82, midRange: 88, dribble: 86, steal: 85, dunk: 95 },
      'edwards'
    );
    this.label.setText('ANT-MAN #5');
    this.label.setStyle({ fontSize: '10px', color: '#ffffff', stroke: '#c8102e', strokeThickness: 3 });
    this.facingRight = false;
  }

  _drawBody(x, y, s) {
    var g = this.gfx;
    var dir = this.facingRight ? 1 : -1;

    // Head bigger
    g.fillStyle(0x8B5E3C); g.fillCircle(x, y - 46 * s, 15 * s);
    g.lineStyle(1.5, 0x333333); g.strokeCircle(x, y - 46 * s, 15 * s);
    // Eye
    g.fillStyle(0x222222); g.fillCircle(x + dir * 5 * s, y - 49 * s, 2.5 * s);
    // Jersey Wolves red
    g.fillStyle(0xc8102e); g.fillRect(x - 15 * s, y - 31 * s, 30 * s, 30 * s);
    g.lineStyle(1.5, 0x333333); g.strokeRect(x - 15 * s, y - 31 * s, 30 * s, 30 * s);
    // Number 5
    g.fillStyle(0xffffff); g.fillRect(x - 4 * s, y - 28 * s, 8 * s, 14 * s);
    // Arms
    g.fillStyle(0x8B5E3C);
    g.fillRect(x - 22 * s, y - 30 * s, 7 * s, 20 * s);
    g.fillRect(x + 15 * s, y - 30 * s, 7 * s, 20 * s);
    // Shorts
    g.fillStyle(0xc8102e); g.fillRect(x - 15 * s, y - 2 * s, 30 * s, 20 * s);
    // Legs
    g.fillStyle(0x8B5E3C);
    g.fillRect(x - 13 * s, y + 18 * s, 11 * s, 22 * s);
    g.fillRect(x + 2 * s,  y + 18 * s, 11 * s, 22 * s);
    // Shoes black
    g.fillStyle(0x111111);
    g.fillRect(x - 15 * s, y + 38 * s, 13 * s, 7 * s);
    g.fillRect(x + 2 * s,  y + 38 * s, 13 * s, 7 * s);
    g.lineStyle(1, 0x555555);
    g.strokeRect(x - 15 * s, y + 38 * s, 13 * s, 7 * s);
    g.strokeRect(x + 2 * s,  y + 38 * s, 13 * s, 7 * s);
  }
}
