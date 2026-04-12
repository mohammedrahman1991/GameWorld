class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    this.generateTextures();
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Roblox-style blocky humanoid — 32x40 canvas, drawn top-down
    // drawCharacter(bodyColor, headColor, legColor, armColor, eyeColor, textureName)
    const drawCharacter = (body, head, legs, arms, eyes, name) => {
      g.clear();
      // Shadow
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(16, 38, 22, 6);
      // Legs (two blocks side by side)
      g.fillStyle(legs, 1);
      g.fillRect(9,  28, 6, 10);   // left leg
      g.fillRect(17, 28, 6, 10);   // right leg
      // Leg shading
      g.fillStyle(0x000000, 0.15);
      g.fillRect(14, 28, 2, 10);   // center gap
      // Torso
      g.fillStyle(body, 1);
      g.fillRect(8, 16, 16, 13);
      // Torso highlight stripe
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(8, 16, 16, 4);
      // Arms
      g.fillStyle(arms, 1);
      g.fillRect(2,  17, 6, 9);    // left arm
      g.fillRect(24, 17, 6, 9);    // right arm
      // Arm shading
      g.fillStyle(0x000000, 0.15);
      g.fillRect(2, 23, 6, 3);
      g.fillRect(24, 23, 6, 3);
      // Head (slightly lighter skin tone block)
      g.fillStyle(head, 1);
      g.fillRect(9, 4, 14, 13);
      // Head highlight
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(9, 4, 14, 3);
      // Eyes
      g.fillStyle(eyes, 1);
      g.fillRect(11, 8, 3, 3);
      g.fillRect(18, 8, 3, 3);
      // Eye shine
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(12, 8, 1, 1);
      g.fillRect(19, 8, 1, 1);
      // Mouth
      g.fillStyle(0x000000, 0.5);
      g.fillRect(13, 13, 6, 2);
      g.generateTexture(name, 32, 40);
    };

    drawCharacter(0x3366dd, 0xffcc99, 0x224488, 0x3366dd, 0x222244, 'player_ghost');
    drawCharacter(0xdd3333, 0xffcc99, 0x881111, 0xdd3333, 0x440000, 'player_reaper');
    drawCharacter(0x22bb55, 0xffcc99, 0x115522, 0x22bb55, 0x002200, 'player_tank');
    drawCharacter(0x8833dd, 0xffcc99, 0x441166, 0x8833dd, 0x220044, 'player_spectre');

    // Bot — red blocky enemy with darker shading
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(16, 38, 22, 6);
    g.fillStyle(0x881111, 1);
    g.fillRect(9, 28, 6, 10);
    g.fillRect(17, 28, 6, 10);
    g.fillStyle(0xff2222, 1);
    g.fillRect(8, 16, 16, 13);
    g.fillStyle(0xcc1111, 1);
    g.fillRect(2, 17, 6, 9);
    g.fillRect(24, 17, 6, 9);
    g.fillStyle(0xff6666, 1);
    g.fillRect(9, 4, 14, 13);
    g.fillStyle(0xffff00, 1);  // yellow eyes for bots
    g.fillRect(11, 8, 3, 3);
    g.fillRect(18, 8, 3, 3);
    g.fillStyle(0x000000, 0.5);
    g.fillRect(13, 13, 6, 2);
    g.generateTexture('bot', 32, 40);

    // Gun barrel
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 4);
    g.generateTexture('barrel', 12, 4);

    // Bullet
    g.clear();
    g.fillStyle(0xffff44, 1);
    g.fillRect(0, 0, 6, 3);
    g.generateTexture('bullet', 6, 3);

    // Flame particle
    g.clear();
    g.fillStyle(0xff4400, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('flame', 8, 8);

    // Chest
    g.clear();
    g.fillStyle(0x8B4513, 1);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0xffd700, 1);
    g.fillRect(2, 10, 24, 8);
    g.fillRect(10, 2, 8, 24);
    g.generateTexture('chest', 28, 28);

    // Weapon pickup
    g.clear();
    g.fillStyle(0x44ff88, 1);
    g.fillRect(0, 0, 20, 10);
    g.generateTexture('pickup', 20, 10);

    // Grenade
    g.clear();
    g.fillStyle(0x228822, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('grenade', 12, 12);

    // Smoke bomb
    g.clear();
    g.fillStyle(0x888888, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('smokebomb', 12, 12);

    // Explosion
    g.clear();
    g.fillStyle(0xff4400, 0.8);
    g.fillCircle(40, 40, 40);
    g.fillStyle(0xffaa00, 0.9);
    g.fillCircle(40, 40, 25);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(40, 40, 10);
    g.generateTexture('explosion', 80, 80);

    // Health pack
    g.clear();
    g.fillStyle(0x44ff88, 1);
    g.fillRect(0, 0, 20, 20);
    g.fillStyle(0xffffff, 1);
    g.fillRect(8, 3, 4, 14);
    g.fillRect(3, 8, 14, 4);
    g.generateTexture('healthpack', 20, 20);

    g.destroy();
  }

  create() {
    // Loading text
    const W = this.scale.width, H = this.scale.height;
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d1a, 1);
    bg.fillRect(0, 0, W, H);
    this.add.text(W / 2, H / 2, 'LOADING...', {
      fontSize: '32px', fontFamily: 'Impact', color: '#ff4444'
    }).setOrigin(0.5);

    this.time.delayedCall(100, () => this.scene.start('MainMenuScene'));
  }
}
