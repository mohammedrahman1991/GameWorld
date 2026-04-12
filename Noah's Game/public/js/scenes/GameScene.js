class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    this._drawBackground();
    this._drawWalls();
    this._drawCourt();
    this._drawZoneArcs();
    this._drawHoops();
    this._drawFans();

    this.gameState = {
      curryScore:   0,
      edwardsScore: 0,
      possession:   'curry',
      shotClock:    GAME_CONFIG.SHOT_CLOCK_MS,
      gameOver:     false
    };

    this.curry   = new Curry(this, 300, 290);
    this.edwards = new Edwards(this, 660, 290);
    this.curry.hasBall = true;

    this.ball = new Ball(this, this.curry.x + 18, this.curry.y + 10);
    this.ball.owner = this.curry;

    this.shotMeter       = new ShotMeter(this);
    this._shootingPlayer = null;

    this.hud        = new HUD(this);
    this.scorePop   = new ScorePop(this);
    this.commentary = Commentary;
  }

  // ─── DRAWING ────────────────────────────────────────────────────────────────

  _drawBackground() {
    var g = this.add.graphics();
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    for (var i = 0; i < H * 0.5; i++) {
      var t  = i / (H * 0.5);
      var r  = Math.round(Phaser.Math.Linear(135, 255, t));
      var gr = Math.round(Phaser.Math.Linear(206, 230, t));
      var b  = Math.round(Phaser.Math.Linear(235, 180, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b));
      g.fillRect(0, i, W, 1);
    }

    g.fillStyle(0xfff176); g.fillCircle(820, 65, 38);
    g.fillStyle(0xf9ca24, 0.4); g.fillCircle(820, 65, 52);
    g.fillStyle(0x4fc3f7, 0.55); g.fillRect(0, H * 0.44, W, 18);
    g.fillStyle(0xc4a070); g.fillRect(0, H * 0.5, W, H * 0.5);
    g.fillStyle(0xd4b080, 0.5); g.fillRect(0, H * 0.5, W, 20);
  }

  _drawWalls() {
    var self = this;
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    var wallTop = H * 0.12, wallH = H * 0.42;

    var lg = this.add.graphics();
    lg.fillStyle(0x6d7f7f); lg.fillRect(0, wallTop, 78, wallH);
    lg.lineStyle(3, 0x444444); lg.strokeRect(0, wallTop, 78, wallH);

    [
      { text: 'NOAH',     x: 39, y: wallTop + 22,  size: '18px', color: '#e74c3c', rot: -6 },
      { text: 'HOUSE',    x: 39, y: wallTop + 50,  size: '14px', color: '#f9ca24', rot:  4 },
      { text: '#SPLASH',  x: 39, y: wallTop + 78,  size: '11px', color: '#27ae60', rot: -3 },
      { text: 'WARRIORS', x: 39, y: wallTop + 104, size: '10px', color: '#1d428a', rot:  2 },
      { text: '2K',       x: 39, y: wallTop + 128, size: '22px', color: '#9b59b6', rot: -5 }
    ].forEach(function(tag) {
      self.add.text(tag.x, tag.y, tag.text, {
        fontSize: tag.size, color: tag.color, fontStyle: 'bold',
        fontFamily: 'Impact, Arial Black, sans-serif'
      }).setOrigin(0.5).setRotation(Phaser.Math.DegToRad(tag.rot));
    });

    var rg = this.add.graphics();
    rg.fillStyle(0x6d7f7f); rg.fillRect(W - 78, wallTop, 78, wallH);
    rg.lineStyle(3, 0x444444); rg.strokeRect(W - 78, wallTop, 78, wallH);

    [
      { text: 'STEPH',    x: W - 39, y: wallTop + 22,  size: '18px', color: '#3498db', rot:  5 },
      { text: 'CURRY',    x: W - 39, y: wallTop + 50,  size: '17px', color: '#e74c3c', rot: -4 },
      { text: 'BEACH CT', x: W - 39, y: wallTop + 78,  size: '10px', color: '#f9ca24', rot:  3 },
      { text: 'MVP',      x: W - 39, y: wallTop + 104, size: '16px', color: '#27ae60', rot: -2 },
      { text: 'GOAT',     x: W - 39, y: wallTop + 128, size: '14px', color: '#ffffff', rot:  4 }
    ].forEach(function(tag) {
      self.add.text(tag.x, tag.y, tag.text, {
        fontSize: tag.size, color: tag.color, fontStyle: 'bold',
        fontFamily: 'Impact, Arial Black, sans-serif'
      }).setOrigin(0.5).setRotation(Phaser.Math.DegToRad(tag.rot));
    });
  }

  _drawCourt() {
    var g = this.add.graphics();
    var C = GAME_CONFIG.COURT;

    g.fillStyle(0xc8a85a);
    g.fillPoints([C.farLeft, C.farRight, C.nearRight, C.nearLeft], true);

    g.fillStyle(0xb89840, 0.4);
    for (var i = 0; i < 8; i++) {
      var t  = i / 8;
      var x1 = Phaser.Math.Linear(C.farLeft.x,  C.nearLeft.x,  t);
      var y1 = Phaser.Math.Linear(C.farLeft.y,  C.nearLeft.y,  t);
      var x2 = Phaser.Math.Linear(C.farRight.x, C.nearRight.x, t);
      g.fillRect(x1, y1, x2 - x1, 3);
    }

    g.lineStyle(2, 0x8B6914, 1);
    g.strokePoints([C.farLeft, C.farRight, C.nearRight, C.nearLeft], true);

    var midFarX  = (C.farLeft.x  + C.farRight.x)  / 2;
    var midNearX = (C.nearLeft.x + C.nearRight.x) / 2;
    var midX = (midFarX + midNearX) / 2;
    var midY = (C.farLeft.y + C.nearLeft.y) / 2;

    g.lineStyle(2, 0xffffff, 0.5);
    g.beginPath(); g.moveTo(midFarX, C.farLeft.y); g.lineTo(midNearX, C.nearLeft.y); g.strokePath();
    g.strokeCircle(midX, midY, 28);

    this.add.text(midX, midY, "NOAH'S\nHOUSE", {
      fontSize: '11px', color: '#ffffff', align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.45);

    var keyW = 55, keyH = 80;
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeRect(C.farLeft.x + 10,         GAME_CONFIG.LEFT_HOOP.y  - keyH / 2, keyW, keyH);
    g.strokeRect(C.farRight.x - 10 - keyW, GAME_CONFIG.RIGHT_HOOP.y - keyH / 2, keyW, keyH);
  }

  _drawZoneArcs() {
    var g = this.add.graphics();
    [GAME_CONFIG.LEFT_HOOP, GAME_CONFIG.RIGHT_HOOP].forEach(function(hoop) {
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeCircle(hoop.x, hoop.y, GAME_CONFIG.THREE_POINT_DIST);
      g.fillStyle(0xe74c3c, 0.12);
      g.fillCircle(hoop.x, hoop.y, GAME_CONFIG.DUNK_ZONE_DIST);
    });
  }

  _drawHoops() {
    var self = this;
    [
      { hoop: GAME_CONFIG.LEFT_HOOP,  side: 'left'  },
      { hoop: GAME_CONFIG.RIGHT_HOOP, side: 'right' }
    ].forEach(function(item) {
      var g   = self.add.graphics();
      var x   = item.hoop.x, y = item.hoop.y;
      var dir = (item.side === 'left') ? 1 : -1;

      g.fillStyle(0x999999); g.fillRect(x - 2, y, 4, 55);
      g.fillStyle(0xe0e0e0); g.fillRect(x + dir * 6, y - 22, 6, 30);
      g.lineStyle(2, 0xe67e22); g.strokeRect(x + dir * 7, y - 16, 4, 18);
      g.fillStyle(0xe67e22); g.fillRect(x - 12, y - 4, 24, 6);
      g.lineStyle(2, 0xc0392b); g.strokeRect(x - 12, y - 4, 24, 6);

      g.lineStyle(1, 0xffffff, 0.8);
      for (var i = 0; i < 5; i++) {
        var nx = x - 10 + i * 5;
        g.beginPath(); g.moveTo(nx, y + 2); g.lineTo(nx + 2, y + 16); g.strokePath();
      }
      g.beginPath(); g.moveTo(x - 10, y + 16); g.lineTo(x + 12, y + 16); g.strokePath();
    });
  }

  _drawFans() {
    var self = this;
    this._fanData = [
      { x: 88,  y: 180, shirt: 0x1d428a },
      { x: 108, y: 205, shirt: 0xFFC72C },
      { x: 128, y: 192, shirt: 0xc8102e },
      { x: 832, y: 190, shirt: 0x1d428a },
      { x: 852, y: 205, shirt: 0xc8102e },
      { x: 872, y: 185, shirt: 0xFFC72C }
    ];
    this._fanData.forEach(function(fan) {
      fan.gfx = self.add.graphics().setDepth(fan.y - 1);
      self._drawFanAt(fan.gfx, fan.x, fan.y, fan.shirt);
    });
  }

  _drawFanAt(g, x, y, shirt) {
    g.clear();
    g.fillStyle(0xffe0b2); g.fillCircle(x, y - 18, 8);
    g.fillStyle(shirt);    g.fillRect(x - 7, y - 10, 14, 16);
    g.lineStyle(1, 0x333333); g.strokeCircle(x, y - 18, 8);
  }

  _cheerFans() {
    var self = this;
    this._fanData.forEach(function(fan) {
      var orig = fan.y;
      self.tweens.add({
        targets: fan,
        y: orig - 14,
        duration: 150,
        yoyo: true,
        repeat: 3,
        onUpdate: function() { self._drawFanAt(fan.gfx, fan.x, fan.y, fan.shirt); },
        onComplete: function() { fan.y = orig; }
      });
    });
  }

  // ─── SHOOTING ────────────────────────────────────────────────────────────────

  _handleShooting(delta) {
    var ball = this.ball;
    if (ball.inFlight) return;

    var attacker   = this.gameState.possession === 'curry' ? this.curry : this.edwards;
    var defender   = attacker === this.curry ? this.edwards : this.curry;
    var attackHoop = this.gameState.possession === 'curry'
      ? GAME_CONFIG.RIGHT_HOOP : GAME_CONFIG.LEFT_HOOP;

    // Steal attempt — defender presses shoot near attacker
    var stealJD = Phaser.Input.Keyboard.JustDown(defender.keys.shoot);
    var dist    = Phaser.Math.Distance.Between(attacker.x, attacker.y, defender.x, defender.y);
    if (stealJD && dist < 60) {
      if (Math.random() < (defender.stats.steal / 99) * 0.45) {
        this.commentary.say('steal');
        this._changePossession(defender);
        return;
      }
    }

    // Dunk — Edwards in dunk zone presses shoot
    if (attacker === this.edwards) {
      var dunkDist = Phaser.Math.Distance.Between(attacker.x, attacker.y, attackHoop.x, attackHoop.y);
      if (dunkDist < GAME_CONFIG.DUNK_ZONE_DIST && Phaser.Input.Keyboard.JustDown(attacker.keys.shoot)) {
        this._executeDunk(attacker, attackHoop);
        return;
      }
    }

    // Layup — any player in dunk zone presses shoot
    var nearDist = Phaser.Math.Distance.Between(attacker.x, attacker.y, attackHoop.x, attackHoop.y);
    if (nearDist < GAME_CONFIG.DUNK_ZONE_DIST && Phaser.Input.Keyboard.JustDown(attacker.keys.shoot)) {
      this._executeLayup(attacker, attackHoop);
      return;
    }

    // Normal shot — hold to charge
    if (attacker.keys.shoot.isDown && !this._shootingPlayer) {
      this._shootingPlayer = attacker;
      attacker.isShooting  = true;
      this.shotMeter.start(attacker.x, attacker.y);
    }

    if (this._shootingPlayer === attacker) {
      if (attacker.keys.shoot.isDown) {
        this.shotMeter.update(delta);
        this.shotMeter.moveTo(attacker.x, attacker.y);
      } else {
        var meterScore = this.shotMeter.release();
        var isThree    = ScoreZone.isThreePointer(attacker.x, attacker.y, attackHoop);
        var stat       = isThree ? attacker.stats.threePoint : attacker.stats.midRange;
        var accuracy   = ShotAccuracy.calcAccuracy(stat, isThree ? 'three' : 'mid', meterScore);

        if (attacker === this.curry && isThree) {
          this._showGoldArc(attacker, attackHoop);
        }

        this._shootingPlayer = null;
        attacker.isShooting  = false;
        attacker.hasBall     = false;
        ball.owner           = null;

        var self = this;
        ball.shootTo(
          attackHoop, accuracy, isThree,
          function(three) { self._onScore(attacker, three ? 3 : 2, attackHoop); },
          function()      { self._onMiss(attacker); }
        );
      }
    }
  }

  _showGoldArc(player, hoop) {
    var g = this.add.graphics().setDepth(200);
    g.lineStyle(3, 0xFFD700, 0.8);
    g.beginPath();
    g.moveTo(player.x, player.y);
    g.lineTo((player.x + hoop.x) / 2, Math.min(player.y, hoop.y) - 90);
    g.lineTo(hoop.x, hoop.y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 700,
      onComplete: function() { g.destroy(); } });
  }

  _executeDunk(player, hoop) {
    player.state       = 'dunking';
    player.hasBall     = false;
    this.ball.owner    = null;
    this.ball.inFlight = true;
    var self = this;
    this.tweens.add({
      targets: player, y: player.y - 28, duration: 170, yoyo: true,
      onComplete: function() {
        player.state       = 'idle';
        self.ball.inFlight = false;
        self.ball.x = hoop.x; self.ball.y = hoop.y;
        self._onScore(player, 2, hoop);
      }
    });
  }

  _executeLayup(player, hoop) {
    var self = this;
    player.hasBall  = false;
    this.ball.owner = null;
    var accuracy = ShotAccuracy.calcAccuracy(player.stats.midRange, 'mid', 0.82);
    this.ball.shootTo(
      hoop, accuracy, false,
      function() { self._onScore(player, 2, hoop); },
      function() { self._onMiss(player); }
    );
  }

  _onScore(scorer, points, hoop) {
    if (this.gameState.gameOver) return;

    if (scorer === this.curry) this.gameState.curryScore   += points;
    else                       this.gameState.edwardsScore += points;

    this.hud.updateScores(this.gameState.curryScore, this.gameState.edwardsScore);
    this.scorePop.show(hoop.x, hoop.y - 30, '+' + points);
    this._cheerFans();

    var evt = scorer === this.curry
      ? (points === 3 ? 'curry_three' : 'curry_two')
      : (scorer.state === 'dunking' ? 'edwards_dunk' : (points === 3 ? 'edwards_three' : 'edwards_two'));
    this.commentary.say(evt);

    this.gameState.shotClock = GAME_CONFIG.SHOT_CLOCK_MS;

    if (this.gameState.curryScore   >= GAME_CONFIG.WIN_SCORE ||
        this.gameState.edwardsScore >= GAME_CONFIG.WIN_SCORE) {
      this.gameState.gameOver = true;
      var self = this;
      this.time.delayedCall(1400, function() {
        self.scene.start('GameOverScene', {
          winner:       self.gameState.curryScore >= GAME_CONFIG.WIN_SCORE ? 'curry' : 'edwards',
          curryScore:   self.gameState.curryScore,
          edwardsScore: self.gameState.edwardsScore
        });
      });
      return;
    }

    var nextOwner = scorer === this.curry ? this.edwards : this.curry;
    var self = this;
    this.time.delayedCall(900, function() { self._changePossession(nextOwner); });
  }

  _onMiss(player) {
    player.state   = 'idle';
    player.hasBall = false;
    this.commentary.say('miss');
    var dC = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.curry.x,   this.curry.y);
    var dE = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.edwards.x, this.edwards.y);
    var rebounder = dC < dE ? this.curry : this.edwards;
    var self = this;
    this.time.delayedCall(350, function() { self._changePossession(rebounder); });
  }

  _changePossession(newOwner) {
    var prev = newOwner === this.curry ? this.edwards : this.curry;
    prev.hasBall      = false;
    newOwner.hasBall  = true;
    this.gameState.possession = (newOwner === this.curry) ? 'curry' : 'edwards';
    this.gameState.shotClock  = GAME_CONFIG.SHOT_CLOCK_MS;
    this._shootingPlayer      = null;
    this.ball.reset(newOwner.x, newOwner.y, newOwner);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameState.gameOver) return;

    this.gameState.shotClock -= delta;
    if (this.gameState.shotClock <= 0) {
      var loser = this.gameState.possession === 'curry' ? this.edwards : this.curry;
      this._changePossession(loser);
    }

    this.curry.update(delta);
    this.edwards.update(delta);
    this.ball.update(delta);
    this._handleShooting(delta);
    this.curry.draw();
    this.edwards.draw();
    this.hud.update(delta, this.gameState.shotClock);
  }
}
