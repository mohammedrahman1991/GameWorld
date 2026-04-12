class RanksScene extends Phaser.Scene {
  constructor() { super({ key: 'RanksScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x08081e, 0x08081e, 0x0a0e28, 0x0a0e28, 1);
    bg.fillRect(0, 0, W, H);

    // Grid
    for (let y = 0; y < H; y += 60) {
      const ln = this.add.graphics();
      ln.lineStyle(1, 0x222244, 0.3);
      ln.lineBetween(0, y, W, y);
    }

    this.add.text(W / 2, 44, '\u26A1 WEEKLY RANKINGS \u26A1', {
      fontSize: '46px', fontFamily: 'Impact',
      color: '#44aaff', stroke: '#002266', strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 6, fill: true }
    }).setOrigin(0.5);

    this.add.text(W / 2, 96, 'Rankings reset every week. Win games to climb the ranks!', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#555577'
    }).setOrigin(0.5);

    const tiers = [
      { name: 'DIAMOND',  color: 0x00ffff,  min: 5000, maxLabel: '\u221E',   icon: '\u25C6' },
      { name: 'PLATINUM', color: 0xe5e4e2,  min: 3000, maxLabel: '4999',     icon: '\u25A0' },
      { name: 'GOLD',     color: 0xffd700,  min: 1500, maxLabel: '2999',     icon: '\u2605' },
      { name: 'SILVER',   color: 0xc0c0c0,  min: 500,  maxLabel: '1499',     icon: '\u25CF' },
      { name: 'BRONZE',   color: 0xcd7f32,  min: 0,    maxLabel: '499',      icon: '\u25CB' }
    ];

    const myRank = SaveSystem.getRankTier(save.weeklyPoints);

    tiers.forEach((tier, i) => {
      const ty = 128 + i * 82;
      const isMyRank = tier.name === myRank.name;
      const colorHex = '#' + tier.color.toString(16).padStart(6, '0');
      const cx = W / 2;

      const card = this.add.graphics();
      card.fillStyle(isMyRank ? tier.color : 0x111122, isMyRank ? 0.12 : 1);
      card.fillRoundedRect(cx - 340, ty, 680, 70, 10);
      card.lineStyle(isMyRank ? 3 : 1, tier.color, isMyRank ? 1 : 0.4);
      card.strokeRoundedRect(cx - 340, ty, 680, 70, 10);

      // Icon
      this.add.text(cx - 308, ty + 35, tier.icon, {
        fontSize: '24px', color: colorHex
      }).setOrigin(0.5);

      // Name
      this.add.text(cx - 270, ty + 35, tier.name, {
        fontSize: '24px', fontFamily: 'Impact', color: colorHex
      }).setOrigin(0, 0.5);

      // Points range
      this.add.text(cx, ty + 35, `${tier.min} \u2014 ${tier.maxLabel} pts`, {
        fontSize: '16px', fontFamily: 'Courier New', color: '#666688'
      }).setOrigin(0.5);

      if (isMyRank) {
        this.add.text(cx + 300, ty + 20, '\u25C4 YOU ARE HERE', {
          fontSize: '14px', fontFamily: 'Impact', color: colorHex
        }).setOrigin(1, 0);
        this.add.text(cx + 300, ty + 42, `${save.weeklyPoints} pts`, {
          fontSize: '14px', fontFamily: 'Courier New', color: colorHex
        }).setOrigin(1, 0);
      }
    });

    // Progress bar to next rank
    const barY = H - 128;
    if (myRank.next) {
      const pct = Math.min(save.weeklyPoints / myRank.next, 1);
      const barW = 620;
      const barG = this.add.graphics();
      barG.fillStyle(0x1a1a3a, 1);
      barG.fillRoundedRect(W / 2 - barW / 2, barY, barW, 22, 6);
      barG.fillStyle(myRank.color, 1);
      barG.fillRoundedRect(W / 2 - barW / 2, barY, barW * pct, 22, 6);
      barG.lineStyle(1, myRank.color, 0.5);
      barG.strokeRoundedRect(W / 2 - barW / 2, barY, barW, 22, 6);

      this.add.text(W / 2, barY + 30, `${save.weeklyPoints} / ${myRank.next} pts to next rank`, {
        fontSize: '14px', fontFamily: 'Courier New', color: '#888899'
      }).setOrigin(0.5);
    } else {
      this.add.text(W / 2, barY + 10, '\u26A1 MAX RANK ACHIEVED \u2014 DIAMOND \u26A1', {
        fontSize: '20px', fontFamily: 'Impact', color: '#00ffff'
      }).setOrigin(0.5);
    }

    // Stats summary
    this.add.text(W / 2, H - 60, `Total Wins: ${save.totalWins}  |  Total Coins: ${save.coins}  |  Mythics Owned: ${save.unlockedMythics.length}/6`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#555577'
    }).setOrigin(0.5);

    const back = this.add.text(55, H - 36, '\u2190 BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#555577'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout',  () => back.setColor('#555577'));
    back.on('pointerup',   () => this.scene.start('MainMenuScene'));
  }
}
