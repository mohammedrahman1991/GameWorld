class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group({ maxSize: 300, runChildUpdate: false });
    this.botBullets = scene.physics.add.group({ maxSize: 400, runChildUpdate: false });
    this.drops = [];
    this.lastFired = 0;
    this.reloading = false;
    this.currentAmmo = 0;
    this.currentMaxAmmo = 0;
  }

  setEnemyGroup(group) {
    this.scene.physics.add.overlap(
      this.bullets, group,
      (bullet, bot) => {
        if (!bullet.active || !bot.active) return;
        bullet.setActive(false).setVisible(false);
        bullet.setVelocity(0, 0);
        if (bot.takeDamage) bot.takeDamage(bullet.damage);
      },
      null, this.scene
    );
    this.scene.physics.add.overlap(
      this.botBullets, this.scene.player,
      (player, bullet) => {
        if (!bullet.active) return;
        bullet.setActive(false).setVisible(false);
        bullet.setVelocity(0, 0);
        if (!this.scene.playerCloaked) {
          this.scene.takeDamage(bullet.damage);
        }
      },
      null, this.scene
    );
  }

  tryFire(x, y, angle) {
    const weapon = this.scene.inventorySystem.getCurrentWeapon();
    if (!weapon || this.reloading) return;

    const now = this.scene.time.now;
    if (now - this.lastFired < weapon.fireRate) return;
    if (this.currentAmmo <= 0) { this.reload(); return; }

    this.lastFired = now;
    this.currentAmmo--;

    if (weapon.isFlame) {
      this.fireFlame(x, y, angle, weapon);
    } else if (weapon.pellets) {
      for (let p = 0; p < weapon.pellets; p++) {
        const spread = (Math.random() - 0.5) * weapon.spread;
        this.spawnBullet(x, y, angle + spread, weapon, this.bullets);
      }
    } else {
      const spread = (Math.random() - 0.5) * weapon.spread;
      this.spawnBullet(x, y, angle + spread, weapon, this.bullets);
    }

    this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
  }

  spawnBullet(x, y, angle, weapon, group) {
    const bx = x + Math.cos(angle) * 20;
    const by = y + Math.sin(angle) * 20;

    let b = group.get(bx, by, 'bullet');
    if (!b) return null;
    b.setActive(true).setVisible(true);
    b.setTint(weapon.bulletColor);
    b.setRotation(angle);
    b.setScale(weapon.isMythic ? 1.5 : 1);

    const speed = weapon.bulletSpeed;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.lifespan = (weapon.range / speed) * 1000;
    b.damage = weapon.damage;
    b.setDepth(8);
    b.body.setSize(6, 3);
    return b;
  }

  fireFlame(x, y, angle, weapon) {
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const a = angle + spread;
      const fx = x + Math.cos(a) * 15;
      const fy = y + Math.sin(a) * 15;

      const flame = this.scene.add.sprite(fx, fy, 'flame').setDepth(8);
      flame.setTint(weapon.bulletColor);
      flame.setAlpha(0.85);
      flame.setScale(0.5 + Math.random() * 0.8);

      const dist = weapon.range;
      this.scene.tweens.add({
        targets: flame,
        x: fx + Math.cos(a) * dist,
        y: fy + Math.sin(a) * dist,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: 380,
        onUpdate: () => {
          if (!this.scene.botManager) return;
          this.scene.botManager.bots.getChildren().forEach(bot => {
            if (!bot.active) return;
            const d = Phaser.Math.Distance.Between(flame.x, flame.y, bot.x, bot.y);
            if (d < 40) bot.takeDamage(weapon.damage * 0.4);
          });
        },
        onComplete: () => flame.destroy()
      });
    }
  }

  fireBotBullet(x, y, angle, weapon) {
    const spread = (Math.random() - 0.5) * (weapon.spread + 0.1);
    const b = this.spawnBullet(x, y, angle + spread, weapon, this.botBullets);
    if (b) b.damage = weapon.damage * 0.7;
  }

  updateBullets(delta) {
    const deactivate = (b) => {
      if (!b.active) return;
      b.lifespan -= delta;
      if (b.lifespan <= 0 || b.x < 0 || b.x > this.scene.MAP_W || b.y < 0 || b.y > this.scene.MAP_H) {
        b.setActive(false).setVisible(false);
        b.setVelocity(0, 0);
      }
    };
    this.bullets.getChildren().forEach(deactivate);
    this.botBullets.getChildren().forEach(deactivate);
  }

  reload() {
    if (this.reloading) return;
    const weapon = this.scene.inventorySystem.getCurrentWeapon();
    if (!weapon || this.currentAmmo === weapon.magSize) return;
    this.reloading = true;
    this.scene.uiSystem.showReloading(true);
    this.scene.time.delayedCall(weapon.reloadTime, () => {
      this.reloading = false;
      this.currentAmmo = weapon.magSize;
      this.currentMaxAmmo = weapon.magSize;
      this.scene.uiSystem.showReloading(false);
      this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
    });
  }

  onWeaponChanged(weapon) {
    if (!weapon) return;
    this.reloading = false;
    this.currentAmmo = weapon.magSize;
    this.currentMaxAmmo = weapon.magSize;
    if (this.scene.uiSystem) {
      this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
    }
  }

  dropWeapon(x, y, weapon) {
    if (!weapon) return;
    const dx = x + Phaser.Math.Between(-25, 25);
    const dy = y + Phaser.Math.Between(-25, 25);
    const drop = this.scene.add.sprite(dx, dy, 'pickup').setTint(weapon.color).setDepth(4);
    drop.weaponData = weapon;
    drop.isWeaponDrop = true;

    this.scene.tweens.add({
      targets: drop,
      alpha: 0.4,
      yoyo: true,
      repeat: -1,
      duration: 500
    });

    this.drops.push(drop);

    // Remove after 30s
    this.scene.time.delayedCall(30000, () => {
      const idx = this.drops.indexOf(drop);
      if (idx !== -1) this.drops.splice(idx, 1);
      drop.destroy();
    });
  }

  tryPickupDrop(px, py) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      if (!drop.active) { this.drops.splice(i, 1); continue; }
      const d = Phaser.Math.Distance.Between(px, py, drop.x, drop.y);
      if (d < 60) {
        if (drop.isWeaponDrop && drop.weaponData) {
          this.scene.inventorySystem.addWeapon(drop.weaponData);
          this.scene.uiSystem.showKillFeed(`PICKED UP: ${drop.weaponData.name}`);
          drop.destroy();
          this.drops.splice(i, 1);
          return;
        }
      }
    }
  }
}
