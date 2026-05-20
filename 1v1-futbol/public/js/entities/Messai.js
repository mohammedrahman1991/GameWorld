class Messai extends Player {
  constructor(scene, x, y) {
    const controls = {
      left:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:     scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      kick:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
      burst:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      fake:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };
    const stats = { pace: 97, shooting: 94, dribbling: 99, tackle: 65 };
    super(scene, x, y, controls, stats, 'messai');

    this.name       = 'MESSAI';
    this.number     = '10';
    this.attackGoal = CFG.RIGHT_GOAL;
    this.defendGoal = CFG.LEFT_GOAL;
  }

  _drawBody(x, y, sc) {
    const g = this._gfx;

    // --- Head ---
    g.fillStyle(0xc8814c, 1);  // skin
    g.fillCircle(x, y - 34 * sc, 11 * sc);

    // Dark curly hair
    g.fillStyle(0x1a0a00, 1);
    g.fillCircle(x, y - 40 * sc, 10 * sc);
    g.fillCircle(x - 5 * sc, y - 37 * sc, 7 * sc);
    g.fillCircle(x + 5 * sc, y - 37 * sc, 7 * sc);

    // --- Jersey body (Argentina blue & white stripes) ---
    const jTop    = y - 26 * sc;
    const jBottom = y - 6 * sc;
    const jW      = 16 * sc;

    // White base
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - jW, jTop, jW * 2, jBottom - jTop);

    // Blue vertical stripes
    g.fillStyle(0x1a4a96, 1);
    for (let i = -1; i <= 1; i++) {
      g.fillRect(x + (i * 10 - 2) * sc, jTop, 5 * sc, jBottom - jTop);
    }

    // Jersey collar
    g.fillStyle(0x1a4a96, 1);
    g.fillCircle(x, jTop + 3 * sc, 4 * sc);

    // Number 10 on front (small)
    g.fillStyle(0x1a4a96, 1);
    // simplified number hint — two small rects
    g.fillRect(x - 4 * sc, jTop + 8 * sc, 2 * sc, 7 * sc);
    g.fillRect(x + 1 * sc, jTop + 8 * sc, 5 * sc, 2 * sc);
    g.fillRect(x + 3 * sc, jTop + 8 * sc, 2 * sc, 7 * sc);

    // --- Arms ---
    g.fillStyle(0xc8814c, 1);
    // Left arm
    g.fillRect(x - (jW + 5 * sc), jTop, 5 * sc, 16 * sc);
    // Right arm
    g.fillRect(x + jW, jTop, 5 * sc, 16 * sc);

    // --- Shorts (black) ---
    g.fillStyle(0x111111, 1);
    g.fillRect(x - 14 * sc, jBottom, 28 * sc, 11 * sc);

    // --- Socks (blue & white bands) ---
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 11 * sc, jBottom + 11 * sc, 8 * sc, 12 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 11 * sc, 8 * sc, 12 * sc);
    g.fillStyle(0x1a4a96, 1);
    g.fillRect(x - 11 * sc, jBottom + 11 * sc, 8 * sc, 3 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 11 * sc, 8 * sc, 3 * sc);
    g.fillRect(x - 11 * sc, jBottom + 18 * sc, 8 * sc, 3 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 18 * sc, 8 * sc, 3 * sc);

    // --- Cleats (black) ---
    g.fillStyle(0x111111, 1);
    g.fillRect(x - 13 * sc, jBottom + 23 * sc, 9 * sc, 4 * sc);
    g.fillRect(x + 4 * sc,  jBottom + 23 * sc, 9 * sc, 4 * sc);

    // --- Name label ---
    this._gfx.fillStyle(0xffffff, 0);
    const label = this.scene.add.text ? null : null; // handled via HUD
  }
}
