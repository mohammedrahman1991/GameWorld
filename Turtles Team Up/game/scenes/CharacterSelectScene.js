// game/scenes/CharacterSelectScene.js
import { CHARACTERS, CHARACTER_ORDER } from '../../config.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  create() {
    this._selections = { p1: null, p2: null };
    this._overlay = null;
    this._buildOverlay();
  }

  _buildOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'char-select-overlay';
    this._overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(135deg,#0a0a1a,#1a0a2e);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;z-index:100;
      font-family:Impact,sans-serif;color:#fff;
    `;

    this._overlay.innerHTML = `
      <h1 style="font-size:46px;margin-bottom:4px;letter-spacing:4px;
        color:#a78bfa;text-shadow:3px 3px 0 #000;">
        SELECT YOUR RACCOON
      </h1>
      <p style="color:#6b7280;margin-bottom:32px;font-size:13px;font-family:monospace;">
        Player 1: WASD + G (light) / H (heavy) / T (special)
        &nbsp;&nbsp;|&nbsp;&nbsp;
        Player 2: ARROWS + L / ; / '
      </p>
      <div style="display:flex;gap:80px;align-items:flex-start;">
        ${this._playerPanel(1)}
        ${this._playerPanel(2)}
      </div>
      <button id="fight-btn" disabled style="
        margin-top:40px;padding:16px 64px;font-size:32px;
        font-family:Impact,sans-serif;letter-spacing:4px;
        background:#4c1d95;color:#888;border:3px solid #4c1d95;
        border-radius:8px;cursor:not-allowed;
        text-shadow:2px 2px 0 #000;transition:all 0.2s;
      ">FIGHT!</button>
    `;

    document.body.appendChild(this._overlay);

    this._overlay.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        const player = parseInt(card.dataset.player);
        const charId = card.dataset.char;
        this._selectCharacter(player, charId);
      });
    });

    document.getElementById('fight-btn').addEventListener('click', () => {
      if (this._selections.p1 && this._selections.p2) {
        this._startFight();
      }
    });
  }

  _playerPanel(playerNum) {
    const color = playerNum === 1 ? '#3b82f6' : '#ef4444';
    // emoji avatar per character
    const avatarMap = { rico:'🦝', razz:'🦝', munchy:'🦝', dex:'🦝', boomer:'🦘', slicer:'🗡️' };
    const cards = CHARACTER_ORDER.map(id => {
      const ch = CHARACTERS[id];
      return `
        <div class="char-card" data-player="${playerNum}" data-char="${id}"
          style="
            width:100px;padding:12px 8px;border-radius:12px;
            border:3px solid #2a2a3e;cursor:pointer;text-align:center;
            background:#0d0d1e;transition:all 0.15s;user-select:none;
          "
        >
          <div style="font-size:36px;margin-bottom:6px;">${avatarMap[id] || '🦝'}</div>
          <div style="font-size:14px;color:${ch.cssColor};letter-spacing:1px;
            text-shadow:1px 1px 0 #000;">
            ${ch.name.toUpperCase()}
          </div>
          <div style="font-size:9px;color:#4b5563;margin-top:4px;
            font-family:sans-serif;line-height:1.3;">
            ${ch.specialName}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="text-align:center;">
        <div style="font-size:22px;color:${color};letter-spacing:3px;
          margin-bottom:16px;text-shadow:2px 2px 0 #000;">
          PLAYER ${playerNum}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;
          max-width:340px;justify-content:center;">
          ${cards}
        </div>
        <div id="p${playerNum}-confirm"
          style="margin-top:14px;font-size:15px;color:#374151;
          font-family:sans-serif;min-height:22px;">
          — not selected —
        </div>
      </div>
    `;
  }

  _selectCharacter(playerNum, charId) {
    const key = playerNum === 1 ? 'p1' : 'p2';
    this._selections[key] = charId;
    const ch = CHARACTERS[charId];

    // Clear old selection
    this._overlay.querySelectorAll(`.sel-p${playerNum}`).forEach(el => {
      el.classList.remove(`sel-p${playerNum}`);
      el.style.borderColor = '#2a2a3e';
      el.style.background = '#0d0d1e';
    });

    // Highlight new selection
    const card = this._overlay.querySelector(
      `.char-card[data-player="${playerNum}"][data-char="${charId}"]`
    );
    if (card) {
      card.classList.add(`sel-p${playerNum}`);
      card.style.borderColor = ch.cssColor;
      card.style.background = '#1a1a2e';
      card.style.transform = 'scale(1.05)';
    }

    const confirm = document.getElementById(`p${playerNum}-confirm`);
    if (confirm) {
      confirm.textContent = `✓ ${ch.name} selected`;
      confirm.style.color = ch.cssColor;
    }

    // Enable FIGHT! button when both ready
    if (this._selections.p1 && this._selections.p2) {
      const btn = document.getElementById('fight-btn');
      if (btn) {
        btn.disabled = false;
        btn.style.background = '#7c3aed';
        btn.style.color = '#fff';
        btn.style.borderColor = '#a78bfa';
        btn.style.cursor = 'pointer';
      }
    }
  }

  _startFight() {
    if (this._overlay && document.body.contains(this._overlay)) {
      document.body.removeChild(this._overlay);
    }
    this._overlay = null;
    this.scene.start('Fight', {
      p1CharId: this._selections.p1,
      p2CharId: this._selections.p2,
    });
  }

  shutdown() {
    if (this._overlay && document.body.contains(this._overlay)) {
      document.body.removeChild(this._overlay);
      this._overlay = null;
    }
  }
}
