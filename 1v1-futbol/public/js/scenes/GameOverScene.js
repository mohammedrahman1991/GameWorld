class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this._winner = data.winner;
    this._scores = data.scores;
  }

  create() {
    const W = CFG.WIDTH, H = CFG.HEIGHT;
    const g = this.add.graphics();

    // Background
    g.fillGradientStyle(0x0d1f3c, 0x0d1f3c, 0x050e1c, 0x050e1c, 1);
    g.fillRect(0, 0, W, H);

    // Field faint
    g.fillStyle(0x1a5a1a, 0.3);
    g.fillPoints([
      { x: 185, y: 135 }, { x: 775, y: 135 },
      { x: 895, y: 425 }, { x: 65,  y: 425 },
    ], true, true);

    // Center circle hint
    g.lineStyle(1, 0xffffff, 0.1);
    g.strokeCircle(W/2, H/2, 90);

    const isDraw = this._winner === 'draw';

    // Winner announcement
    let headText, headColor, subText;
    if (isDraw) {
      headText  = "IT'S A DRAW!";
      headColor = '#FFD700';
      subText   = 'What a match! Nobody wins this one.';
    } else {
      const name = this._winner === 'messai' ? 'MESSAI' : 'RONALDA';
      headText   = `${name} WINS!`;
      headColor  = this._winner === 'messai' ? '#aaddff' : '#ffaaaa';
      subText    = this._winner === 'messai'
        ? 'The little magician reigns supreme!'
        : 'Ronalda shows her class once again!';
    }

    this.add.text(W/2, 130, headText, {
      fontFamily: 'Impact, Arial Black',
      fontSize:   '68px',
      color:      headColor,
      stroke:     '#000',
      strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(W/2, 210, subText, {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '20px',
      color:      '#cccccc',
      fontStyle:  'italic',
    }).setOrigin(0.5);

    // Score display
    const scoreBox = this.add.graphics();
    scoreBox.fillStyle(0x000000, 0.55);
    scoreBox.fillRoundedRect(W/2 - 160, 245, 320, 80, 12);
    scoreBox.lineStyle(2, 0x555555, 1);
    scoreBox.strokeRoundedRect(W/2 - 160, 245, 320, 80, 12);

    this.add.text(W/2 - 70, 285, `${this._scores.messai}`, {
      fontFamily: 'Impact', fontSize: '52px', color: '#aaddff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W/2, 285, '-', {
      fontFamily: 'Impact', fontSize: '36px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(W/2 + 70, 285, `${this._scores.ronalda}`, {
      fontFamily: 'Impact', fontSize: '52px', color: '#ffaaaa',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W/2 - 70, 315, 'MESSAI', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#aaddff',
    }).setOrigin(0.5);
    this.add.text(W/2 + 70, 315, 'RONALDA', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0.5);

    // Buttons
    const playBtn = this.add.text(W/2 - 110, 370, '▶  PLAY AGAIN', {
      fontFamily: 'Impact', fontSize: '24px', color: '#FFD700',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#1a1a1a', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuBtn = this.add.text(W/2 + 110, 370, '⌂  MAIN MENU', {
      fontFamily: 'Impact', fontSize: '24px', color: '#aaaaaa',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#1a1a1a', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerover', () => playBtn.setColor('#ffffff'));
    playBtn.on('pointerout',  () => playBtn.setColor('#FFD700'));
    playBtn.on('pointerdown', () => this.scene.start('GameScene'));

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#aaaaaa'));
    menuBtn.on('pointerdown', () => this.scene.start('TitleScene'));

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ESCAPE', () => this.scene.start('TitleScene'));

    // Share button
    const _scores = this._scores;
    const _winner = this._winner;
    const _sb = document.getElementById('wb-futbol-share') || (()=>{
      const b=document.createElement('button'); b.id='wb-futbol-share';
      b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 32px;background:linear-gradient(135deg,#f97316,#fbbf24);border:none;border-radius:12px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;z-index:999;';
      b.textContent='⬆ Share Result'; document.body.appendChild(b); return b;
    })();
    _sb.style.display='block';
    _sb.onclick=()=>{ if(window.WackyShare){ const res = _winner==='draw'?`I drew ${_scores.messai}-${_scores.ronalda} in 1v1 Futbol!`: (_winner==='messai'?'Messai':'Ronalda')+` wins ${Math.max(_scores.messai,_scores.ronalda)}-${Math.min(_scores.messai,_scores.ronalda)} in 1v1 Futbol!`; WackyShare.show('1v1 Futbol', res, 'https://wackybrains.com/1v1-futbol/'); }};

    // Confetti if someone won
    if (!isDraw) this._confetti();
  }

  _confetti() {
    const colors = [0xFFD700, 0xff2244, 0x00aaff, 0x44dd44, 0xff6600, 0xcc44ff];
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * CFG.WIDTH;
      const conf = this.add.rectangle(x, -10, 8, 14, Phaser.Utils.Array.GetRandom(colors));
      this.tweens.add({
        targets:  conf,
        y:        CFG.HEIGHT + 20,
        x:        x + (Math.random() - 0.5) * 120,
        rotation: Math.random() * Math.PI * 4,
        duration: 1800 + Math.random() * 1400,
        delay:    Math.random() * 800,
        ease:     'Sine.easeIn',
        onComplete: () => conf.destroy(),
      });
    }
  }
}
