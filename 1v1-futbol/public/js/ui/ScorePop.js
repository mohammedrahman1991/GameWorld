class ScorePop {
  constructor(scene) {
    this.scene = scene;
    this._pops = [];
  }

  showGoal(x, y, scorer) {
    // "GOAL!" floating text
    const txt = this.scene.add.text(x, y, 'GOOOAL!', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize:   '42px',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setDepth(950).setAlpha(0);

    this.scene.tweens.add({
      targets:  txt,
      y:        y - 80,
      alpha:    { from: 1, to: 0 },
      scale:    { from: 0.5, to: 1.4 },
      duration: 1200,
      ease:     'Power2',
      onComplete: () => txt.destroy(),
    });

    // White screen flash
    const flash = this.scene.add.rectangle(
      CFG.WIDTH / 2, CFG.HEIGHT / 2, CFG.WIDTH, CFG.HEIGHT, 0xffffff
    ).setDepth(940).setAlpha(0.22);
    this.scene.tweens.add({
      targets:  flash,
      alpha:    0,
      duration: 220,
      onComplete: () => flash.destroy(),
    });

    // Scatter stars
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const sx = x + Math.cos(angle) * (30 + Math.random() * 40);
      const sy = y + Math.sin(angle) * (30 + Math.random() * 40);
      const star = this.scene.add.text(sx, sy, '★', {
        fontSize: (14 + Math.random() * 14) + 'px',
        color:    '#FFD700',
      }).setOrigin(0.5).setDepth(945);
      this.scene.tweens.add({
        targets:  star,
        y:        sy - 60,
        alpha:    0,
        duration: 900 + Math.random() * 400,
        onComplete: () => star.destroy(),
      });
    }
  }

  showMiss(x, y) {
    const msgs = ['Off the post!', 'Just wide!', 'Over the bar!'];
    const msg  = msgs[Math.floor(Math.random() * msgs.length)];
    const txt  = this.scene.add.text(x, y - 20, msg, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize:   '20px',
      color:      '#ff6666',
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(950);
    this.scene.tweens.add({
      targets:  txt,
      y:        y - 70,
      alpha:    0,
      duration: 900,
      onComplete: () => txt.destroy(),
    });
  }

  showTackle(x, y) {
    const txt = this.scene.add.text(x, y - 20, 'TACKLE!', {
      fontFamily: 'Arial Black',
      fontSize:   '22px',
      color:      '#ff9900',
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(950);
    this.scene.tweens.add({
      targets:  txt,
      y:        y - 60,
      alpha:    0,
      duration: 700,
      onComplete: () => txt.destroy(),
    });
  }
}
