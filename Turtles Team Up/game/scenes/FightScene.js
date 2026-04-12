// game/scenes/FightScene.js
import { CHARACTERS, GAME, ELEVENLABS_API_KEY } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';
import { MusicSystem } from '../systems/MusicSystem.js';
import { createFighter } from '../entities/characters/index.js';
import { checkRoundEnd } from '../systems/CombatSystem.js';

let _music = null;

export class FightScene extends Phaser.Scene {
  constructor() { super('Fight'); }

  init(data) {
    this._p1CharId = data.p1CharId;
    this._p2CharId = data.p2CharId;
  }

  create() {
    this._voice      = new VoiceSystem(ELEVENLABS_API_KEY);
    this._roundWins  = [0, 0];
    this._roundActive = false;
    this._timeLeft   = GAME.roundTime;
    this._hud        = null;
    this._timerInterval = null;
    this._pendingTimeouts = []; // track all native timeouts for cleanup

    if (!_music) { _music = new MusicSystem(); _music.start(); }

    // Force keyboard focus to canvas so Phaser receives key events on Mac
    const canvas = this.game.canvas;
    canvas.setAttribute('tabindex', '-1');
    canvas.focus();

    this._buildBackground();
    this._buildGround();
    this._spawnFighters();
    this._buildHUD();
    this._buildKeys();
    this._listenHudEvents();
    this._buildDebug();

    this._startRound();
  }

  // ── Background ──────────────────────────────────────────────────────────

  _buildBackground() {
    const W = GAME.width, H = GAME.height;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x0d1b3e, 0x0d1b3e, 1);
    bg.fillRect(0, 0, W, H);

    for (let i = 0; i < 70; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, 220),
        Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.3, 1)
      );
    }
    this.add.circle(W - 80, 55, 35, 0xfef9c3, 0.85);
    this.add.circle(W - 63, 47, 32, 0x0a0a1a);

    const city = this.add.graphics();
    city.fillStyle(0x060610);
    [[0,280,80,200],[85,255,65,225],[155,240,90,240],[250,265,80,215],
     [335,235,75,245],[415,250,85,230],[505,230,90,250],[600,242,75,238],
     [680,256,82,224],[767,232,133,248]
    ].forEach(([x,y,w,h]) => city.fillRect(x,y,w,h));
    city.fillStyle(0xfbbf24, 0.45);
    for (let i = 0; i < 55; i++) {
      city.fillRect(
        Phaser.Math.Between(5, W-10), Phaser.Math.Between(245, GAME.groundY-30),
        Phaser.Math.Between(3,6), Phaser.Math.Between(3,5)
      );
    }
    this.add.rectangle(W/2, GAME.groundY - 2, W, 6, 0x334155);
  }

  // ── Ground ──────────────────────────────────────────────────────────────

  _buildGround() {
    const ground = this.add.rectangle(GAME.width/2, GAME.groundY+15, GAME.width, 30, 0x0f172a);
    this.physics.add.existing(ground, true);
    this._ground = ground;
  }

  // ── Fighters ────────────────────────────────────────────────────────────

  _spawnFighters() {
    const p1Config = CHARACTERS[this._p1CharId];
    const p2Config = CHARACTERS[this._p2CharId];
    this._p1 = createFighter(this._p1CharId, this, 220, GAME.groundY, p1Config, 0, this._voice);
    this._p2 = createFighter(this._p2CharId, this, GAME.width-220, GAME.groundY, p2Config, 1, this._voice);
    this.physics.add.collider(this._p1.sprite, this._ground);
    this.physics.add.collider(this._p2.sprite, this._ground);
    this.physics.add.collider(this._p1.sprite, this._p2.sprite);
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  _buildHUD() {
    const p1 = CHARACTERS[this._p1CharId];
    const p2 = CHARACTERS[this._p2CharId];
    this._hud = document.createElement('div');
    this._hud.id = 'hud';
    this._hud.innerHTML = `
      <div id="hud-top">
        <div class="player-hud p1">
          <span class="player-name" style="color:${p1.cssColor}">P1 · ${p1.name.toUpperCase()}</span>
          <div class="hp-bar-bg"><div class="hp-bar-fill" id="p1-hp-fill" style="width:100%"></div></div>
          <div class="special-bar-bg"><div class="special-bar-fill" id="p1-special-fill" style="width:0%"></div></div>
          <span class="special-ready" id="p1-special-ready">⚡ SPECIAL READY</span>
        </div>
        <div id="timer-box">
          <div id="timer">60</div>
          <div id="round-display">
            <span class="round-pip" id="p1-pip1"></span>
            <span class="round-pip" id="p1-pip2"></span>
            &nbsp;VS&nbsp;
            <span class="round-pip" id="p2-pip1"></span>
            <span class="round-pip" id="p2-pip2"></span>
          </div>
        </div>
        <div class="player-hud p2">
          <span class="player-name" style="color:${p2.cssColor}">P2 · ${p2.name.toUpperCase()}</span>
          <div class="hp-bar-bg"><div class="hp-bar-fill" id="p2-hp-fill" style="width:100%"></div></div>
          <div class="special-bar-bg"><div class="special-bar-fill" id="p2-special-fill" style="width:0%"></div></div>
          <span class="special-ready" id="p2-special-ready">⚡ SPECIAL READY</span>
        </div>
      </div>
    `;
    document.body.appendChild(this._hud);
  }

  // ── Keys — window-level listeners (work regardless of focus state) ──

  _buildKeys() {
    this._pressed = {};

    this._kbDown = (e) => {
      this._pressed[e.code] = true;
      if (!this._roundActive || e.repeat) return;
      if (e.code === 'KeyW')      this._p1.jump();
      if (e.code === 'KeyG')      this._p1.lightAttack(this._p2);
      if (e.code === 'KeyH')      this._p1.throwWeapon(this._p2);
      if (e.code === 'KeyT')      this._p1.specialAttack(this._p2);
      if (e.code === 'ArrowUp')   this._p2.jump();
      if (e.code === 'KeyL')      this._p2.lightAttack(this._p1);
      if (e.code === 'Semicolon') this._p2.throwWeapon(this._p1);
      if (e.code === 'Quote')     this._p2.specialAttack(this._p1);
    };
    this._kbUp = (e) => { delete this._pressed[e.code]; };

    window.addEventListener('keydown', this._kbDown, true); // capture phase
    window.addEventListener('keyup',   this._kbUp,   true);
  }

  _listenHudEvents() {
    this.events.on('hpChanged', (playerIndex, hp) => {
      const id = playerIndex === 0 ? 'p1' : 'p2';
      const fill = document.getElementById(`${id}-hp-fill`);
      if (!fill) return;
      fill.style.width = `${hp}%`;
      fill.className = 'hp-bar-fill' + (hp <= 20 ? ' danger' : hp <= 50 ? ' low' : '');
    });
    this.events.on('specialChanged', (playerIndex, meter) => {
      const id = playerIndex === 0 ? 'p1' : 'p2';
      const fill = document.getElementById(`${id}-special-fill`);
      const ready = document.getElementById(`${id}-special-ready`);
      if (fill) fill.style.width = `${meter}%`;
      if (ready) ready.classList.toggle('visible', meter >= 100);
    });
  }

  // ── Debug overlay ────────────────────────────────────────────────────────
  _buildDebug() {
    this._dbg = document.createElement('div');
    this._dbg.style.cssText = `
      position:fixed;bottom:8px;left:8px;
      background:rgba(0,0,0,0.75);color:#0f0;
      font:12px monospace;padding:6px 10px;
      border-radius:4px;z-index:9999;pointer-events:none;
      white-space:pre;line-height:1.5;
    `;
    document.body.appendChild(this._dbg);
  }

  // ── Round management ──────────────────────────────────────────────────────

  _startRound() {
    this._roundActive = false;
    this._timeLeft = GAME.roundTime;
    this._stopTimer();

    [this._p1, this._p2].forEach((f, i) => {
      f.hp = 100; f.specialMeter = 0;
      f.isStunned = false; f.isBlocking = false; f.isAttacking = false;
      f._attackCooldown = 0; f._throwCooldown = 0; f._specialCooldown = 0;
      f.sprite.setAlpha(0); f.container.setAlpha(1); f.container.setAngle(0);
      const spawnX = i === 0 ? 220 : GAME.width - 220;
      f.sprite.body.reset(spawnX, GAME.groundY - 45);
      f.sprite.body.setVelocity(0, 0);
    });

    ['p1','p2'].forEach(id => {
      const hp = document.getElementById(`${id}-hp-fill`);
      if (hp) { hp.style.width = '100%'; hp.className = 'hp-bar-fill'; }
      const sp = document.getElementById(`${id}-special-fill`);
      if (sp) sp.style.width = '0%';
      const ready = document.getElementById(`${id}-special-ready`);
      if (ready) ready.classList.remove('visible');
    });
    const timerEl = document.getElementById('timer');
    if (timerEl) { timerEl.textContent = '60'; timerEl.style.color = '#fff'; }

    if (this._p1CharId === 'munchy') this._p1.startPizzaTimer?.();
    if (this._p2CharId === 'munchy') this._p2.startPizzaTimer?.();

    // Show FIGHT! flash using native DOM — bypasses all Phaser internals
    this._domFlash('FIGHT!', () => {
      this._roundActive = true;
      this._voice.speak(CHARACTERS[this._p1CharId].voiceId, CHARACTERS[this._p1CharId].lines.intro);
      const t = window.setTimeout(() => {
        this._voice.speak(CHARACTERS[this._p2CharId].voiceId, CHARACTERS[this._p2CharId].lines.intro);
      }, 900);
      this._pendingTimeouts.push(t);
      this._startTimer();
    });
  }

  // DOM-based flash — 100% reliable, no Phaser dependencies
  _domFlash(text, onDone) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%) scale(1.3);
      font-size:92px;font-family:Impact,sans-serif;
      color:#fff;text-shadow:5px 5px 0 #000,-2px -2px 0 #000;
      pointer-events:none;z-index:9999;
      transition:opacity 0.25s,transform 0.25s;
      opacity:1;
    `;
    document.body.appendChild(el);
    const t = window.setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,-50%) scale(0.7)';
      const t2 = window.setTimeout(() => {
        if (document.body.contains(el)) document.body.removeChild(el);
        if (onDone) onDone();
      }, 260);
      this._pendingTimeouts.push(t2);
    }, 950);
    this._pendingTimeouts.push(t);
  }

  _startTimer() {
    this._stopTimer();
    this._timerInterval = setInterval(() => {
      if (!this._roundActive) return;
      this._timeLeft = Math.max(0, this._timeLeft - 1);
      const el = document.getElementById('timer');
      if (el) {
        el.textContent = this._timeLeft;
        el.style.color = this._timeLeft <= 10 ? '#ef4444' : '#fff';
      }
    }, 1000);
  }

  _stopTimer() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  _endRound(winnerIndex) {
    if (!this._roundActive) return;
    this._roundActive = false;
    this._stopTimer();

    this._p1.stopPizzaTimer?.(); this._p2.stopPizzaTimer?.();
    this._p1.stopHorizontal();   this._p2.stopHorizontal();

    this._roundWins[winnerIndex]++;
    this._updateRoundPips();

    const winCharId = winnerIndex === 0 ? this._p1CharId : this._p2CharId;
    this._voice.speak(CHARACTERS[winCharId].voiceId, CHARACTERS[winCharId].lines.win);

    const label = winnerIndex === 0 ? 'P1 WINS!' : 'P2 WINS!';
    this._domFlash(label, () => {
      if (this._roundWins[winnerIndex] >= GAME.winsNeeded) {
        this._endMatch(winnerIndex);
      } else {
        const roundNum = this._roundWins[0] + this._roundWins[1] + 1;
        this._domFlash(`ROUND ${roundNum}`, () => this._startRound());
      }
    });
  }

  _endMatch(winnerIndex) {
    const closeMatch = Math.abs(this._p1.hp - this._p2.hp) < 20;
    if (_music) { _music.stop(); _music = null; }
    this._removeHUD();
    this.scene.start('Win', {
      winnerIndex,
      p1CharId: this._p1CharId,
      p2CharId: this._p2CharId,
      closeMatch,
      roundWins: [...this._roundWins],
    });
  }

  _updateRoundPips() {
    [0,1].forEach(pi => {
      const prefix = pi === 0 ? 'p1' : 'p2';
      const pip1 = document.getElementById(`${prefix}-pip1`);
      const pip2 = document.getElementById(`${prefix}-pip2`);
      if (pip1) pip1.classList.toggle('won', this._roundWins[pi] >= 1);
      if (pip2) pip2.classList.toggle('won', this._roundWins[pi] >= 2);
    });
  }

  _removeHUD() {
    if (this._hud && document.body.contains(this._hud)) {
      document.body.removeChild(this._hud);
      this._hud = null;
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  update(_time, delta) {
    const p = this._pressed;

    // Debug overlay
    if (this._dbg) {
      const keys = Object.keys(p).filter(k => p[k]).join(', ') || 'none';
      const p1x  = this._p1?.sprite?.x?.toFixed(1) ?? '?';
      this._dbg.textContent = `ROUND: ${this._roundActive}\nKEYS: ${keys}\nP1 x:${p1x}`;
    }

    if (!this._roundActive) return;

    const p1OnLeft  = this._p1.x <= this._p2.x;
    const p1Blocking = p1OnLeft ? p['KeyA'] : p['KeyD'];
    const p2Blocking = p1OnLeft ? p['ArrowRight'] : p['ArrowLeft'];

    if (p['KeyA'])           this._p1.moveLeft();
    else if (p['KeyD'])      this._p1.moveRight();
    else                     this._p1.stopHorizontal();
    this._p1.setBlocking(p1Blocking);

    if (p['ArrowLeft'])      this._p2.moveLeft();
    else if (p['ArrowRight'])this._p2.moveRight();
    else                     this._p2.stopHorizontal();
    this._p2.setBlocking(p2Blocking);

    this._p1.update(delta);
    this._p2.update(delta);

    const winner = checkRoundEnd(this._p1.hp, this._p2.hp, this._timeLeft);
    if (winner !== null) this._endRound(winner);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  shutdown() {
    if (this._dbg && document.body.contains(this._dbg)) document.body.removeChild(this._dbg);
    this._dbg = null;
    this._stopTimer();
    this._pendingTimeouts.forEach(t => clearTimeout(t));
    this._pendingTimeouts = [];
    if (this._kbDown) window.removeEventListener('keydown', this._kbDown, true);
    if (this._kbUp)   window.removeEventListener('keyup',   this._kbUp,   true);
    this._pressed = {};
    this._removeHUD();
    document.querySelectorAll('div[style*="z-index:9999"]').forEach(el => el.remove());
    if (this._p1) { this._p1.stopPizzaTimer?.(); this._p1.destroy(); }
    if (this._p2) { this._p2.stopPizzaTimer?.(); this._p2.destroy(); }
  }
}
