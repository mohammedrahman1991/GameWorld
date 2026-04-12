class MinimapSystem {
  constructor(scene) {
    this.scene = scene;
    this.SIZE = 160;
    this.SCALE = this.SIZE / scene.MAP_W;
    const W = scene.scale.width, H = scene.scale.height;
    this.mx = W - this.SIZE - 15;
    this.my = H - this.SIZE - 75;

    // Background frame
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(103);
    this.bg.fillStyle(0x050510, 0.85);
    this.bg.fillRoundedRect(this.mx - 4, this.my - 4, this.SIZE + 8, this.SIZE + 8, 6);
    this.bg.lineStyle(2, 0x4488ff, 0.8);
    this.bg.strokeRoundedRect(this.mx - 4, this.my - 4, this.SIZE + 8, this.SIZE + 8, 6);

    // Map grid lines (static)
    this.mapGrid = scene.add.graphics().setScrollFactor(0).setDepth(103);
    this.mapGrid.lineStyle(0.5, 0x223322, 1);
    const gridStep = this.SCALE * 400;
    for (let x = this.mx; x <= this.mx + this.SIZE; x += gridStep) {
      this.mapGrid.lineBetween(x, this.my, x, this.my + this.SIZE);
    }
    for (let y = this.my; y <= this.my + this.SIZE; y += gridStep) {
      this.mapGrid.lineBetween(this.mx, y, this.mx + this.SIZE, y);
    }

    // Label
    scene.add.text(this.mx + this.SIZE / 2, this.my - 14, 'MAP', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#4488ff'
    }).setScrollFactor(0).setDepth(104).setOrigin(0.5);

    // Dots layer
    this.dots = scene.add.graphics().setScrollFactor(0).setDepth(105);
  }

  worldToMini(wx, wy) {
    return {
      x: this.mx + wx * this.SCALE,
      y: this.my + wy * this.SCALE
    };
  }

  update() {
    const scene = this.scene;
    this.dots.clear();

    // Zone ring
    const zone = scene.zoneSystem;
    const zc = this.worldToMini(zone.cx, zone.cy);
    const zr = zone.radius * this.SCALE;
    this.dots.lineStyle(1.5, 0x4488ff, 0.9);
    this.dots.strokeCircle(zc.x, zc.y, zr);

    // Chest dots (yellow)
    scene.chestSystem.chests.getChildren().forEach(chest => {
      if (!chest.active || chest.opened) return;
      const p = this.worldToMini(chest.x, chest.y);
      this.dots.fillStyle(0xffd700, 1);
      this.dots.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    });

    // Bot dots (red)
    scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const p = this.worldToMini(bot.x, bot.y);
      this.dots.fillStyle(0xff3333, 1);
      this.dots.fillCircle(p.x, p.y, 2);
    });

    // Player dot (bright blue + direction)
    const pp = this.worldToMini(scene.player.x, scene.player.y);
    this.dots.fillStyle(0x44aaff, 1);
    this.dots.fillCircle(pp.x, pp.y, 4);
    const angle = scene.player.rotation;
    this.dots.lineStyle(1.5, 0xffffff, 1);
    this.dots.lineBetween(pp.x, pp.y, pp.x + Math.cos(angle) * 8, pp.y + Math.sin(angle) * 8);
  }
}
