class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = scene.physics.add.group();
    this.BOT_COUNT = 19;
    this.spawnBots();
    scene.weaponSystem.setEnemyGroup(this.bots);
  }

  spawnBots() {
    const MAP_W = this.scene.MAP_W, MAP_H = this.scene.MAP_H;
    const weaponKeys = Object.keys(WEAPONS);
    const rng = new Phaser.Math.RandomDataGenerator(['bots']);

    for (let i = 0; i < this.BOT_COUNT; i++) {
      let bx, by, attempts = 0;
      do {
        bx = Phaser.Math.Between(100, MAP_W - 100);
        by = Phaser.Math.Between(100, MAP_H - 100);
        attempts++;
      } while (Phaser.Math.Distance.Between(bx, by, MAP_W / 2, MAP_H / 2) < 500 && attempts < 20);

      const bot = this.bots.create(bx, by, 'bot');
      bot.setCollideWorldBounds(true);
      bot.setDepth(10);
      bot.body.setSize(20, 20).setOffset(6, 14);
      bot.botId = i + 1;
      bot.health = Phaser.Math.Between(60, 100);
      bot.maxHealth = bot.health;
      bot.state = 'PATROL';
      bot.targetX = bx + Phaser.Math.Between(-200, 200);
      bot.targetY = by + Phaser.Math.Between(-200, 200);
      bot.lastShot = 0;
      bot.stateTimer = 0;
      bot.alertTimer = 0;

      const wKey = weaponKeys[rng.integerInRange(0, weaponKeys.length - 1)];
      bot.weapon = { ...WEAPONS[wKey] };

      // Health bar
      bot.healthBar = this.scene.add.graphics().setDepth(12);

      // Name tag
      bot.nameTag = this.scene.add.text(bx, by - 22, `BOT_${String(i + 1).padStart(2, '0')}`, {
        fontSize: '9px', fontFamily: 'Courier New', color: '#ff8888'
      }).setOrigin(0.5).setDepth(12);

      // Barrel
      bot.barrel = this.scene.add.sprite(bx, by, 'barrel').setDepth(11).setOrigin(0, 0.5);
      bot.barrel.setScale(0.7);

      bot.takeDamage = (dmg) => this.botTakeDamage(bot, dmg);
    }
  }

  botTakeDamage(bot, dmg) {
    if (!bot.active) return;
    bot.health -= dmg;
    bot.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => { if (bot.active) bot.clearTint(); });
    if (bot.health <= 0) {
      this.killBot(bot);
    } else {
      // Alert: start chasing
      bot.state = 'CHASE';
      bot.stateTimer = 0;
    }
  }

  killBot(bot) {
    bot.setActive(false).setVisible(false);
    if (bot.healthBar) bot.healthBar.setVisible(false);
    if (bot.nameTag) bot.nameTag.setVisible(false);
    if (bot.barrel) bot.barrel.setVisible(false);
    if (bot.body) bot.body.enable = false;
    this.scene.onBotKilled(bot);
  }

  checkWinCondition() {
    const alive = this.bots.getChildren().filter(b => b.active).length;
    if (alive === 0) this.scene.playerWin();
  }

  update(time, delta) {
    const player = this.scene.player;
    const dt = delta / 1000;

    this.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      this.updateBotAI(bot, player, time, dt);
      this.drawBotHealthBar(bot);
      if (bot.nameTag) bot.nameTag.setPosition(bot.x, bot.y - 22);
      if (bot.barrel) {
        bot.barrel.setPosition(bot.x, bot.y);
        bot.barrel.setRotation(bot.rotation);
      }
    });
  }

  updateBotAI(bot, player, time, dt) {
    const distToPlayer = Phaser.Math.Distance.Between(bot.x, bot.y, player.x, player.y);
    bot.stateTimer += dt;

    // Ignore cloaked player
    const playerVisible = !this.scene.playerCloaked && this.scene.playerHealth > 0;

    // State machine
    if (playerVisible && distToPlayer < 600) {
      bot.state = distToPlayer < 300 ? 'ATTACK' : 'CHASE';
      bot.stateTimer = 0;
    } else if (bot.state !== 'PATROL' && bot.stateTimer > 5) {
      bot.state = 'PATROL';
      bot.stateTimer = 0;
      bot.targetX = Phaser.Math.Clamp(bot.x + Phaser.Math.Between(-300, 300), 50, this.scene.MAP_W - 50);
      bot.targetY = Phaser.Math.Clamp(bot.y + Phaser.Math.Between(-300, 300), 50, this.scene.MAP_H - 50);
    }

    const SPEED = 120;

    if (bot.state === 'PATROL') {
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, bot.targetX, bot.targetY);
      const d = Phaser.Math.Distance.Between(bot.x, bot.y, bot.targetX, bot.targetY);
      if (d > 20) {
        bot.setVelocity(Math.cos(angle) * SPEED, Math.sin(angle) * SPEED);
        bot.setRotation(angle);
      } else {
        bot.setVelocity(0, 0);
        // Pick new patrol point
        bot.targetX = Phaser.Math.Clamp(bot.x + Phaser.Math.Between(-250, 250), 50, this.scene.MAP_W - 50);
        bot.targetY = Phaser.Math.Clamp(bot.y + Phaser.Math.Between(-250, 250), 50, this.scene.MAP_H - 50);
      }

      // Shoot player even while patrolling if close enough
      if (playerVisible && distToPlayer < 450 && time - bot.lastShot > bot.weapon.fireRate * 2) {
        bot.lastShot = time;
        const angle2 = Phaser.Math.Angle.Between(bot.x, bot.y, player.x, player.y);
        this.scene.weaponSystem.fireBotBullet(bot.x, bot.y, angle2, bot.weapon);
        bot.setRotation(angle2);
      }

    } else if (bot.state === 'CHASE') {
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, player.x, player.y);
      bot.setVelocity(Math.cos(angle) * SPEED * 1.3, Math.sin(angle) * SPEED * 1.3);
      bot.setRotation(angle);

    } else if (bot.state === 'ATTACK') {
      bot.setVelocity(0, 0);
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, player.x, player.y);
      bot.setRotation(angle);

      if (playerVisible && time - bot.lastShot > bot.weapon.fireRate * 1.4) {
        bot.lastShot = time;
        this.scene.weaponSystem.fireBotBullet(bot.x, bot.y, angle, bot.weapon);
      }
    }

    // Zone damage to bots
    if (this.scene.zoneSystem.isOutside(bot.x, bot.y)) {
      bot.health -= 4 * dt;
      if (bot.health <= 0) this.killBot(bot);
    }
  }

  drawBotHealthBar(bot) {
    const bw = 28, bh = 4;
    const bx = bot.x - bw / 2, by = bot.y - 18;
    const pct = Math.max(0, bot.health / bot.maxHealth);
    bot.healthBar.clear();
    bot.healthBar.fillStyle(0x440000, 1);
    bot.healthBar.fillRect(bx, by, bw, bh);
    const barColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
    bot.healthBar.fillStyle(barColor, 1);
    bot.healthBar.fillRect(bx, by, bw * pct, bh);
  }
}
