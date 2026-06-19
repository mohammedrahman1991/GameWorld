class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(data) {
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    var self   = this;
    var winner = data.winner;

    // Track lifetime wins
    var _sv; try { _sv = JSON.parse(localStorage.getItem('wb_save_bball')) || {}; } catch(e) { _sv = {}; }
    if (!_sv.winsCurry) _sv.winsCurry = 0;
    if (!_sv.winsEdwards) _sv.winsEdwards = 0;
    if (winner === 'curry') _sv.winsCurry++; else _sv.winsEdwards++;
    try { localStorage.setItem('wb_save_bball', JSON.stringify(_sv)); } catch(e) {}

    var g = this.add.graphics();
    g.fillStyle(winner === 'curry' ? 0x1d428a : 0x8b0000, 0.94);
    g.fillRect(0, 0, W, H);

    // Winner
    this.add.text(W / 2, H * 0.22,
      winner === 'curry' ? 'CHEF WINS!' : 'ANT-MAN WINS!', {
      fontSize: '66px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Impact, Arial Black, sans-serif',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    // Score
    this.add.text(W / 2, H * 0.44,
      data.curryScore + '  \u2014  ' + data.edwardsScore, {
      fontSize: '52px', color: '#FFC72C',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2 - 80, H * 0.56, 'CHEF',   { fontSize: '13px', color: '#aaaaaa' }).setOrigin(0.5);
    this.add.text(W / 2 + 80, H * 0.56, 'ANT-MAN', { fontSize: '13px', color: '#aaaaaa' }).setOrigin(0.5);

    if (_sv.winsCurry + _sv.winsEdwards > 1) {
      this.add.text(W / 2, H * 0.63, 'All-time: Chef ' + _sv.winsCurry + ' – Ant-Man ' + _sv.winsEdwards, {
        fontSize: '13px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Play Again
    var btn = this.add.text(W / 2, H * 0.73, '  PLAY AGAIN  ', {
      fontSize: '32px', color: '#000000', backgroundColor: '#FFC72C',
      padding: { x: 22, y: 14 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  function() { btn.setStyle({ color: '#1d428a' }); });
    btn.on('pointerout',   function() { btn.setStyle({ color: '#000000' }); });
    btn.on('pointerdown',  function() { self.scene.start('GameScene'); });
    this.input.keyboard.once('keydown-ENTER', function() { self.scene.start('GameScene'); });

    this.add.text(W / 2, H * 0.88, 'Press ENTER or click to play again', {
      fontSize: '13px', color: '#aaaaaa'
    }).setOrigin(0.5);

    // Share button
    var winnerName = winner === 'curry' ? 'Chef Curry' : 'Ant-Man';
    var shareBtn = document.getElementById('wb-noahs-share') || (function(){
      var b = document.createElement('button');
      b.id = 'wb-noahs-share';
      b.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 32px;background:linear-gradient(135deg,#f97316,#fbbf24);border:none;border-radius:12px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;z-index:999;';
      b.textContent = '⬆ Share Result';
      document.body.appendChild(b);
      return b;
    })();
    shareBtn.style.display = 'block';
    shareBtn.onclick = function() {
      if(window.WackyShare) WackyShare.show("Noah's Game", winnerName + ' wins ' + data.curryScore + '-' + data.edwardsScore + " in Noah's Basketball Game!", 'https://wackybrains.com/Noah%27s%20Game/');
    };
  }
}
