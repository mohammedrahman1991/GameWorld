class UISystem {
  constructor(scene) {
    this.scene = scene;
    this.createHUD();
  }

  createHUD() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;

    // All HUD elements use setScrollFactor(0) to stay fixed on screen

    // ── Health Bar ──────────────────────────────────────────────
    this.healthBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthBg.fillStyle(0x000000, 0.75);
    this.healthBg.fillRoundedRect(20, H - 62, 224, 40, 6);

    this.healthBar = scene.add.graphics().setScrollFactor(0).setDepth(101);

    this.healthText = scene.add.text(28, H - 47, 'HP 100', {
      fontSize: '14px', fontFamily: 'Impact', color: '#44ff88'
    }).setScrollFactor(0).setDepth(102);

    // ── Ammo ─────────────────────────────────────────────────────
    this.ammoBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.ammoBg.fillStyle(0x000000, 0.75);
    this.ammoBg.fillRoundedRect(W - 180, H - 62, 160, 40, 6);

    this.ammoText = scene.add.text(W - 100, H - 44, '30/30', {
      fontSize: '20px', fontFamily: 'Impact', color: '#ffee44', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    this.reloadText = scene.add.text(W - 100, H - 94, 'RELOADING...', {
      fontSize: '15px', fontFamily: 'Courier New', color: '#ff8844'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5).setVisible(false);

    this.weaponNameText = scene.add.text(W - 100, H - 112, '', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#aaaacc', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    // ── Inventory Slots ──────────────────────────────────────────
    this.slotBgs = [];
    this.slotTexts = [];
    for (let i = 0; i < 4; i++) {
      const sx = W - 360 + i * 82, sy = H - 62;
      const bg = scene.add.graphics().setScrollFactor(0).setDepth(100);
      bg.fillStyle(0x000000, 0.7);
      bg.fillRoundedRect(sx - 4, sy - 2, 74, 40, 5);
      this.slotBgs.push(bg);

      const txt = scene.add.text(sx + 33, sy + 18, `${i+1}:-`, {
        fontSize: '10px', fontFamily: 'Courier New', color: '#444466', align: 'center'
      }).setScrollFactor(0).setDepth(102).setOrigin(0.5);
      this.slotTexts.push(txt);
    }

    // ── Kill Feed ────────────────────────────────────────────────
    this.killFeedTexts = [];
    for (let i = 0; i < 5; i++) {
      const kt = scene.add.text(W - 18, 16 + i * 22, '', {
        fontSize: '12px', fontFamily: 'Courier New', color: '#ff8844', align: 'right'
      }).setScrollFactor(0).setDepth(102).setOrigin(1, 0);
      this.killFeedTexts.push(kt);
    }

    // ── Top-left info ────────────────────────────────────────────
    this.killsText = scene.add.text(18, 16, 'KILLS: 0', {
      fontSize: '18px', fontFamily: 'Impact', color: '#ff4444'
    }).setScrollFactor(0).setDepth(102);

    this.streakText = scene.add.text(18, 42, '', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#ffaa00'
    }).setScrollFactor(0).setDepth(102);

    this.coinsText = scene.add.text(18, 62, '\u2B21 0', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#ffd700'
    }).setScrollFactor(0).setDepth(102);

    // ── Alive Counter (top center) ───────────────────────────────
    this.aliveBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.aliveBg.fillStyle(0x000000, 0.6);
    this.aliveBg.fillRoundedRect(W / 2 - 60, 10, 120, 30, 5);

    this.aliveText = scene.add.text(W / 2, 25, '20 ALIVE', {
      fontSize: '16px', fontFamily: 'Impact', color: '#ffffff', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    // ── Damage Flash ─────────────────────────────────────────────
    this.damageFlash = scene.add.graphics().setScrollFactor(0).setDepth(99).setAlpha(0);

    // ── Zone Warning ─────────────────────────────────────────────
    this.zoneText = scene.add.text(W / 2, H - 105, '', {
      fontSize: '15px', fontFamily: 'Impact', color: '#ff4444', align: 'center',
      stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    // ── Ability indicator ────────────────────────────────────────
    this.abilityText = scene.add.text(18, H - 95, '[Q] ABILITY READY', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#44ffaa'
    }).setScrollFactor(0).setDepth(102);
  }

  update() {
    const scene = this.scene;
    const H = scene.scale.height;
    const pct = Math.max(0, scene.playerHealth / scene.playerMaxHealth);

    // Health bar
    this.healthBar.clear();
    const barColor = pct > 0.6 ? 0x44ff88 : pct > 0.3 ? 0xffaa00 : 0xff2222;
    this.healthBar.fillStyle(barColor, 1);
    this.healthBar.fillRoundedRect(22, H - 60, 218 * pct, 36, 5);
    this.healthText.setText(`HP ${Math.ceil(scene.playerHealth)}`);

    // Stats
    this.killsText.setText(`KILLS: ${scene.kills}`);
    this.coinsText.setText(`\u2B21 ${SaveSystem.load().coins}`);

    const streak = scene.scorestreakSystem.currentStreak;
    this.streakText.setText(streak > 0 ? `STREAK: ${streak}/5` : '');

    // Alive
    const aliveCount = scene.botManager.bots.getChildren().filter(b => b.active).length + 1;
    this.aliveText.setText(`${aliveCount} ALIVE`);

    // Ability
    this.abilityText.setText(
      scene.abilityReady
        ? '[Q] ABILITY READY'
        : '[Q] COOLDOWN...'
    );
    this.abilityText.setColor(scene.abilityReady ? '#44ffaa' : '#886644');
  }

  updateAmmo(current, max) {
    this.ammoText.setText(`${current}/${max}`);
    const weapon = this.scene.inventorySystem.getCurrentWeapon();
    if (weapon) this.weaponNameText.setText(weapon.name);
  }

  updateInventory(slots, activeSlot) {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    slots.forEach((weapon, i) => {
      const sx = W - 360 + i * 82, sy = H - 62;
      const isActive = i === activeSlot;
      this.slotBgs[i].clear();
      this.slotBgs[i].fillStyle(isActive ? 0x1a2a5a : 0x000000, isActive ? 0.9 : 0.7);
      this.slotBgs[i].fillRoundedRect(sx - 4, sy - 2, 74, 40, 5);
      this.slotBgs[i].lineStyle(isActive ? 2 : 1, isActive ? 0x4488ff : 0x333355, 1);
      this.slotBgs[i].strokeRoundedRect(sx - 4, sy - 2, 74, 40, 5);

      if (weapon) {
        const colorHex = '#' + weapon.color.toString(16).padStart(6, '0');
        const shortName = weapon.name.length > 8 ? weapon.name.substring(0, 7) + '.' : weapon.name;
        this.slotTexts[i].setText(`${i+1}:${shortName}`).setColor(colorHex);
      } else {
        this.slotTexts[i].setText(`${i+1}:-`).setColor('#333355');
      }
    });
  }

  showReloading(show) {
    this.reloadText.setVisible(show);
  }

  showKillFeed(msg) {
    // Shift existing messages down
    for (let i = this.killFeedTexts.length - 1; i > 0; i--) {
      this.killFeedTexts[i].setText(this.killFeedTexts[i - 1].text);
      this.killFeedTexts[i].setAlpha(this.killFeedTexts[i - 1].alpha * 0.65);
    }
    this.killFeedTexts[0].setText(msg).setAlpha(1);

    this.scene.tweens.add({
      targets: this.killFeedTexts[0],
      alpha: 0,
      delay: 3000,
      duration: 800
    });
  }

  flashDamage() {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    this.damageFlash.clear();
    this.damageFlash.fillStyle(0xff0000, 0.4);
    this.damageFlash.fillRect(0, 0, W, H);
    this.damageFlash.setAlpha(1);
    this.scene.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 350,
      onComplete: () => this.damageFlash.clear()
    });
  }

  showZoneWarning(show) {
    this.zoneText.setText(show ? '\u26A0 OUTSIDE ZONE \u2014 TAKE DAMAGE' : '');
  }

  showBombMode(active) {
    const W = this.scene.scale.width;
    if (!this.bombModeText) {
      this.bombModeText = this.scene.add.text(W / 2, 58, '', {
        fontSize: '20px', fontFamily: 'Impact', color: '#ff4444',
        stroke: '#000', strokeThickness: 3
      }).setScrollFactor(0).setDepth(110).setOrigin(0.5);
    }
    this.bombModeText.setText(active ? '\uD83D\uDCA5 PLANE BOMB \u2014 CLICK MAP TO DROP  |  ESC to cancel' : '');
  }
}
