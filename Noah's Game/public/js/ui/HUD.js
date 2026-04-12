class HUD {
  constructor(scene) {
    this.scene    = scene;
    this._elapsed = 0;
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    // Top bar
    var top = scene.add.graphics().setDepth(800);
    top.fillStyle(0x000000, 0.84); top.fillRect(0, 0, W, 48);
    top.lineStyle(2, 0xFFC72C);    top.strokeRect(0, 46, W, 2);

    // Curry badge
    var cb = scene.add.graphics().setDepth(801);
    cb.fillStyle(0x1d428a); cb.fillCircle(26, 24, 18);
    cb.fillStyle(0xFFC72C); cb.fillCircle(26, 24, 10);
    scene.add.text(26, 24, '30', { fontSize: '9px', color: '#1d428a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(802);
    scene.add.text(50, 8, 'CURRY', { fontSize: '9px', color: '#FFC72C', fontStyle: 'bold' }).setDepth(801);
    this.curryScoreText = scene.add.text(50, 20, '0', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setDepth(801);

    // Edwards badge
    var eb = scene.add.graphics().setDepth(801);
    eb.fillStyle(0xc8102e); eb.fillCircle(W - 26, 24, 18);
    eb.fillStyle(0xffffff); eb.fillCircle(W - 26, 24, 10);
    scene.add.text(W - 26, 24, '5', { fontSize: '9px', color: '#c8102e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(802);
    scene.add.text(W - 52, 8, 'ANT-MAN', { fontSize: '9px', color: '#ef5350', fontStyle: 'bold' }).setDepth(801);
    this.edwardsScoreText = scene.add.text(W - 52, 20, '0', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setDepth(801);

    // Center
    scene.add.text(W / 2, 7, "NOAH'S HOUSE", { fontSize: '10px', color: '#aaaaaa', fontStyle: 'bold' }).setOrigin(0.5).setDepth(801);
    this.timerText     = scene.add.text(W / 2, 18, '0:00',   { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(801);
    this.shotClockText = scene.add.text(W / 2, 36, 'SHOT: 24', { fontSize: '10px', color: '#FFC72C', fontStyle: 'bold' }).setOrigin(0.5).setDepth(801);

    // Bottom controls bar
    var bot = scene.add.graphics().setDepth(800);
    bot.fillStyle(0x000000, 0.90); bot.fillRect(0, H - 26, W, 26);
    bot.lineStyle(1, 0x333333);    bot.strokeRect(0, H - 26, W, 1);

    scene.add.text(8, H - 13,
      'P1 CURRY:  WASD=move   G=shoot   T=dribble   F=pass   R=pump-fake',
      { fontSize: '9px', color: '#FFC72C', fontStyle: 'bold' }
    ).setDepth(801).setOrigin(0, 0.5);

    scene.add.text(W - 8, H - 13,
      'P2 ANT-MAN:  Arrows=move   /=shoot   ,=dribble   .=pass   M=pump-fake',
      { fontSize: '9px', color: '#ef5350', fontStyle: 'bold' }
    ).setDepth(801).setOrigin(1, 0.5);
  }

  updateScores(curry, edwards) {
    this.curryScoreText.setText(String(curry));
    this.edwardsScoreText.setText(String(edwards));
  }

  update(delta, shotClockMs) {
    this._elapsed += delta;
    var s = Math.floor(this._elapsed / 1000);
    this.timerText.setText(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
    var sc = Math.max(0, Math.ceil(shotClockMs / 1000));
    this.shotClockText.setText('SHOT: ' + sc);
    this.shotClockText.setColor(sc <= 5 ? '#ff4444' : '#FFC72C');
  }
}
