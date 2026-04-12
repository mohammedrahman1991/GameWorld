const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0d0d1a',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [
    BootScene,
    MainMenuScene,
    CharacterSelectScene,
    GameScene,
    GameOverScene,
    ShopScene,
    RanksScene
  ]
};

const game = new Phaser.Game(config);
