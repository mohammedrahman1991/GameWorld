class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.soldierData = data.soldier || SOLDIERS[0];
    this.save = SaveSystem.load();
  }

  create() {
    this.MAP_W = 4000;
    this.MAP_H = 4000;

    this.physics.world.setBounds(0, 0, this.MAP_W, this.MAP_H);
    this.cameras.main.setBounds(0, 0, this.MAP_W, this.MAP_H);

    this.drawMap();
    this.spawnPlayer();
    this.setupInput();

    // Systems
    this.weaponSystem = new WeaponSystem(this);
    this.inventorySystem = new InventorySystem(this);
    this.chestSystem = new ChestSystem(this);
    this.zoneSystem = new ZoneSystem(this);
    this.scorestreakSystem = new ScorestreakSystem(this);
    this.botManager = new BotManager(this);
    this.uiSystem = new UISystem(this);
    this.minimapSystem = new MinimapSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Show on-screen D-pad
    if (window.showDpad) window.showDpad(true);
    this.events.once('shutdown', () => { if (window.showDpad) window.showDpad(false); });
    this.events.once('destroy',  () => { if (window.showDpad) window.showDpad(false); });

    // Game state
    this.playerHealth = this.soldierData.health;
    this.playerMaxHealth = this.soldierData.health;
    this.playerDead = false;
    this.kills = 0;
    this.abilityReady = true;
    this.abilityCooldown = 8000;

    // Give starting weapons — use class-assigned special weapon if set
    const assignedId = this.save[`mythic_${this.soldierData.id}`];
    let startWeaponKey;
    if (assignedId && ALL_WEAPONS[assignedId]) {
      startWeaponKey = assignedId;
    } else if (this.save.unlockedMythics && this.save.unlockedMythics.includes('assault_mythic')) {
      startWeaponKey = 'assault_mythic';
    } else if (this.save.unlockedLegendaries && this.save.unlockedLegendaries.includes('assault_legendary')) {
      startWeaponKey = 'assault_legendary';
    } else {
      startWeaponKey = 'assault';
    }
    this.inventorySystem.addWeapon(ALL_WEAPONS[startWeaponKey]);
    this.inventorySystem.addWeapon(ALL_WEAPONS['marksman']);
  }

  drawMap() {
    const W = this.MAP_W, H = this.MAP_H;

    // Base ground
    const ground = this.add.graphics();
    ground.fillStyle(0x1a2a1a, 1);
    ground.fillRect(0, 0, W, H);

    // Road grid
    const roads = this.add.graphics();
    roads.fillStyle(0x2a2a2a, 1);
    for (let x = 0; x < W; x += 400) roads.fillRect(x, 0, 60, H);
    for (let y = 0; y < H; y += 400) roads.fillRect(0, y, W, 60);

    // Road center markings
    roads.fillStyle(0x444422, 1);
    for (let x = 29; x < W; x += 400) {
      for (let y = 0; y < H; y += 80) roads.fillRect(x, y, 2, 40);
    }
    for (let y = 29; y < H; y += 400) {
      for (let x = 0; x < W; x += 80) roads.fillRect(x, y, 40, 2);
    }

    // Buildings
    const buildings = this.add.graphics();
    buildings.fillStyle(0x3a2a1a, 1);
    const rng = new Phaser.Math.RandomDataGenerator(['shootpoint_map']);
    for (let bx = 0; bx < W; bx += 400) {
      for (let by = 0; by < H; by += 400) {
        const insets = [[70,70,120,90],[200,70,110,100],[70,190,90,110],[210,200,100,90]];
        insets.forEach(([ox, oy, bw, bh]) => {
          buildings.fillRect(bx + ox, by + oy, bw, bh);
          // Building windows
          buildings.fillStyle(0xffee88, 0.4);
          for (let wx = bx+ox+10; wx < bx+ox+bw-10; wx += 18) {
            for (let wy = by+oy+10; wy < by+oy+bh-10; wy += 18) {
              buildings.fillRect(wx, wy, 8, 8);
            }
          }
          buildings.fillStyle(0x3a2a1a, 1);
        });
      }
    }

    // Forest patches
    const forests = this.add.graphics();
    forests.fillStyle(0x1a4a1a, 1);
    for (let i = 0; i < 60; i++) {
      const fx = rng.integerInRange(100, W - 100);
      const fy = rng.integerInRange(100, H - 100);
      const fr = rng.integerInRange(40, 100);
      forests.fillCircle(fx, fy, fr);
    }

    // Water patches
    const water = this.add.graphics();
    water.fillStyle(0x1a3a5a, 0.8);
    for (let i = 0; i < 8; i++) {
      const wx = rng.integerInRange(200, W - 200);
      const wy = rng.integerInRange(200, H - 200);
      water.fillEllipse(wx, wy, rng.integerInRange(80, 160), rng.integerInRange(50, 100));
    }

    // Map border
    const border = this.add.graphics();
    border.lineStyle(8, 0xff2222, 1);
    border.strokeRect(0, 0, W, H);
  }

  spawnPlayer() {
    const sol = this.soldierData;
    const texKey = this.textures.exists(`player_${sol.id}`) ? `player_${sol.id}` : 'player_ghost';

    this.player = this.physics.add.sprite(this.MAP_W / 2, this.MAP_H / 2, texKey);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(20, 20).setOffset(6, 14); // tighter hitbox on torso

    this.barrel = this.add.sprite(0, 0, 'barrel').setDepth(11).setOrigin(0, 0.5);

    // Player shadow
    this.playerShadow = this.add.graphics().setDepth(9);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up:     Phaser.Input.Keyboard.KeyCodes.W,
      down:   Phaser.Input.Keyboard.KeyCodes.S,
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      reload: Phaser.Input.Keyboard.KeyCodes.R,
      pickup: Phaser.Input.Keyboard.KeyCodes.E,
      ability:Phaser.Input.Keyboard.KeyCodes.Q,
      w1:     Phaser.Input.Keyboard.KeyCodes.ONE,
      w2:     Phaser.Input.Keyboard.KeyCodes.TWO,
      w3:     Phaser.Input.Keyboard.KeyCodes.THREE,
      w4:     Phaser.Input.Keyboard.KeyCodes.FOUR,
      esc:    Phaser.Input.Keyboard.KeyCodes.ESC
    });

    ['w1','w2','w3','w4'].forEach((k, i) => {
      this.keys[k].on('down', () => this.inventorySystem.selectSlot(i));
    });

    this.keys.reload.on('down', () => this.weaponSystem.reload());
    this.keys.pickup.on('down', () => this.tryPickup());
    this.keys.ability.on('down', () => this.useAbility());
    this.keys.esc.on('down', () => {
      if (this.scorestreakSystem.bombSelectMode) {
        this.scorestreakSystem.cancelBombMode();
      } else {
        this.scene.start('MainMenuScene');
      }
    });
  }

  tryPickup() {
    const px = this.player.x, py = this.player.y;
    this.chestSystem.tryOpen(px, py);
    this.weaponSystem.tryPickupDrop(px, py);
    this.chestSystem.tryPickupItem(px, py);
  }

  useAbility() {
    if (!this.abilityReady) return;
    const sol = this.soldierData;
    this.abilityReady = false;

    if (sol.id === 'ghost') {
      // Sprint boost
      this.playerSpeedBoost = 1.4;
      this.time.delayedCall(3000, () => { this.playerSpeedBoost = 1; });
      this.uiSystem.showKillFeed('GHOST: SPRINT ACTIVATED!');
    } else if (sol.id === 'reaper') {
      // Dash forward
      const angle = this.player.rotation;
      this.player.setVelocity(Math.cos(angle) * 800, Math.sin(angle) * 800);
      this.time.delayedCall(200, () => this.player.setVelocity(0, 0));
      this.uiSystem.showKillFeed('REAPER: DASH!');
    } else if (sol.id === 'tank') {
      // Armor — halve damage taken for 3s
      this.playerArmored = true;
      this.time.delayedCall(3000, () => { this.playerArmored = false; });
      this.uiSystem.showKillFeed('TANK: ARMOR ACTIVE!');
    } else if (sol.id === 'spectre') {
      // Cloak — bots ignore player for 2s
      this.playerCloaked = true;
      this.player.setAlpha(0.3);
      this.time.delayedCall(2000, () => {
        this.playerCloaked = false;
        this.player.setAlpha(1);
      });
      this.uiSystem.showKillFeed('SPECTRE: CLOAKED!');
    }

    this.time.delayedCall(this.abilityCooldown, () => {
      this.abilityReady = true;
      this.uiSystem.showKillFeed('ABILITY READY');
    });
  }

  update(time, delta) {
    if (this.playerDead) return;
    this.movePlayer(delta);
    this.aimPlayer();
    this.handleFiring();
    this.drawPlayerShadow();
    this.weaponSystem.updateBullets(delta);
    this.botManager.update(time, delta);
    this.zoneSystem.update(delta);
    this.uiSystem.update();
    this.minimapSystem.update();
    this.scorestreakSystem.update(time, delta);
    this.chestSystem.update();
  }

  movePlayer(_delta) {
    const speed = this.soldierData.speed * (this.playerSpeedBoost || 1);
    const dp = window.dpad || {};
    const vx = (this.keys.left.isDown  || dp.left  ? -1 : this.keys.right.isDown || dp.right ?  1 : 0);
    const vy = (this.keys.up.isDown    || dp.up    ? -1 : this.keys.down.isDown  || dp.down  ?  1 : 0);
    const len = Math.sqrt(vx * vx + vy * vy);
    this.player.setVelocity(
      len > 0 ? (vx / len) * speed : 0,
      len > 0 ? (vy / len) * speed : 0
    );
  }

  aimPlayer() {
    const ptr = this.input.activePointer;
    const wx = this.cameras.main.scrollX + ptr.x;
    const wy = this.cameras.main.scrollY + ptr.y;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, wx, wy);
    this.player.setRotation(angle);
    this.barrel.setPosition(this.player.x, this.player.y);
    this.barrel.setRotation(angle);
  }

  drawPlayerShadow() {
    this.playerShadow.clear();
    this.playerShadow.fillStyle(0x000000, 0.3);
    this.playerShadow.fillEllipse(this.player.x + 3, this.player.y + 5, 20, 10);
  }

  handleFiring() {
    if (this.input.activePointer.isDown && !this.scorestreakSystem.bombSelectMode) {
      this.weaponSystem.tryFire(this.player.x, this.player.y, this.player.rotation);
    }
  }

  takeDamage(amount) {
    if (this.playerDead) return;
    const dmg = this.playerArmored ? amount * 0.5 : amount;
    this.playerHealth = Math.max(0, this.playerHealth - dmg);
    this.cameras.main.shake(150, 0.012);
    this.uiSystem.flashDamage();
    if (this.playerHealth <= 0) this.playerDie();
  }

  healPlayer(amount) {
    this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
  }

  playerDie() {
    this.playerDead = true;
    this.player.setTint(0x880000);
    this.scorestreakSystem.onDeath();
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        won: false,
        kills: this.kills,
        soldier: this.soldierData
      });
    });
  }

  onBotKilled(bot) {
    this.kills++;
    this.scorestreakSystem.onKill();
    this.weaponSystem.dropWeapon(bot.x, bot.y, bot.weapon);

    // 100 coins per kill
    SaveSystem.addCoins(100);
    this.uiSystem.showKillFeed(`+100 COINS  |  ELIMINATED: BOT_${String(bot.botId).padStart(2,'0')}`);
    this.fetchCommentary(this.kills, bot.weapon ? bot.weapon.name : 'unknown');

    // Win at 10 kills
    if (this.kills >= 10) {
      this.playerWin();
    }
  }

  playerWin() {
    if (this.playerDead) return;
    this.playerDead = true;
    const newSave = SaveSystem.addWin();
    const totalCoinsEarned = this.kills * 100; // already saved per-kill
    this.time.delayedCall(800, () => {
      this.scene.start('GameOverScene', {
        won: true,
        kills: this.kills,
        soldier: this.soldierData,
        coinsEarned: totalCoinsEarned,
        totalCoins: newSave.coins
      });
    });
  }

  async fetchCommentary(killCount, weapon) {
    try {
      const resp = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killCount, weapon })
      });
      const data = await resp.json();
      if (data.text) {
        this.uiSystem.showKillFeed(`\uD83C\uDFA4 ${data.text}`);
        this.playVoice(data.text);
      }
    } catch (e) { /* silent fail */ }
  }

  async playVoice(text) {
    try {
      const resp = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(() => {});
    } catch (e) { /* silent fail */ }
  }
}
