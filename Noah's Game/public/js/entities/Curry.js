class Curry extends Player {
  constructor(scene, x, y) {
    super(
      scene, x, y,
      { up: 'W', down: 'S', left: 'A', right: 'D',
        shoot: 'G', dribble: 'T', pass: 'F', pumpfake: 'R' },
      { speed: 88, threePoint: 99, midRange: 92, dribble: 96, steal: 77, dunk: 45 },
      'curry'
    );
    this.label.setText('CHEF');
    this.label.setStyle({ fontSize: '10px', color: '#FFC72C', stroke: '#000', strokeThickness: 3 });
  }

  _drawBody(x, y, s) {
    var g = this.gfx;
    var dir = this.facingRight ? 1 : -1;

    // Head
    g.fillStyle(0xffe0b2); g.fillCircle(x, y - 42 * s, 13 * s);
    g.lineStyle(1.5, 0x333333); g.strokeCircle(x, y - 42 * s, 13 * s);
    // Eye
    g.fillStyle(0x333333); g.fillCircle(x + dir * 4 * s, y - 45 * s, 2 * s);
    // Jersey Warriors blue
    g.fillStyle(0x1d428a); g.fillRect(x - 13 * s, y - 29 * s, 26 * s, 28 * s);
    g.lineStyle(1.5, 0x333333); g.strokeRect(x - 13 * s, y - 29 * s, 26 * s, 28 * s);
    // Number 30
    g.fillStyle(0xFFC72C); g.fillRect(x - 5 * s, y - 26 * s, 10 * s, 12 * s);
    // Arms
    g.fillStyle(0xffe0b2);
    g.fillRect(x - 20 * s, y - 28 * s, 7 * s, 18 * s);
    g.fillRect(x + 13 * s, y - 28 * s, 7 * s, 18 * s);
    // Shorts
    g.fillStyle(0x1d428a); g.fillRect(x - 13 * s, y - 2 * s, 26 * s, 18 * s);
    // Legs
    g.fillStyle(0xffe0b2);
    g.fillRect(x - 12 * s, y + 16 * s, 10 * s, 20 * s);
    g.fillRect(x + 2 * s,  y + 16 * s, 10 * s, 20 * s);
    // Shoes white
    g.fillStyle(0xffffff);
    g.fillRect(x - 14 * s, y + 34 * s, 12 * s, 6 * s);
    g.fillRect(x + 2 * s,  y + 34 * s, 12 * s, 6 * s);
    g.lineStyle(1, 0x333333);
    g.strokeRect(x - 14 * s, y + 34 * s, 12 * s, 6 * s);
    g.strokeRect(x + 2 * s,  y + 34 * s, 12 * s, 6 * s);
  }
}
