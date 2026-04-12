class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    var self = this;
    var g = this.add.graphics();

    // Sky
    for (var i = 0; i < H * 0.55; i++) {
      var t  = i / (H * 0.55);
      var r  = Math.round(Phaser.Math.Linear(100, 200, t));
      var gr = Math.round(Phaser.Math.Linear(180, 220, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, 255));
      g.fillRect(0, i, W, 1);
    }
    // Sun
    g.fillStyle(0xfff176); g.fillCircle(W - 100, 80, 48);
    g.fillStyle(0xf9ca24, 0.35); g.fillCircle(W - 100, 80, 65);
    // Ocean
    g.fillStyle(0x4fc3f7, 0.6); g.fillRect(0, H * 0.5, W, 22);
    // Sand
    g.fillStyle(0xc4a070); g.fillRect(0, H * 0.55, W, H * 0.45);
    g.fillStyle(0xd4b080, 0.4); g.fillRect(0, H * 0.55, W, 20);

    // Title
    this.add.text(W / 2, H * 0.20, "NOAH'S", {
      fontSize: '78px', color: '#e74c3c', fontStyle: 'bold',
      fontFamily: 'Impact, Arial Black, sans-serif',
      stroke: '#000000', strokeThickness: 7
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.37, 'HOUSE', {
      fontSize: '86px', color: '#f9ca24', fontStyle: 'bold',
      fontFamily: 'Impact, Arial Black, sans-serif',
      stroke: '#000000', strokeThickness: 7
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.53, 'Steph Curry  vs  Ant-Man  |  First to 21', {
      fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    // PLAY button
    var btn = this.add.text(W / 2, H * 0.70, '  PLAY  ', {
      fontSize: '36px', color: '#000000', backgroundColor: '#FFC72C',
      padding: { x: 28, y: 14 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  function() { btn.setStyle({ color: '#1d428a' }); });
    btn.on('pointerout',   function() { btn.setStyle({ color: '#000000' }); });
    btn.on('pointerdown',  function() { self.scene.start('GameScene'); });

    this.input.keyboard.once('keydown-ENTER', function() { self.scene.start('GameScene'); });
    this.input.keyboard.once('keydown-SPACE', function() { self.scene.start('GameScene'); });

    this.add.text(W / 2, H * 0.87,
      'P1: WASD + G shoot  |  P2: Arrow Keys + / shoot',
      { fontSize: '12px', color: '#cccccc' }
    ).setOrigin(0.5);
  }
}
