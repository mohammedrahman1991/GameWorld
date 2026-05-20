class HUD {
  constructor(scene) {
    this.scene = scene;
    this._bg   = scene.add.graphics().setDepth(800);
    this._draw();
  }

  _draw() {
    const g = this._bg;
    // Top bar background
    g.fillStyle(0x000000, 0.70);
    g.fillRoundedRect(0, 0, CFG.WIDTH, 52, { tl:0, tr:0, bl:8, br:8 });

    // Bottom bar background
    g.fillStyle(0x000000, 0.60);
    g.fillRoundedRect(0, CFG.HEIGHT - 36, CFG.WIDTH, 36, { tl:8, tr:8, bl:0, br:0 });
  }

  // Call every frame with current game data
  update(messaiGoals, ronaldaGoals, timeLeft) {
    // Handled by individual text objects created in GameScene
  }

  destroy() { this._bg.destroy(); }
}
