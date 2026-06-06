class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) {
    this.won = data.won || false;
    this.kills = data.kills || 0;
    this.soldier = data.soldier || SOLDIERS[0];
    this.coinsEarned = data.coinsEarned || 0;
    this.totalCoins = data.totalCoins || SaveSystem.load().coins;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();

    const bg = this.add.graphics();
    if (this.won) {
      bg.fillGradientStyle(0x061a06, 0x061a06, 0x0d2e0d, 0x0d2e0d, 1);
    } else {
      bg.fillGradientStyle(0x1a0606, 0x1a0606, 0x2e0d0d, 0x2e0d0d, 1);
    }
    bg.fillRect(0, 0, W, H);

    for (let x = 0; x < W; x += 60) {
      const ln = this.add.graphics();
      ln.lineStyle(1, this.won ? 0x224422 : 0x442222, 0.3);
      ln.lineBetween(x, 0, x, H);
    }

    const title = this.won ? '\u26A1 VICTORY ROYALE \u26A1' : '\u2620 ELIMINATED \u2620';
    const titleColor = this.won ? '#44ff88' : '#ff4444';
    const strokeColor = this.won ? '#00aa44' : '#aa0000';

    this.add.text(W / 2, 80, title, {
      fontSize: '52px', fontFamily: 'Impact',
      color: titleColor, stroke: strokeColor, strokeThickness: 5,
      shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5);

    // Stats card
    const cx = W / 2, cy = 260;
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.65);
    card.fillRoundedRect(cx - 240, cy - 100, 480, 200, 14);
    card.lineStyle(2, this.won ? 0x44ff88 : 0xff4444, 1);
    card.strokeRoundedRect(cx - 240, cy - 100, 480, 200, 14);

    const rank = SaveSystem.getRankTier(save.weeklyPoints);

    const rows = [
      ['KILLS',        `${this.kills}`,                  '#ff4444'],
      ['COINS EARNED', `+${this.coinsEarned}`,            '#ffd700'],
      ['TOTAL COINS',  `${this.totalCoins}`,              '#ffd700'],
      ['TOTAL WINS',   `${save.totalWins}`,               '#44aaff'],
      ['WEEKLY RANK',  rank.name,                         '#' + rank.color.toString(16).padStart(6,'0')]
    ];

    rows.forEach(([label, value, vColor], i) => {
      this.add.text(cx - 200, cy - 82 + i * 34, label, {
        fontSize: '15px', fontFamily: 'Courier New', color: '#888899'
      });
      this.add.text(cx + 210, cy - 82 + i * 34, value, {
        fontSize: '15px', fontFamily: 'Impact', color: vColor, align: 'right'
      }).setOrigin(1, 0);
    });

    // Rank progress bar
    const barY = 390;
    if (rank.next) {
      const pct = Math.min(save.weeklyPoints / rank.next, 1);
      const barG = this.add.graphics();
      barG.fillStyle(0x222233, 1);
      barG.fillRoundedRect(cx - 260, barY, 520, 16, 5);
      barG.fillStyle(rank.color, 1);
      barG.fillRoundedRect(cx - 260, barY, 520 * pct, 16, 5);
      this.add.text(cx, barY + 22, `${save.weeklyPoints} / ${rank.next} pts to next rank`, {
        fontSize: '12px', fontFamily: 'Courier New', color: '#888899'
      }).setOrigin(0.5);
    }

    if (this.won) {
      // Mythic weapon picker
      this.drawMythicPicker(cx, 450, save);
    } else {
      this.makeButton(cx - 140, H - 60, 'PLAY AGAIN', 0x44ff88, () => this.scene.start('CharacterSelectScene'));
      this.makeButton(cx + 140, H - 60, 'MAIN MENU',  0x4488ff, () => this.scene.start('MainMenuScene'));
    }
  }

  drawMythicPicker(cx, y, save) {

    this.add.text(cx, y, '\u2605 ASSIGN A WEAPON TO YOUR CLASS \u2726', {
      fontSize: '16px', fontFamily: 'Impact', color: '#ffaa00',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(cx, y + 22, `You have ${save.coins} coins  \u2014  Legendary 500\u2B21  |  Mythic 1000\u2B21`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#887755'
    }).setOrigin(0.5);

    const items = [...LEGENDARY_SHOP_ITEMS, ...MYTHIC_SHOP_ITEMS];
    // 6 legendaries + 6 mythics split into 2 rows of 6
    const btnW = 180, btnH = 44, gap = 8;
    const cols = 6;
    const totalW = cols * (btnW + gap) - gap;
    const startX = cx - totalW / 2 + btnW / 2;

    items.forEach((item, i) => {
      const bx = startX + (i % cols) * (btnW + gap);
      const by = y + 60 + Math.floor(i / cols) * (btnH + 10);
      const isLeg = item.id.endsWith('_legendary');
      const owned = isLeg ? save.unlockedLegendaries?.includes(item.id) : save.unlockedMythics.includes(item.id);
      const canAfford = save.coins >= item.cost;

      const accentColor = isLeg ? 0xff8800 : 0xffd700;
      const borderColor = owned ? 0x44ff88 : canAfford ? accentColor : 0x444444;
      const labelColor  = owned ? '#44ff88' : canAfford ? (isLeg ? '#ff8800' : '#ffd700') : '#555555';

      const btnBg = this.add.graphics();
      btnBg.fillStyle(owned ? 0x004400 : 0x111100, 1);
      btnBg.fillRoundedRect(bx - btnW/2, by - btnH/2, btnW, btnH, 7);
      btnBg.lineStyle(2, borderColor, 1);
      btnBg.strokeRoundedRect(bx - btnW/2, by - btnH/2, btnW, btnH, 7);

      const shortName = item.weaponKey.charAt(0).toUpperCase() + item.weaponKey.slice(1);
      const topLabel = owned ? '\u2713 OWNED' : `${item.cost}\u2B21`;

      this.add.text(bx, by - 10, topLabel, {
        fontSize: '10px', fontFamily: 'Courier New', color: labelColor
      }).setOrigin(0.5);

      this.add.text(bx, by + 8, shortName, {
        fontSize: '14px', fontFamily: 'Impact', color: labelColor
      }).setOrigin(0.5);

      if (!owned && canAfford) {
        const hitZone = this.add.rectangle(bx, by, btnW, btnH, 0xffffff, 0)
          .setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => { btnBg.setAlpha(1.4); });
        hitZone.on('pointerout',  () => { btnBg.setAlpha(1); });
        hitZone.on('pointerup',   () => {
          const bought = isLeg ? SaveSystem.unlockLegendary(item.id) : SaveSystem.unlockMythic(item.id);
          if (bought) {
            // Assign to selected soldier class
            const soldierKey = this.soldier.id;
            const soldierAssignments = SaveSystem.load();
            soldierAssignments[`mythic_${soldierKey}`] = item.id;
            SaveSystem.save(soldierAssignments);
            this.showAssignedFeedback(cx, by + 70, item.name, this.soldier.name);
            // Rebuild scene to refresh owned state
            this.time.delayedCall(1200, () => this.scene.restart());
          }
        });
      } else if (owned) {
        // Re-assign to this class
        const hitZone = this.add.rectangle(bx, by, btnW, btnH, 0xffffff, 0)
          .setInteractive({ useHandCursor: true });
        hitZone.on('pointerup', () => {
          const data = SaveSystem.load();
          data[`mythic_${this.soldier.id}`] = item.id;
          SaveSystem.save(data);
          this.showAssignedFeedback(cx, by + 70, item.name, this.soldier.name);
        });
      }
    });

    // Skip / continue buttons below picker
    const H = this.scale.height;
    this.makeButton(cx - 140, H - 52, 'PLAY AGAIN', 0x44ff88, () => this.scene.start('CharacterSelectScene'));
    this.makeButton(cx + 140, H - 52, 'MAIN MENU',  0x4488ff, () => this.scene.start('MainMenuScene'));

    // Share button
    const _sb = document.getElementById('wb-sp-share') || (()=>{
      const b=document.createElement('button'); b.id='wb-sp-share';
      b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 32px;background:linear-gradient(135deg,#f97316,#fbbf24);border:none;border-radius:12px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;z-index:999;';
      b.textContent='⬆ Share Result'; document.body.appendChild(b); return b;
    })();
    _sb.style.display='block';
    const _won = this.won;
    const _kills = this.kills;
    _sb.onclick=()=>{ if(window.WackyShare) WackyShare.show('Shootpoint', (_won?'Victory! ':'Eliminated! ')+`I got ${_kills} kills in Shootpoint!`, 'https://wackybrains.com/Shootpoint/'); };
  }

  showAssignedFeedback(cx, y, weaponName, soldierName) {
    const txt = this.add.text(cx, y, `\u2726 ${weaponName} assigned to ${soldierName}!`, {
      fontSize: '15px', fontFamily: 'Impact', color: '#ffd700',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      y: y - 30,
      alpha: 0,
      duration: 1800,
      onComplete: () => txt.destroy()
    });
  }

  makeButton(x, y, label, color, cb) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(x - 110, y - 24, 220, 48, 8);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(x - 110, y - 24, 220, 48, 8);

    const txt = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Impact', color: hex
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setScale(1.06));
    txt.on('pointerout',  () => txt.setScale(1));
    txt.on('pointerup', cb);
  }
}
