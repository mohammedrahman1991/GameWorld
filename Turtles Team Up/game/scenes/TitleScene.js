// game/scenes/TitleScene.js
import { BOOMER, VOICE_IDS, ELEVENLABS_API_KEY } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this._voice = new VoiceSystem(ELEVENLABS_API_KEY);
    const W = this.scale.width;
    const H = this.scale.height;

    // Sky gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 80; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H * 0.6),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      );
    }

    // Moon
    this.add.circle(W - 120, 70, 45, 0xfef9c3, 0.9);
    this.add.circle(W - 100, 58, 42, 0x0a0a1a);

    // City silhouette
    const city = this.add.graphics();
    city.fillStyle(0x060610);
    [
      [0, 340, 80, 160], [85, 310, 65, 190], [155, 295, 95, 205],
      [255, 320, 85, 180], [345, 290, 75, 210], [425, 305, 85, 195],
      [515, 285, 95, 215], [615, 295, 75, 205], [695, 310, 85, 190],
      [785, 285, 115, 215],
    ].forEach(([x, y, w, h]) => city.fillRect(x, y, w, h));

    // Window lights
    city.fillStyle(0xfbbf24, 0.6);
    for (let i = 0; i < 40; i++) {
      city.fillRect(
        Phaser.Math.Between(10, W - 20),
        Phaser.Math.Between(300, H - 40),
        4, 4
      );
    }

    // Ground
    this.add.rectangle(W / 2, H - 10, W, 20, 0x1e293b);

    // Title text
    this.add.text(W / 2, 100, 'NINJA', {
      fontSize: '96px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(W / 2, 200, 'RACCOONS', {
      fontSize: '96px',
      fontFamily: 'Impact, sans-serif',
      color: '#a78bfa',
      stroke: '#000000',
      strokeThickness: 10,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(W / 2, 265, 'TEAM UP', {
      fontSize: '28px',
      fontFamily: 'Impact, sans-serif',
      color: '#facc15',
      stroke: '#000',
      strokeThickness: 5,
      letterSpacing: 12,
    }).setOrigin(0.5);

    // Master Boomer box
    const boomerBox = this.add.graphics();
    boomerBox.fillStyle(0x1a1a2e, 0.9);
    boomerBox.fillRoundedRect(W / 2 - 220, 300, 440, 80, 10);
    boomerBox.lineStyle(2, 0x6366f1, 1);
    boomerBox.strokeRoundedRect(W / 2 - 220, 300, 440, 80, 10);

    // Boomer kangaroo doing a big kick animation
    const boomerEmoji = this.add.text(W / 2 - 190, 340, '🦘', {
      fontSize: '42px',
    }).setOrigin(0, 0.5);

    // Big kick sequence: every 3 seconds Boomer does a kick
    const doKick = () => {
      // Kick forward
      this.tweens.add({
        targets: boomerEmoji,
        x: boomerEmoji.x + 30,
        scaleX: 1.4, scaleY: 0.8,
        duration: 120,
        yoyo: true,
        onComplete: () => {
          // Kick impact star
          const star = this.add.text(boomerEmoji.x + 55, boomerEmoji.y, '💥', {
            fontSize: '28px',
          }).setOrigin(0.5);
          this.tweens.add({
            targets: star, alpha: 0, scale: 2, duration: 400,
            onComplete: () => star.destroy(),
          });
        },
      });
    };

    // First kick after 1.5s then every 3s
    this.time.delayedCall(1500, doKick);
    this.time.addEvent({ delay: 3000, repeat: -1, callback: doKick });

    const wisdom = Phaser.Utils.Array.GetRandom(BOOMER.wisdomLines);
    this.add.text(W / 2 - 135, 340, `"${wisdom}"`, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#d1d5db',
      wordWrap: { width: 320 },
      align: 'left',
    }).setOrigin(0, 0.5);

    // Speak wisdom
    this._voice.speak(VOICE_IDS.boomer, wisdom);

    // Press any key prompt
    const prompt = this.add.text(W / 2, 430, 'PRESS ANY KEY TO START', {
      fontSize: '24px',
      fontFamily: 'Impact, sans-serif',
      color: '#facc15',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Controls hint
    this.add.text(W / 2, 468, 'P1: WASD + G/H/T  ·  P2: ARROWS + L/;/\'', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#4b5563',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown', () => {
      this.scene.start('CharacterSelect');
    });
  }
}
