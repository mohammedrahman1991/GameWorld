class CharacterSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'CharacterSelectScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();
    this.selectedIdx = Math.max(0, SOLDIERS.findIndex(s => s.id === save.selectedSoldier));

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, 50, 'SELECT SOLDIER', {
      fontSize: '48px', fontFamily: 'Impact', color: '#ff8844',
      stroke: '#ff4400', strokeThickness: 4
    }).setOrigin(0.5);

    this.cards = [];
    SOLDIERS.forEach((sol, i) => {
      const cx = 160 + i * 250;
      const cy = H / 2;
      this.drawSoldierCard(cx, cy, sol, i);
    });

    this.highlightSelected();
    this.makePlayButton(W / 2, H - 80);

    const back = this.add.text(60, H - 80, '\u2190 BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#888899'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout', () => back.setColor('#888899'));
    back.on('pointerup', () => this.scene.start('MainMenuScene'));
  }

  drawSoldierCard(cx, cy, sol, idx) {
    const colorHex = '#' + sol.color.toString(16).padStart(6, '0');

    const card = this.add.graphics();
    card.fillStyle(0x1a1a3a, 1);
    card.fillRoundedRect(cx - 95, cy - 130, 190, 260, 10);
    card.lineStyle(2, sol.color, 0.6);
    card.strokeRoundedRect(cx - 95, cy - 130, 190, 260, 10);

    const preview = this.add.graphics();
    preview.fillStyle(sol.color, 1);
    preview.fillRect(cx - 24, cy - 90, 48, 48);
    preview.fillStyle(sol.accentColor, 1);
    preview.fillRect(cx - 12, cy - 78, 24, 24);

    this.add.text(cx, cy - 20, sol.name, {
      fontSize: '20px', fontFamily: 'Impact', color: colorHex
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, sol.description, {
      fontSize: '12px', fontFamily: 'Courier New', color: '#aaaacc',
      wordWrap: { width: 170 }, align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 55, `HP: ${sol.health}`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#44ff88'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 72, `SPD: ${sol.speed}`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#44aaff'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 89, sol.ability, {
      fontSize: '11px', fontFamily: 'Courier New', color: '#ffaa44',
      wordWrap: { width: 170 }, align: 'center'
    }).setOrigin(0.5);

    const hitZone = this.add.rectangle(cx, cy - 10, 190, 260, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerup', () => {
      this.selectedIdx = idx;
      this.highlightSelected();
    });

    this.cards.push({ card, cx, cy, sol });
  }

  highlightSelected() {
    this.cards.forEach(({ card, cx, cy, sol }, i) => {
      card.clear();
      const selected = i === this.selectedIdx;
      card.fillStyle(selected ? 0x2a2a5a : 0x1a1a3a, 1);
      card.fillRoundedRect(cx - 95, cy - 130, 190, 260, 10);
      card.lineStyle(selected ? 3 : 2, sol.color, selected ? 1 : 0.5);
      card.strokeRoundedRect(cx - 95, cy - 130, 190, 260, 10);
      if (selected) {
        card.lineStyle(1, sol.color, 0.3);
        card.strokeRoundedRect(cx - 99, cy - 134, 198, 268, 12);
      }
    });
  }

  makePlayButton(x, y) {
    const bg = this.add.graphics();
    bg.fillStyle(0xff4444, 0.2);
    bg.fillRoundedRect(x - 150, y - 28, 300, 56, 10);
    bg.lineStyle(3, 0xff4444, 1);
    bg.strokeRoundedRect(x - 150, y - 28, 300, 56, 10);

    const txt = this.add.text(x, y, 'DEPLOY', {
      fontSize: '28px', fontFamily: 'Impact', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setColor('#ff8888'));
    txt.on('pointerout', () => txt.setColor('#ff4444'));
    txt.on('pointerup', () => {
      const sol = SOLDIERS[this.selectedIdx];
      SaveSystem.setSelectedSoldier(sol.id);
      this.scene.start('GameScene', { soldier: sol });
    });
  }
}
