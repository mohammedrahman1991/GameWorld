// game/scenes/WinScene.js
import { CHARACTERS, SLICER, VOICE_IDS, ELEVENLABS_API_KEY } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';

export class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }

  init(data) {
    this._winnerIndex = data.winnerIndex;
    this._p1CharId    = data.p1CharId;
    this._p2CharId    = data.p2CharId;
    this._closeMatch  = data.closeMatch;
    this._roundWins   = data.roundWins;
  }

  create() {
    this._voice = new VoiceSystem(ELEVENLABS_API_KEY);
    this._btnOverlay = null;

    const W = this.scale.width;
    const H = this.scale.height;
    const winnerCharId = this._winnerIndex === 0 ? this._p1CharId : this._p2CharId;
    const loserCharId  = this._winnerIndex === 0 ? this._p2CharId : this._p1CharId;
    const winConfig    = CHARACTERS[winnerCharId];
    const playerLabel  = `PLAYER ${this._winnerIndex + 1}`;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, W, H);

    // Confetti particles
    for (let i = 0; i < 40; i++) {
      const confetti = this.add.rectangle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(-20, H),
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(4, 10),
        [0xfacc15, 0xa78bfa, winConfig.color, 0xef4444, 0x22c55e][i % 5]
      );
      this.tweens.add({
        targets: confetti,
        y: H + 20,
        x: confetti.x + Phaser.Math.Between(-60, 60),
        rotation: Phaser.Math.FloatBetween(0, Math.PI * 4),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1000),
        repeat: -1,
      });
    }

    // Winner banner
    this.add.text(W / 2, 70, `${playerLabel} WINS!`, {
      fontSize: '72px',
      fontFamily: 'Impact, sans-serif',
      color: winConfig.cssColor,
      stroke: '#000000',
      strokeThickness: 10,
    }).setOrigin(0.5);

    // Winner raccoon box
    const winnerBox = this.add.graphics();
    winnerBox.fillStyle(
      Phaser.Display.Color.HexStringToColor(winConfig.cssColor).color, 0.12
    );
    winnerBox.fillRoundedRect(W / 2 - 100, 120, 200, 190, 14);
    winnerBox.lineStyle(3, Phaser.Display.Color.HexStringToColor(winConfig.cssColor).color, 1);
    winnerBox.strokeRoundedRect(W / 2 - 100, 120, 200, 190, 14);

    const raccoonText = this.add.text(W / 2, 185, '🦝', {
      fontSize: '80px',
    }).setOrigin(0.5);

    // Bounce animation
    this.tweens.add({
      targets: raccoonText,
      y: raccoonText.y - 18,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 268, winConfig.name.toUpperCase(), {
      fontSize: '30px',
      fontFamily: 'Impact, sans-serif',
      color: winConfig.cssColor,
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 295, winConfig.specialName, {
      fontSize: '13px',
      fontFamily: 'sans-serif',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Loser raccoon (small, defeated)
    this.add.text(W / 2, 345, `${CHARACTERS[loserCharId].name} was defeated 💀`, {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Round score
    this.add.text(W / 2, 375, `${this._roundWins[0]}  —  ${this._roundWins[1]}`, {
      fontSize: '40px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Slicer taunt (close match only) + shurikan throw animation
    if (this._closeMatch) {
      const taunt = Phaser.Utils.Array.GetRandom(SLICER.tauntLines);

      const slicerBg = this.add.graphics();
      slicerBg.fillStyle(0x1a0000, 0.95);
      slicerBg.fillRoundedRect(W - 265, H - 120, 250, 100, 8);
      slicerBg.lineStyle(2, 0xef4444, 1);
      slicerBg.strokeRoundedRect(W - 265, H - 120, 250, 100, 8);

      // Slicer character (blade villain)
      this.add.text(W - 248, H - 95, '🗡️ SLICER', {
        fontSize: '14px', fontFamily: 'Impact, sans-serif',
        color: '#fca5a5', letterSpacing: 2,
      });

      this.add.text(W - 248, H - 72, `"${taunt}"`, {
        fontSize: '13px', fontFamily: 'Georgia, serif',
        color: '#e5e7eb',
        wordWrap: { width: 220 },
        lineSpacing: 4,
      });

      this._voice.speak(VOICE_IDS.slicer, taunt);
      this.time.delayedCall(700, () => {
        this._voice.speak(winConfig.voiceId, winConfig.lines.win);
      });

      // Slicer throws 3 big shurikans across the screen
      [400, 700, 1000].forEach(delay => {
        this.time.delayedCall(delay, () => {
          const shurikan = this.add.text(W + 20, Phaser.Math.Between(100, H - 100),
            '✴️', { fontSize: '36px' }).setOrigin(0.5);
          this.tweens.add({
            targets: shurikan,
            x: -40,
            angle: -720,
            duration: 900,
            ease: 'Linear',
            onComplete: () => shurikan.destroy(),
          });
        });
      });
    } else {
      this._voice.speak(winConfig.voiceId, winConfig.lines.win);
    }

    // Buttons overlay
    this._btnOverlay = document.createElement('div');
    this._btnOverlay.id = 'win-btns';
    this._btnOverlay.style.cssText = `
      position:fixed;bottom:36px;left:50%;transform:translateX(-50%);
      display:flex;gap:20px;z-index:50;
    `;
    this._btnOverlay.innerHTML = `
      <button id="play-again-btn" style="
        padding:14px 48px;font-size:22px;font-family:Impact,sans-serif;
        letter-spacing:3px;background:#7c3aed;color:#fff;
        border:none;border-radius:8px;cursor:pointer;
        text-shadow:2px 2px 0 #000;
      ">PLAY AGAIN</button>
      <button id="change-chars-btn" style="
        padding:14px 48px;font-size:22px;font-family:Impact,sans-serif;
        letter-spacing:3px;background:#0f172a;color:#94a3b8;
        border:2px solid #334155;border-radius:8px;cursor:pointer;
        text-shadow:1px 1px 0 #000;
      ">CHANGE CHARACTERS</button>
    `;
    document.body.appendChild(this._btnOverlay);

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this._cleanup();
      this.scene.start('Fight', {
        p1CharId: this._p1CharId,
        p2CharId: this._p2CharId,
      });
    });

    document.getElementById('change-chars-btn').addEventListener('click', () => {
      this._cleanup();
      this.scene.start('CharacterSelect');
    });
  }

  _cleanup() {
    if (this._btnOverlay && document.body.contains(this._btnOverlay)) {
      document.body.removeChild(this._btnOverlay);
      this._btnOverlay = null;
    }
  }

  shutdown() {
    this._cleanup();
  }
}
