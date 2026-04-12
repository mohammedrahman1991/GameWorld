// game/entities/Fighter.js
import { calcDamage, updateSpecialMeter, applyKnockback } from '../systems/CombatSystem.js';

export class Fighter {
  constructor(scene, x, y, config, playerIndex, voiceSystem) {
    this.scene = scene;
    this.config = config;
    this.playerIndex = playerIndex;
    this.voiceSystem = voiceSystem;

    this.hp = 100;
    this.specialMeter = 0;
    this.isBlocking = false;
    this.isAttacking = false;
    this.isStunned = false;
    this.facingRight = playerIndex === 0;

    this._attackCooldown = 0;
    this._throwCooldown = 0;
    this._specialCooldown = 0;
    this._blockCount = 0;      // consecutive blocks — guard break mechanic
    this._blockResetTimer = null;
    this._vx = 0;

    // Invisible physics body — Zone has no texture so no origin/offset confusion
    this.sprite = scene.add.zone(x, y - 45, 54, 90);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setMaxVelocityX(config.speed);

    // Visual container
    this.container = scene.add.container(x, y - 45);
    this._buildCharacterVisual();

    // Name label
    this.label = scene.add.text(x, y - 115, config.name.toUpperCase(), {
      fontSize: '13px', fontFamily: 'Impact, sans-serif',
      color: config.cssColor, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

  }

  _buildCharacterVisual() {
    const color = this.config.color;
    const g = this.scene.add.graphics();

    // Striped tail
    g.fillStyle(0xb5b5b5); g.fillEllipse(-34, 14, 20, 62);
    g.fillStyle(0x2a2a2a);
    [-8,-2,4,10,16].forEach(dy => g.fillRect(-42, dy, 16, 5));

    // Body
    g.fillStyle(color); g.fillRoundedRect(-22, -12, 44, 58, 10);

    // Chest fluff
    g.fillStyle(0xffffff, 0.4); g.fillEllipse(0, 6, 22, 28);

    // Belt
    g.fillStyle(0x111111); g.fillRect(-22, 20, 44, 7);
    g.fillStyle(0xffd700); g.fillRoundedRect(-6, 18, 12, 11, 3);

    // Head
    g.fillStyle(0xc8c8c8); g.fillCircle(0, -34, 24);

    // Ears (floppy)
    g.fillStyle(0x999999);
    g.fillEllipse(-18, -56, 18, 22);
    g.fillEllipse(18, -56, 18, 22);
    g.fillStyle(0xff9aaa, 0.7);
    g.fillEllipse(-18, -56, 10, 14);
    g.fillEllipse(18, -56, 10, 14);

    // Eye mask
    g.fillStyle(0x1a1a1a);
    g.fillEllipse(-9, -36, 20, 13);
    g.fillEllipse(9, -36, 20, 13);
    g.fillRect(-3, -39, 6, 6); // bridge

    // Big goofy eyes
    g.fillStyle(0xffffff);
    g.fillCircle(-9, -36, 8);
    g.fillCircle(9, -36, 8);
    g.fillStyle(0x111111);
    g.fillCircle(-8, -36, 4);
    g.fillCircle(10, -36, 4);
    // Shine
    g.fillStyle(0xffffff);
    g.fillCircle(-6, -38, 2);
    g.fillCircle(12, -38, 2);

    // Big goofy grin + teeth
    g.fillStyle(0x333333);
    g.fillEllipse(0, -22, 20, 12);
    g.fillStyle(0xffffff);
    g.fillRect(-7, -26, 6, 6); g.fillRect(1, -26, 6, 6); // two buck teeth

    // Nose
    g.fillStyle(0x555555); g.fillCircle(0, -28, 4);

    // Paws
    g.fillStyle(0x999999);
    g.fillCircle(-26, 6, 8); g.fillCircle(26, 6, 8);
    g.fillStyle(0x555555);
    [-30,-26,-22].forEach(cx => g.fillRect(cx, 12, 3, 5));
    [22,26,30].forEach(cx => g.fillRect(cx, 12, 3, 5));

    // Feet
    g.fillStyle(0x999999);
    g.fillEllipse(-12, 44, 22, 12); g.fillEllipse(12, 44, 22, 12);

    this.container.add(g);
    this._graphics = g;

    // Eyebrow for expression
    this._brow = this.scene.add.graphics();
    this.container.add(this._brow);
    this._drawBrow('idle');
  }

  _drawBrow(state) {
    if (!this._brow) return;
    this._brow.clear();
    this._brow.lineStyle(3, 0x222222);
    if (state === 'angry') {
      this._brow.strokeRect(-18, -46, 12, 1); // angled inward
      this._brow.strokeRect(6, -46, 12, 1);
    } else if (state === 'scared') {
      this._brow.strokeRect(-18, -48, 12, 1);
      this._brow.strokeRect(6, -48, 12, 1);
    }
    // idle = no visible brows
  }

  get x() { return this.sprite.body ? this.sprite.body.center.x : this.sprite.x; }
  get y() { return this.sprite.body ? this.sprite.body.center.y : this.sprite.y; }

  // ── Movement ────────────────────────────────────────────────────────────

  moveLeft() {
    if (this.isStunned || this.isAttacking) return;
    this._vx = -this.config.speed;
    this.facingRight = false;
    this.container.setScaleX(-1);
    this._drawBrow('idle');
  }

  moveRight() {
    if (this.isStunned || this.isAttacking) return;
    this._vx = this.config.speed;
    this.facingRight = true;
    this.container.setScaleX(1);
    this._drawBrow('idle');
  }

  stopHorizontal() {
    this._vx = 0;
  }

  jump() {
    if (this.isStunned) return;
    if (this.sprite.body.blocked.down) {
      this.sprite.body.setVelocityY(this.config.jumpVelocity);
      this._drawBrow('scared');
    }
  }

  setBlocking(active) {
    if (this.isStunned || this.isAttacking) { this.isBlocking = false; return; }
    const wasBlocking = this.isBlocking;
    this.isBlocking = active;
    this.container.setAlpha(active ? 0.55 : 1);
    if (active) this._drawBrow('scared');
    else if (!wasBlocking) this._drawBrow('idle');
  }

  // ── Attacks ─────────────────────────────────────────────────────────────

  lightAttack(opponent) {
    if (this.isStunned || this._attackCooldown > 0) return;
    this._attackCooldown = 280;
    this.isAttacking = true;
    this._drawBrow('angry');
    this._punchAnim(false);
    this._performAttack(opponent, this.config.lightDamage, false);
    window.setTimeout(() => { this.isAttacking = false; this._drawBrow('idle'); }, 200);
  }

  throwWeapon(opponent) {
    if (this.isStunned || this._throwCooldown > 0) return;
    this._throwCooldown = 700;
    this.isAttacking = true;
    this._drawBrow('angry');
    this._doThrow(opponent);
    window.setTimeout(() => { this.isAttacking = false; this._drawBrow('idle'); }, 400);
  }

  // Subclasses override this
  _doThrow(opponent) {
    this._launchProjectile('💥', opponent, this.config.lightDamage * 2);
  }

  specialAttack(opponent) {
    if (this.isStunned || this.specialMeter < 100 || this._specialCooldown > 0) return;
    this._specialCooldown = 1000;
    this.specialMeter = 0;
    this.isAttacking = true;
    this._drawBrow('angry');
    this.voiceSystem.speak(this.config.voiceId, this.config.lines.special);
    this._doSpecial(opponent);
    window.setTimeout(() => { this.isAttacking = false; this._drawBrow('idle'); }, 500);
    if (this.scene.events) this.scene.events.emit('specialChanged', this.playerIndex, 0);
  }

  _doSpecial(opponent) {
    this._performAttack(opponent, this.config.specialDamage, true);
  }

  // ── Projectile launcher ──────────────────────────────────────────────────

  _launchProjectile(emoji, opponent, damage, size = '24px', speed = 480) {
    const dir = this.facingRight ? 1 : -1;
    const proj = this.scene.add.text(this.x + dir * 35, this.y - 20, emoji, {
      fontSize: size,
    }).setOrigin(0.5);
    this.scene.physics.add.existing(proj);
    proj.body.setVelocityX(dir * speed);
    proj.body.setAllowGravity(false);

    // Spin
    this.scene.tweens.add({ targets: proj, angle: dir * 720, duration: 800 });

    let hit = false;
    const check = setInterval(() => {
      if (hit || !proj.active) return;
      if (Math.abs(proj.x - opponent.x) < 65 && Math.abs(proj.y - opponent.y) < 55) {
        hit = true;
        opponent.takeDamage(damage, this.playerIndex, true);
        this.scene.add.text(proj.x, proj.y - 20, '💥', { fontSize: '28px' }).setOrigin(0.5);
        proj.destroy(); clearInterval(check);
      }
    }, 40);
    window.setTimeout(() => { if (proj.active) proj.destroy(); clearInterval(check); }, 1600);
  }

  // ── Core combat ──────────────────────────────────────────────────────────

  _performAttack(opponent, baseDamage, causesKnockback) {
    if (!this._inRange(opponent)) return;
    const wasBlocking = opponent.isBlocking;
    const damage = calcDamage(baseDamage, wasBlocking);

    if (wasBlocking) {
      opponent._blockCount = (opponent._blockCount || 0) + 1;
      // Guard break after 3 consecutive blocks
      if (opponent._blockCount >= 3) {
        opponent._blockCount = 0;
        this._triggerGuardBreak(opponent);
        return;
      }
    } else {
      opponent._blockCount = 0;
    }

    opponent.takeDamage(damage, this.playerIndex, causesKnockback);
    this.specialMeter = updateSpecialMeter(this.specialMeter, damage, 0);
    if (this.scene.events) this.scene.events.emit('specialChanged', this.playerIndex, this.specialMeter);

    this._punchAnim(causesKnockback);
  }

  _triggerGuardBreak(opponent) {
    // Show GUARD BREAK text
    const txt = this.scene.add.text(opponent.x, opponent.y - 90, '🛡️ GUARD BREAK!', {
      fontSize: '20px', fontFamily: 'Impact, sans-serif',
      color: '#facc15', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 50, alpha: 0, duration: 1200,
      onComplete: () => txt.destroy(),
    });
    opponent.isBlocking = false;
    opponent.takeDamage(15, this.playerIndex, true);
    opponent.stun(1000);
  }

  takeDamage(amount, attackerIndex, causesKnockback) {
    this.hp = Math.max(0, this.hp - amount);
    this.specialMeter = updateSpecialMeter(this.specialMeter, 0, amount);
    this._drawBrow('scared');

    this._graphics.setAlpha(0.25);
    window.setTimeout(() => {
      if (this._graphics?.active) this._graphics.setAlpha(1);
      this._drawBrow('idle');
    }, 110);

    // Shake
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + (attackerIndex === 0 ? 10 : -10),
      duration: 55, yoyo: true,
    });

    if (amount >= this.config.heavyDamage) {
      this.voiceSystem.speak(this.config.voiceId, this.config.lines.hit);
      if (causesKnockback) this._applyKnockback(attackerIndex);
    }

    if (this.scene.events) {
      this.scene.events.emit('hpChanged', this.playerIndex, this.hp);
      this.scene.events.emit('specialChanged', this.playerIndex, this.specialMeter);
    }
  }

  stun(durationMs) {
    this.isStunned = true;
    this.container.setAlpha(0.4);
    // Stars spinning above head
    const star = this.scene.add.text(this.x, this.y - 80, '⭐💫⭐', { fontSize: '18px' })
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: star, angle: 360, duration: durationMs, repeat: 0,
      onComplete: () => star.destroy(),
    });
    window.setTimeout(() => {
      if (this.container?.active) {
        this.isStunned = false;
        this.container.setAlpha(1);
        this.container.setAngle(0);
        this._drawBrow('idle');
      }
    }, durationMs);
  }

  _punchAnim(heavy) {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + (this.facingRight ? (heavy ? 22 : 12) : (heavy ? -22 : -12)),
      duration: heavy ? 110 : 75, yoyo: true,
    });
  }

  _applyKnockback(attackerIndex) {
    const { dx } = applyKnockback(attackerIndex);
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + dx * 35, 30, 870);
    this.sprite.body.position.x = this.sprite.x - 27;
    this.sprite.body.prev.x = this.sprite.body.position.x;
  }

  _inRange(opponent) {
    return Math.abs(this.x - opponent.x) < 115;
  }

  update(delta) {
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    if (this._throwCooldown > 0)  this._throwCooldown  -= delta;
    if (this._specialCooldown > 0) this._specialCooldown -= delta;

    // Apply horizontal movement directly — bypass physics velocity entirely
    const moving = this._vx !== 0;
    if (moving) {
      this.sprite.x = Phaser.Math.Clamp(
        this.sprite.x + this._vx * delta / 1000, 30, 870
      );
      // Keep physics body in sync so collider + blocked.down still work
      this.sprite.body.position.x = this.sprite.x - 27;
      this.sprite.body.prev.x     = this.sprite.body.position.x;
    }
    this._vx = 0;

    // Sync container from current position
    const cx = this.sprite.x;
    const cy = this.sprite.body ? this.sprite.body.center.y : this.sprite.y;
    this.container.setPosition(cx, cy);
    this.label.setPosition(cx, cy - 68);

    // Bobbing walk cycle
    if (moving && this.sprite.body?.blocked.down) {
      this.container.setScale(this.container.scaleX, 0.96 + Math.sin(Date.now() / 80) * 0.04);
    } else {
      this.container.setScaleY(1);
    }
  }

  destroy() {
    this.container.destroy();
    this.sprite.destroy();
    this.label.destroy();
  }
}
