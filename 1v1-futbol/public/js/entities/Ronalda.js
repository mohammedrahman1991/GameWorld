class Ronalda extends Player {
  constructor(scene, x, y) {
    const controls = {
      left:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up:     scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      kick:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH),
      burst:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
      fake:   scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA),
    };
    const stats = { pace: 93, shooting: 97, dribbling: 87, tackle: 78 };
    super(scene, x, y, controls, stats, 'ronalda');

    this.name       = 'RONALDA';
    this.number     = '7';
    this.attackGoal = CFG.LEFT_GOAL;
    this.defendGoal = CFG.RIGHT_GOAL;
  }

  _drawBody(x, y, sc) {
    const g = this._gfx;

    // --- Long blonde hair (drawn behind head) ---
    g.fillStyle(0xf0c040, 1);
    // Ponytail / long hair shape
    g.fillTriangle(
      x - 9 * sc, y - 38 * sc,
      x + 9 * sc, y - 38 * sc,
      x,          y - 12 * sc
    );
    g.fillCircle(x - 8 * sc, y - 40 * sc, 6 * sc);
    g.fillCircle(x + 8 * sc, y - 40 * sc, 6 * sc);

    // --- Head ---
    g.fillStyle(0xf0c8a0, 1);  // light skin
    g.fillCircle(x, y - 36 * sc, 11 * sc);

    // Hair top (lighter blonde highlights)
    g.fillStyle(0xf8d860, 1);
    g.fillCircle(x - 3 * sc, y - 43 * sc, 8 * sc);
    g.fillCircle(x + 4 * sc, y - 41 * sc, 7 * sc);

    // --- Jersey (Portugal-style red) ---
    const jTop    = y - 26 * sc;
    const jBottom = y - 6 * sc;
    const jW      = 17 * sc;

    g.fillStyle(0xcc0000, 1);
    g.fillRect(x - jW, jTop, jW * 2, jBottom - jTop);

    // Gold trim on collar + sleeves
    g.fillStyle(0xffd700, 1);
    g.fillRect(x - jW, jTop, jW * 2, 3 * sc);
    g.fillRect(x - jW, jTop, 3 * sc, 16 * sc);
    g.fillRect(x + jW - 3 * sc, jTop, 3 * sc, 16 * sc);

    // Number 7 hint (gold on red)
    g.fillStyle(0xffd700, 1);
    g.fillRect(x - 2 * sc, jTop + 7 * sc, 6 * sc, 2 * sc);
    g.fillRect(x + 2 * sc, jTop + 7 * sc, 2 * sc, 4 * sc);
    g.fillRect(x - 1 * sc, jTop + 11 * sc, 5 * sc, 2 * sc);
    g.fillRect(x - 3 * sc, jTop + 13 * sc, 2 * sc, 4 * sc);

    // --- Arms (skin-tone) ---
    g.fillStyle(0xf0c8a0, 1);
    g.fillRect(x - (jW + 5 * sc), jTop, 5 * sc, 14 * sc);
    g.fillRect(x + jW,            jTop, 5 * sc, 14 * sc);

    // --- Shorts (red) ---
    g.fillStyle(0xaa0000, 1);
    g.fillRect(x - 14 * sc, jBottom, 28 * sc, 11 * sc);

    // --- Socks (red & white) ---
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 11 * sc, jBottom + 11 * sc, 8 * sc, 13 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 11 * sc, 8 * sc, 13 * sc);
    g.fillStyle(0xcc0000, 1);
    g.fillRect(x - 11 * sc, jBottom + 11 * sc, 8 * sc, 3 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 11 * sc, 8 * sc, 3 * sc);
    g.fillRect(x - 11 * sc, jBottom + 18 * sc, 8 * sc, 3 * sc);
    g.fillRect(x + 3 * sc,  jBottom + 18 * sc, 8 * sc, 3 * sc);

    // --- Cleats (white) ---
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 13 * sc, jBottom + 24 * sc, 9 * sc, 4 * sc);
    g.fillRect(x + 4 * sc,  jBottom + 24 * sc, 9 * sc, 4 * sc);
    g.fillStyle(0xcc0000, 1);
    g.fillRect(x - 12 * sc, jBottom + 25 * sc, 2 * sc, 2 * sc);
    g.fillRect(x + 5 * sc,  jBottom + 25 * sc, 2 * sc, 2 * sc);
  }
}
