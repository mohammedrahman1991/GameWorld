class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const W = CFG.WIDTH, H = CFG.HEIGHT;
    const g = this.add.graphics();

    // ── Sky + stands background ──────────────────────────────────
    g.fillGradientStyle(0x1a3a6e, 0x1a3a6e, 0x0d1f3c, 0x0d1f3c, 1);
    g.fillRect(0, 0, W, H);

    // Stadium stands hint
    g.fillStyle(0x2a2a4a, 1);
    g.fillRect(0, 0, W, 120);
    for (let i = 0; i < 30; i++) {
      const cx = 20 + i * 32;
      g.fillStyle(Phaser.Display.Color.GetColor(
        40 + Math.floor(Math.random()*30),
        40 + Math.floor(Math.random()*30),
        80 + Math.floor(Math.random()*40)
      ), 1);
      g.fillCircle(cx, 60 + Math.random() * 40, 8 + Math.random() * 6);
    }

    // ── Field preview ────────────────────────────────────────────
    g.fillStyle(0x2d8a2d, 1);
    g.fillRect(80, 200, W - 160, H - 260);
    // Field stripes
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? 0x2d8a2d : 0x349e34, 1);
      g.fillRect(80 + i * ((W-160)/6), 200, (W-160)/6, H - 260);
    }
    // Center line
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginPath(); g.moveTo(W/2, 200); g.lineTo(W/2, H - 60); g.strokePath();
    // Center circle
    g.strokeCircle(W/2, (200 + H-60)/2, 50);

    // ── Title ────────────────────────────────────────────────────
    this.add.text(W / 2, 80, '1 v 1  FUTBOL', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize:   '64px',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W / 2, 148, 'MESSAI  vs  RONALDA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize:   '22px',
      color:      '#ffffff',
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // ── Player badges ────────────────────────────────────────────
    // Messai (left)
    this._badge(g, 170, 330, 0x1a4a96, 'MESSAI', '#10', 'Argentina');
    // Ronalda (right)
    this._badge(g, W - 170, 330, 0xcc0000, 'RONALDA', '#7', 'Portugal');

    // ── Controls legend ──────────────────────────────────────────
    this.add.text(170, 420, 'WASD = Move\nG = Kick  T = Sprint\nF = Fake', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#aaddff',
      align:      'center',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(W - 170, 420, '← → ↑ ↓ = Move\n/ = Kick  . = Sprint\n, = Fake', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#ffaaaa',
      align:      'center',
    }).setOrigin(0.5).setDepth(10);

    // ── Play button ──────────────────────────────────────────────
    const btn = this.add.text(W / 2, 475, '▶  KICK OFF', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize:   '32px',
      color:      '#FFD700',
      stroke:     '#000',
      strokeThickness: 4,
      backgroundColor: '#1a1a1a',
      padding:    { x: 22, y: 10 },
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#FFD700'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    // Also start on ENTER / SPACE
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));

    // Pulse animation on button
    this.tweens.add({
      targets:  btn,
      scaleX:   1.04,
      scaleY:   1.04,
      duration: 700,
      yoyo:     true,
      repeat:   -1,
    });

    this.add.text(W / 2, H - 12, 'First to 5 Goals Wins  ·  3 Minute Match', {
      fontFamily: 'monospace',
      fontSize:   '12px',
      color:      '#667788',
    }).setOrigin(0.5).setDepth(10);
  }

  _badge(g, x, y, color, name, num, nat) {
    g.fillStyle(color, 0.9);
    g.fillRoundedRect(x - 80, y - 55, 160, 110, 12);
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeRoundedRect(x - 80, y - 55, 160, 110, 12);

    this.add.text(x, y - 28, name, {
      fontFamily: 'Impact, Arial Black',
      fontSize:   '26px',
      color:      '#ffffff',
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(x, y + 5, num, {
      fontFamily: 'Impact',
      fontSize:   '22px',
      color:      '#FFD700',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(x, y + 30, nat.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize:   '12px',
      color:      '#cccccc',
    }).setOrigin(0.5).setDepth(10);
  }
}
