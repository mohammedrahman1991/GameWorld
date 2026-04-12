class ScorePop {
  constructor(scene) { this.scene = scene; }

  show(x, y, text) {
    var t = this.scene.add.text(x, y, text, {
      fontSize: '30px', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(950);

    this.scene.tweens.add({
      targets: t, y: y - 65, alpha: 0, duration: 950, ease: 'Power2',
      onComplete: function() { t.destroy(); }
    });

    var flash = this.scene.add.graphics().setDepth(940);
    flash.fillStyle(0xffffff, 0.16);
    flash.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 220,
      onComplete: function() { flash.destroy(); }
    });
  }
}
