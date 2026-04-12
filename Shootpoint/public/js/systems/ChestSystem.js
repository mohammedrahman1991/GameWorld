class ChestSystem {
  constructor(scene) {
    this.scene = scene;
    this.chests = scene.physics.add.staticGroup();
    this.floorItems = [];
    this.spawnChests(28);
  }

  spawnChests(count) {
    for (let i = 0; i < count; i++) {
      let cx, cy, attempts = 0;
      do {
        cx = Phaser.Math.Between(80, this.scene.MAP_W - 80);
        cy = Phaser.Math.Between(80, this.scene.MAP_H - 80);
        attempts++;
      } while (Phaser.Math.Distance.Between(cx, cy, this.scene.MAP_W / 2, this.scene.MAP_H / 2) < 150 && attempts < 30);

      const chest = this.chests.create(cx, cy, 'chest');
      chest.setDepth(5);
      chest.opened = false;
      chest.setTint(0xffd700);

      // Glow pulse
      this.scene.tweens.add({
        targets: chest,
        alpha: 0.7,
        yoyo: true,
        repeat: -1,
        duration: 900
      });
    }
  }

  tryOpen(px, py) {
    this.chests.getChildren().forEach(chest => {
      if (!chest.active || chest.opened) return;
      const d = Phaser.Math.Distance.Between(px, py, chest.x, chest.y);
      if (d < 65) this.openChest(chest);
    });
  }

  openChest(chest) {
    chest.opened = true;
    chest.setTint(0x555555);
    chest.setAlpha(0.5);

    const loot = this.rollLoot();
    loot.forEach((item, i) => {
      this.scene.time.delayedCall(i * 120, () => {
        this.spawnFloorItem(
          chest.x + Phaser.Math.Between(-45, 45),
          chest.y + Phaser.Math.Between(-45, 45),
          item
        );
      });
    });

    this.scene.uiSystem.showKillFeed('\u2B20 CHEST OPENED!');
  }

  rollLoot() {
    const items = [];
    const weaponKeys = Object.keys(WEAPONS);
    const roll = Math.random();

    // Always include a weapon
    const wKey = weaponKeys[Phaser.Math.Between(0, weaponKeys.length - 1)];
    items.push({ type: 'weapon', weapon: WEAPONS[wKey] });

    if (roll < 0.65) items.push({ type: 'grenade' });
    if (roll < 0.4) items.push({ type: 'smokebomb' });
    if (Math.random() < 0.25) items.push({ type: 'healthpack' });
    if (Math.random() < 0.1) {
      // Rare: mythic weapon if owned, else a random weapon
      const save = SaveSystem.load();
      const ownedMythics = save.unlockedMythics;
      if (ownedMythics.length > 0) {
        const randomMythic = ownedMythics[Phaser.Math.Between(0, ownedMythics.length - 1)];
        items.push({ type: 'weapon', weapon: ALL_WEAPONS[randomMythic] });
      }
    }
    return items;
  }

  spawnFloorItem(x, y, item) {
    let sprite;
    if (item.type === 'weapon') {
      sprite = this.scene.add.sprite(x, y, 'pickup');
      sprite.setTint(item.weapon.isMythic ? 0xffd700 : item.weapon.color);
      sprite.weaponData = item.weapon;
      sprite.itemType = 'weapon';
    } else if (item.type === 'grenade') {
      sprite = this.scene.add.sprite(x, y, 'grenade');
      sprite.itemType = 'grenade';
    } else if (item.type === 'smokebomb') {
      sprite = this.scene.add.sprite(x, y, 'smokebomb');
      sprite.itemType = 'smokebomb';
    } else if (item.type === 'healthpack') {
      sprite = this.scene.add.sprite(x, y, 'healthpack');
      sprite.itemType = 'healthpack';
    }

    if (!sprite) return;
    sprite.setDepth(6);

    // Bob up/down
    this.scene.tweens.add({
      targets: sprite,
      y: y - 8,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut'
    });

    // Label
    const labelText = item.type === 'weapon'
      ? item.weapon.name
      : item.type === 'grenade' ? 'GRENADE'
      : item.type === 'smokebomb' ? 'SMOKE'
      : '+40 HP';

    const label = this.scene.add.text(x, y + 14, labelText, {
      fontSize: '9px', fontFamily: 'Courier New', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(7);

    this.floorItems.push({ sprite, label, item });

    // Auto-remove after 45s
    this.scene.time.delayedCall(45000, () => {
      const idx = this.floorItems.findIndex(fi => fi.sprite === sprite);
      if (idx !== -1) this.floorItems.splice(idx, 1);
      sprite.destroy();
      label.destroy();
    });
  }

  tryPickupItem(px, py) {
    for (let i = this.floorItems.length - 1; i >= 0; i--) {
      const fi = this.floorItems[i];
      if (!fi.sprite.active) { this.floorItems.splice(i, 1); continue; }
      const d = Phaser.Math.Distance.Between(px, py, fi.sprite.x, fi.sprite.y);
      if (d < 55) {
        this.pickupFloorItem(fi, i);
        return;
      }
    }
  }

  pickupFloorItem(fi, idx) {
    const { sprite, label, item } = fi;
    if (item.type === 'weapon') {
      this.scene.inventorySystem.addWeapon(item.weapon);
      this.scene.uiSystem.showKillFeed(`PICKED UP: ${item.weapon.name}`);
    } else if (item.type === 'grenade') {
      this.scene.uiSystem.showKillFeed('GRENADE ACQUIRED — pressing E again throws it');
      this.throwGrenade();
    } else if (item.type === 'smokebomb') {
      this.scene.uiSystem.showKillFeed('SMOKE BOMB DEPLOYED!');
      this.deploySmoke(this.scene.player.x, this.scene.player.y);
    } else if (item.type === 'healthpack') {
      this.scene.healPlayer(40);
      this.scene.uiSystem.showKillFeed('+40 HP RESTORED');
    }
    sprite.destroy();
    label.destroy();
    this.floorItems.splice(idx, 1);
  }

  throwGrenade() {
    const p = this.scene.player;
    const angle = p.rotation;
    const gx = p.x + Math.cos(angle) * 30;
    const gy = p.y + Math.sin(angle) * 30;

    const g = this.scene.add.sprite(gx, gy, 'grenade').setDepth(8);
    this.scene.tweens.add({
      targets: g,
      x: gx + Math.cos(angle) * 220,
      y: gy + Math.sin(angle) * 220,
      duration: 550,
      onComplete: () => {
        g.destroy();
        this.grenadeExplode(g.x, g.y);
      }
    });
  }

  grenadeExplode(cx, cy) {
    const r = 110;
    const expl = this.scene.add.sprite(cx, cy, 'explosion').setDepth(51).setScale(0.8);
    this.scene.tweens.add({ targets: expl, scaleX: 2.8, scaleY: 2.8, alpha: 0, duration: 500, onComplete: () => expl.destroy() });
    this.scene.cameras.main.shake(280, 0.018);

    this.scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const d = Phaser.Math.Distance.Between(cx, cy, bot.x, bot.y);
      if (d < r) bot.takeDamage(80 * (1 - d / r));
    });
    const dp = Phaser.Math.Distance.Between(cx, cy, this.scene.player.x, this.scene.player.y);
    if (dp < r) this.scene.takeDamage(25 * (1 - dp / r));
    this.scene.uiSystem.showKillFeed('\uD83D\uDCA5 GRENADE!');
  }

  deploySmoke(x, y) {
    const smoke = this.scene.add.graphics().setDepth(20);
    smoke.fillStyle(0x888888, 0.45);
    smoke.fillCircle(x, y, 90);

    this.scene.tweens.add({
      targets: smoke,
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 6000,
      onComplete: () => smoke.destroy()
    });
  }

  update() {
    // Move labels with their sprites
    this.floorItems.forEach(fi => {
      if (fi.sprite.active) {
        fi.label.setPosition(fi.sprite.x, fi.sprite.y + 14);
      }
    });
  }
}
