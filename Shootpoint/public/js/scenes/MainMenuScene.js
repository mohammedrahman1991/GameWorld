class MainMenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MainMenuScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();
    const rank = SaveSystem.getRankTier(save.weeklyPoints);

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2a, 0x0d0d2a, 0x1a0d3a, 0x1a0d3a, 1);
    bg.fillRect(0, 0, W, H);

    // Animated grid lines
    for (let x = 0; x < W; x += 60) {
      const line = this.add.graphics();
      line.lineStyle(1, 0x4444aa, 0.3);
      line.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H; y += 60) {
      const line = this.add.graphics();
      line.lineStyle(1, 0x4444aa, 0.3);
      line.lineBetween(0, y, W, y);
    }

    // Title
    this.add.text(W / 2, 100, 'SHOOTPOINT', {
      fontSize: '72px', fontFamily: 'Impact, Arial Black',
      color: '#ff4444', stroke: '#ff0000', strokeThickness: 6,
      shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.add.text(W / 2, 168, 'BATTLE ROYALE', {
      fontSize: '24px', fontFamily: 'Courier New',
      color: '#88ccff', letterSpacing: 12
    }).setOrigin(0.5);

    // Weekly rank card
    this.drawRankCard(W / 2, 242, rank, save.weeklyPoints);

    // Coin display
    this.add.text(W / 2, 296, `\u2B21 ${save.coins} COINS`, {
      fontSize: '20px', fontFamily: 'Courier New', color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(W / 2, 320, `Total Wins: ${save.totalWins}`, {
      fontSize: '14px', fontFamily: 'Courier New', color: '#888899'
    }).setOrigin(0.5);

    // Buttons
    this.makeButton(W / 2, 390, 'PLAY', 0xff4444, () => this.scene.start('CharacterSelectScene'));
    this.makeButton(W / 2, 460, 'SHOP', 0xffd700, () => this.scene.start('ShopScene'));
    this.makeButton(W / 2, 530, 'WEEKLY RANKS', 0x44aaff, () => this.scene.start('RanksScene'));

    // Controls tip
    this.add.text(W / 2, H - 20, 'WASD move  |  Mouse aim  |  LMB shoot  |  1-4 weapon  |  E pickup  |  R reload  |  Q ability', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#555577'
    }).setOrigin(0.5);
  }

  drawRankCard(x, y, rank, points) {
    const colorHex = '#' + rank.color.toString(16).padStart(6, '0');
    const card = this.add.graphics();
    card.fillStyle(0x1a1a3a, 1);
    card.fillRoundedRect(x - 160, y - 32, 320, 58, 8);
    card.lineStyle(2, rank.color, 1);
    card.strokeRoundedRect(x - 160, y - 32, 320, 58, 8);

    this.add.text(x, y - 12, `WEEKLY RANK: ${rank.name}`, {
      fontSize: '18px', fontFamily: 'Impact', color: colorHex
    }).setOrigin(0.5);

    this.add.text(x, y + 10, `${points} pts this week`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#aaaacc'
    }).setOrigin(0.5);
  }

  makeButton(x, y, label, color, callback) {
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);

    const txt = this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: 'Impact', color: colorHex,
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.35);
      bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);
      txt.setScale(1.05);
    });
    txt.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.15);
      bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);
      txt.setScale(1);
    });
    txt.on('pointerup', callback);
  }
}
