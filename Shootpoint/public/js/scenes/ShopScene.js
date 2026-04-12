class ShopScene extends Phaser.Scene {
  constructor() { super({ key: 'ShopScene' }); }

  init() {
    this.activeTab = 'legendary'; // 'legendary' | 'mythic'
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x080810, 0x080810, 0x12100a, 0x12100a, 1);
    bg.fillRect(0, 0, W, H);

    for (let x = 0; x < W; x += 60) {
      const ln = this.add.graphics();
      ln.lineStyle(1, 0x222211, 0.35);
      ln.lineBetween(x, 0, x, H);
    }

    // Title
    this.add.text(W / 2, 36, 'ARMORY', {
      fontSize: '48px', fontFamily: 'Impact',
      color: '#ffffff', stroke: '#333333', strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 6, fill: true }
    }).setOrigin(0.5);

    const save = SaveSystem.load();

    this.coinsDisplay = this.add.text(W / 2, 82, `\u2B21 ${save.coins} COINS`, {
      fontSize: '20px', fontFamily: 'Courier New', color: '#ffd700'
    }).setOrigin(0.5);

    // ── Tabs ────────────────────────────────────────────────────
    this.tabLegBg  = this.add.graphics();
    this.tabMythBg = this.add.graphics();

    const tabLegTxt  = this.add.text(W / 2 - 140, 112, '\u2605  LEGENDARY  500\u2B21', {
      fontSize: '17px', fontFamily: 'Impact', color: '#ff8800'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const tabMythTxt = this.add.text(W / 2 + 140, 112, '\u2726  MYTHIC  1000\u2B21', {
      fontSize: '17px', fontFamily: 'Impact', color: '#ffd700'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tabLegTxt.on('pointerup',  () => { this.activeTab = 'legendary'; this.refreshCards(save); this.drawTabs(); });
    tabMythTxt.on('pointerup', () => { this.activeTab = 'mythic';    this.refreshCards(save); this.drawTabs(); });

    // Card container (cleared on tab switch)
    this.cardContainer = this.add.container(0, 0);

    this.drawTabs();
    this.refreshCards(save);

    // Earn tip
    this.add.text(W / 2, H - 46, '+100 coins per kill  |  +100 per win  |  +1000 bonus every 10 wins', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#555544'
    }).setOrigin(0.5);

    const back = this.add.text(55, H - 32, '\u2190 BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#666655'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout',  () => back.setColor('#666655'));
    back.on('pointerup',   () => this.scene.start('MainMenuScene'));
  }

  drawTabs() {
    const W = this.scale.width;
    const isLeg = this.activeTab === 'legendary';

    this.tabLegBg.clear();
    this.tabLegBg.fillStyle(0xff8800, isLeg ? 0.2 : 0.05);
    this.tabLegBg.fillRoundedRect(W / 2 - 252, 98, 224, 28, 6);
    this.tabLegBg.lineStyle(2, 0xff8800, isLeg ? 1 : 0.3);
    this.tabLegBg.strokeRoundedRect(W / 2 - 252, 98, 224, 28, 6);

    this.tabMythBg.clear();
    this.tabMythBg.fillStyle(0xffd700, !isLeg ? 0.2 : 0.05);
    this.tabMythBg.fillRoundedRect(W / 2 + 28, 98, 224, 28, 6);
    this.tabMythBg.lineStyle(2, 0xffd700, !isLeg ? 1 : 0.3);
    this.tabMythBg.strokeRoundedRect(W / 2 + 28, 98, 224, 28, 6);
  }

  refreshCards(save) {
    this.cardContainer.removeAll(true);

    const items = this.activeTab === 'legendary' ? LEGENDARY_SHOP_ITEMS : MYTHIC_SHOP_ITEMS;
    const accentColor = this.activeTab === 'legendary' ? 0xff8800 : 0xffd700;
    const accentHex   = this.activeTab === 'legendary' ? '#ff8800' : '#ffd700';
    const cols = 3, cw = 390, ch = 200;
    const W = this.scale.width;
    const startX = W / 2 - (cols * cw) / 2 + cw / 2;
    const startY = 175;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * cw;
      const cy = startY + row * ch;
      this.drawCard(cx, cy, item, save, accentColor, accentHex);
    });
  }

  drawCard(cx, cy, item, save, accentColor, accentHex) {
    const isLeg  = this.activeTab === 'legendary';
    const owned  = isLeg ? SaveSystem.hasLegendary(item.id) : SaveSystem.hasMythic(item.id);
    const canAfford = save.coins >= item.cost;
    const upgDef = ALL_WEAPONS[item.id];
    const baseDef = WEAPONS[item.weaponKey];

    // Card bg
    const cardBg = this.add.graphics();
    cardBg.fillStyle(owned ? (isLeg ? 0x1a0e00 : 0x1a1800) : 0x0c0c12, 1);
    cardBg.fillRoundedRect(cx - 178, cy - 92, 356, 184, 10);
    cardBg.lineStyle(2, owned ? accentColor : (canAfford ? accentColor * 0.6 : 0x333333), owned ? 1 : 0.5);
    cardBg.strokeRoundedRect(cx - 178, cy - 92, 356, 184, 10);
    this.cardContainer.add(cardBg);

    if (owned) {
      const ownedTxt = this.add.text(cx - 168, cy - 82, '\u2713 OWNED', {
        fontSize: '11px', fontFamily: 'Courier New', color: '#44ff88'
      });
      this.cardContainer.add(ownedTxt);
    }

    // Color swatch
    const swatch = this.add.graphics();
    swatch.fillStyle(accentColor, 1);
    swatch.fillRect(cx - 158, cy - 60, 40, 18);
    this.cardContainer.add(swatch);

    const nameText = this.add.text(cx - 106, cy - 64, item.name, {
      fontSize: '14px', fontFamily: 'Impact', color: accentHex,
      wordWrap: { width: 250 }
    });
    this.cardContainer.add(nameText);

    // Stat comparison
    if (upgDef && baseDef) {
      const statLines = [
        [`DMG`,  baseDef.damage,   upgDef.damage,   '#aaffaa'],
        [`MAG`,  baseDef.magSize,  upgDef.magSize,  '#aaaaff'],
        [`RATE`, `${baseDef.fireRate}ms`, `${upgDef.fireRate}ms`, '#ffaaaa']
      ];
      statLines.forEach(([label, base, upg, col], si) => {
        const st = this.add.text(cx - 158, cy - 26 + si * 18,
          `${label}:  ${base}  \u2192  ${upg}`, {
          fontSize: '12px', fontFamily: 'Courier New', color: col
        });
        this.cardContainer.add(st);
      });
    }

    if (!owned) {
      const btnColor = canAfford ? accentColor : 0x444444;
      const btnHex   = canAfford ? accentHex   : '#555555';

      const btnBg = this.add.graphics();
      btnBg.fillStyle(btnColor, 0.15);
      btnBg.fillRoundedRect(cx - 155, cy + 38, 310, 42, 7);
      btnBg.lineStyle(2, btnColor, canAfford ? 1 : 0.4);
      btnBg.strokeRoundedRect(cx - 155, cy + 38, 310, 42, 7);
      this.cardContainer.add(btnBg);

      const btn = this.add.text(cx, cy + 59, `BUY \u2014 ${item.cost} COINS`, {
        fontSize: '16px', fontFamily: 'Impact', color: btnHex
      }).setOrigin(0.5);
      this.cardContainer.add(btn);

      if (canAfford) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout',  () => btn.setScale(1));
        btn.on('pointerup', () => {
          const ok = isLeg
            ? SaveSystem.unlockLegendary(item.id)
            : SaveSystem.unlockMythic(item.id);
          if (ok) this.scene.restart();
        });
      }
    } else {
      const unlockedTxt = this.add.text(cx, cy + 59, '\u2713 UNLOCKED \u2014 AVAILABLE IN GAME', {
        fontSize: '13px', fontFamily: 'Courier New', color: accentHex, align: 'center'
      }).setOrigin(0.5);
      this.cardContainer.add(unlockedTxt);
    }
  }
}
