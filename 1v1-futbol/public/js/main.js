const game = new Phaser.Game({
  type:   Phaser.AUTO,
  width:  CFG.WIDTH,
  height: CFG.HEIGHT,
  backgroundColor: '#1a6b1a',
  scene:  [TitleScene, GameScene, GameOverScene],
  physics: {
    default: 'arcade',
    arcade:  { gravity: { y: 0 }, debug: false },
  },
  scale: {
    mode:            Phaser.Scale.FIT,
    autoCenter:      Phaser.Scale.CENTER_BOTH,
    width:           CFG.WIDTH,
    height:          CFG.HEIGHT,
  },
});
