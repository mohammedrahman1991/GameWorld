class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this._scores  = { messai: 0, ronalda: 0 };
    this._timeLeft = CFG.MATCH_TIME_S * 1000; // ms
    this._active   = true;
    this._kickoffPending = false;

    this._commentary = new Commentary();
    this._pop        = new ScorePop(this);
    this._meter      = null;  // assigned per player when charging

    // ── Draw field ───────────────────────────────────────────────
    this._fieldGfx = this.add.graphics().setDepth(0);
    this._drawField();

    // ── Players ──────────────────────────────────────────────────
    this._messai  = new Messai(this, 360, 285);
    this._ronalda = new Ronalda(this, 600, 285);

    // ── Ball ─────────────────────────────────────────────────────
    this._ball = new Ball(this, 480, 285);
    this._ball.attachTo(this._messai);
    this._messai.hasBall = true;

    // ── Shot meters ──────────────────────────────────────────────
    this._meterM = new ShotMeter(this);
    this._meterR = new ShotMeter(this);

    // ── HUD text objects ─────────────────────────────────────────
    this._hud = new HUD(this);
    this._setupHUDText();

    // ── Player name labels ───────────────────────────────────────
    this._labelM = this.add.text(0, 0, 'MESSAI #10', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#aaddff',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(810).setOrigin(0.5, 1);
    this._labelR = this.add.text(0, 0, 'RONALDA #7', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#ffaaaa',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(810).setOrigin(0.5, 1);

    // ── Commentary kick-off ──────────────────────────────────────
    this.time.delayedCall(600, () => this._commentary.kickoff());
  }

  // ── HUD setup ────────────────────────────────────────────────
  _setupHUDText() {
    const W = CFG.WIDTH;

    // Messai score block
    this._hudMessaiBadge = this.add.text(140, 26, 'MESSAI', {
      fontFamily: 'Impact', fontSize: '16px', color: '#aaddff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(802);

    this._hudMessaiScore = this.add.text(195, 26, '0', {
      fontFamily: 'Impact', fontSize: '28px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(802);

    // Ronalda score block
    this._hudRonaldaBadge = this.add.text(W - 140, 26, 'RONALDA', {
      fontFamily: 'Impact', fontSize: '16px', color: '#ffaaaa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(802);

    this._hudRonaldaScore = this.add.text(W - 195, 26, '0', {
      fontFamily: 'Impact', fontSize: '28px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(802);

    // Title center
    this.add.text(W / 2, 14, '1 v 1  FUTBOL', {
      fontFamily: 'Impact', fontSize: '14px', color: '#FFD700',
    }).setOrigin(0.5).setDepth(802);

    // Timer
    this._hudTimer = this.add.text(W / 2, 35, '3:00', {
      fontFamily: 'Impact', fontSize: '22px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(802);

    // Controls bottom bar
    this.add.text(20, CFG.HEIGHT - 18, 'MESSAI: WASD=move  G=kick  T=sprint  F=fake', {
      fontFamily: 'monospace', fontSize: '11px', color: '#6688aa',
    }).setDepth(802);
    this.add.text(CFG.WIDTH - 20, CFG.HEIGHT - 18, 'RONALDA: arrows=move  /=kick  .=sprint  ,=fake', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aa6688',
    }).setOrigin(1, 0.5).setDepth(802);
  }

  // ── Main update ───────────────────────────────────────────────
  update(time, delta) {
    if (!this._active || this._kickoffPending) return;

    // Timer
    this._timeLeft -= delta;
    if (this._timeLeft <= 0) {
      this._timeLeft = 0;
      this._endMatch();
      return;
    }
    this._updateTimerText();

    // Update players
    this._messai.update(delta);
    this._ronalda.update(delta);

    // Update ball
    if (!this._ball.inFlight) this._ball.update(delta);

    // Update shot meters
    if (this._meterM.active) this._meterM.update(delta);
    if (this._meterR.active) this._meterR.update(delta);

    // Player labels
    this._labelM.setPosition(this._messai.x, this._messai.y - 54 * this._messai.scale);
    this._labelR.setPosition(this._ronalda.x, this._ronalda.y - 54 * this._ronalda.scale);

    // Handle input
    if (!this._ball.inFlight) {
      this._handleTackles();
      this._handleKick(this._messai, this._meterM);
      this._handleKick(this._ronalda, this._meterR);
      this._handleBurst(this._messai);
      this._handleBurst(this._ronalda);
    }
  }

  // ── Kick input ───────────────────────────────────────────────
  _handleKick(player, meter) {
    const kickKey = player.controls.kick;

    if (player.hasBall) {
      if (Phaser.Input.Keyboard.JustDown(kickKey)) {
        meter.start(player);
        player.isCharging = true;
      }
      if (player.isCharging) {
        if (!kickKey.isDown) {
          // Release — fire!
          const meterScore = meter.release();
          player.isCharging = false;
          this._fireKick(player, meterScore);
        }
      }
    }
  }

  async _fireKick(player, meterScore) {
    if (this._ball.inFlight) return;

    const goal       = player.attackGoal;
    const dist       = Phaser.Math.Distance.Between(player.x, player.y, goal.x, goal.y);
    const inClose    = dist < CFG.CLOSE_DIST;
    const isLong     = dist > CFG.LONG_DIST;
    const base       = player.stats.shooting / 99;
    const meterBonus = meterScore * 0.56;
    const zoneAdj    = inClose ? 0.12 : isLong ? -0.18 : 0;
    // Ronalda power bonus at full meter
    const powerBonus = (player.team === 'ronalda' && meterScore >= 0.95) ? 0.20 : 0;
    const accuracy   = Phaser.Math.Clamp(base * 0.5 + meterBonus + zoneAdj + powerBonus, 0, 1);

    player.hasBall   = false;
    player.isCharging = false;
    this._ball.detach();

    const result = await this._ball.kickToward(goal, accuracy, CFG.BALL_ARC_HEIGHT);

    if (result.scored) {
      this._onGoal(player);
    } else {
      this._onMiss(player, result);
    }
  }

  _onGoal(scorer) {
    this._scores[scorer.team]++;
    this._hudMessaiScore.setText(this._scores.messai);
    this._hudRonaldaScore.setText(this._scores.ronalda);

    const goal = scorer.attackGoal;
    this._pop.showGoal(goal.x, goal.y, scorer.team);
    this._commentary.goal(scorer.team);

    // Net ripple effect
    this._netRipple(goal);

    // Camera shake
    this.cameras.main.shake(280, 0.012);

    scorer.celebrate();

    if (this._scores[scorer.team] >= CFG.WIN_GOALS) {
      this.time.delayedCall(1400, () => this._endMatch());
      return;
    }

    // Reset after goal
    this._kickoffPending = true;
    this.time.delayedCall(1800, () => this._kickoff(scorer.team === 'messai' ? this._ronalda : this._messai));
  }

  _onMiss(player, result) {
    this._pop.showMiss(result.x, result.y);
    this._commentary.miss();

    // Ball goes to opponent (rebound)
    const other = player.team === 'messai' ? this._ronalda : this._messai;
    this.time.delayedCall(350, () => {
      this._ball.resetTo(other.x, other.y);
      this._ball.attachTo(other);
      other.hasBall = true;
    });
  }

  // ── Tackle input ─────────────────────────────────────────────
  _handleTackles() {
    // Messai attempts tackle on Ronalda
    if (!this._messai.hasBall && this._ronalda.hasBall) {
      if (Phaser.Input.Keyboard.JustDown(this._messai.controls.kick)) {
        this._attemptTackle(this._messai, this._ronalda);
      }
    }
    // Ronalda attempts tackle on Messai
    if (!this._ronalda.hasBall && this._messai.hasBall) {
      if (Phaser.Input.Keyboard.JustDown(this._ronalda.controls.kick)) {
        this._attemptTackle(this._ronalda, this._messai);
      }
    }
  }

  _attemptTackle(defender, attacker) {
    const dist = Phaser.Math.Distance.Between(defender.x, defender.y, attacker.x, attacker.y);
    if (dist > CFG.TACKLE_RANGE) return;

    const chance = (defender.stats.tackle / 99) * CFG.TACKLE_CHANCE;
    if (Math.random() < chance) {
      // Steal success
      attacker.hasBall = false;
      this._ball.detach();
      this._ball.resetTo(defender.x, defender.y);
      this._ball.attachTo(defender);
      defender.hasBall = true;
      attacker.stun(550);
      this._pop.showTackle(defender.x, defender.y - 20);
      this._commentary.tackle(defender.team);
    }
  }

  // ── Sprint burst ─────────────────────────────────────────────
  _handleBurst(player) {
    if (Phaser.Input.Keyboard.JustDown(player.controls.burst)) {
      player.startBurst();
      if (Math.random() < 0.28) this._commentary.dribble();
    }
  }

  // ── Kickoff ──────────────────────────────────────────────────
  _kickoff(receiver) {
    this._ball.resetTo(480, 285);
    this._ball.attachTo(receiver);
    receiver.hasBall = true;
    this._kickoffPending = false;
  }

  // ── Timer ────────────────────────────────────────────────────
  _updateTimerText() {
    const s   = Math.ceil(this._timeLeft / 1000);
    const mm  = Math.floor(s / 60);
    const ss  = s % 60;
    const str = `${mm}:${ss.toString().padStart(2, '0')}`;
    this._hudTimer.setText(str);
    this._hudTimer.setColor(s <= 30 ? '#ff4444' : '#ffffff');
  }

  // ── Match end ────────────────────────────────────────────────
  _endMatch() {
    if (!this._active) return;
    this._active = false;
    const winner = this._scores.messai > this._scores.ronalda ? 'messai'
                 : this._scores.ronalda > this._scores.messai ? 'ronalda'
                 : 'draw';
    this._commentary.finalWhistle(winner === 'draw' ? 'messai' : winner);
    this.time.delayedCall(2200, () => {
      this.scene.start('GameOverScene', {
        winner,
        scores: { ...this._scores },
      });
    });
  }

  // ── Net ripple ───────────────────────────────────────────────
  _netRipple(goal) {
    const ripple = this.add.graphics().setDepth(300);
    ripple.lineStyle(2, 0xffd700, 0.9);
    let r = 0;
    const timer = this.time.addEvent({
      delay:    40,
      repeat:   8,
      callback: () => {
        ripple.clear();
        ripple.lineStyle(2, 0xffd700, 0.8 - r * 0.08);
        ripple.strokeCircle(goal.x, goal.y, r * 14);
        r++;
        if (r > 8) { ripple.destroy(); timer.destroy(); }
      },
    });
  }

  // ── Field drawing ─────────────────────────────────────────────
  _drawField() {
    const g = this._fieldGfx;
    const F = CFG.FIELD;
    const W = CFG.WIDTH, H = CFG.HEIGHT;

    // ── Sky / stands ─────────────────────────────────────────
    g.fillGradientStyle(0x1a3560, 0x1a3560, 0x0e1e38, 0x0e1e38, 1);
    g.fillRect(0, 0, W, F.farLeft.y);

    // Stadium crowd suggestion rows
    const crowdColors = [0x2a2a55, 0x3a3a70, 0x222248, 0x4a2a55];
    for (let row = 0; row < 4; row++) {
      g.fillStyle(crowdColors[row % crowdColors.length], 1);
      g.fillRect(0, row * 28, W, 28);
      for (let col = 0; col < 35; col++) {
        const hue = Math.random() > 0.5 ? 0x1a4a96 : 0xcc2222;
        g.fillStyle(hue, 0.6);
        g.fillCircle(14 + col * 27 + (row % 2) * 13, 14 + row * 28, 6 + Math.random() * 4);
      }
    }

    // Stadium arch / roof hint
    g.fillStyle(0x111130, 0.8);
    g.fillRect(0, 0, W, 30);
    g.fillStyle(0x333366, 0.6);
    g.fillRect(0, 25, W, 8);

    // ── Pitch (trapezoid) ─────────────────────────────────────
    // Alternating dark/light stripes
    const stripes = 8;
    const stripeW = (F.nearRight.x - F.nearLeft.x) / stripes;
    for (let i = 0; i < stripes; i++) {
      const color = i % 2 === 0 ? 0x2d8a2d : 0x319331;
      g.fillStyle(color, 1);

      const x1Near = F.nearLeft.x  + i       * stripeW;
      const x2Near = F.nearLeft.x  + (i + 1) * stripeW;
      const t1Far  = i       / stripes;
      const t2Far  = (i + 1) / stripes;
      const x1Far  = F.farLeft.x + t1Far * (F.farRight.x - F.farLeft.x);
      const x2Far  = F.farLeft.x + t2Far * (F.farRight.x - F.farLeft.x);

      g.fillPoints([
        { x: x1Near, y: F.nearLeft.y },
        { x: x2Near, y: F.nearLeft.y },
        { x: x2Far,  y: F.farLeft.y  },
        { x: x1Far,  y: F.farLeft.y  },
      ], true, true);
    }

    // Pitch outline
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokePoints([
      { x: F.farLeft.x,  y: F.farLeft.y  },
      { x: F.farRight.x, y: F.farRight.y },
      { x: F.nearRight.x, y: F.nearRight.y },
      { x: F.nearLeft.x,  y: F.nearLeft.y  },
    ], true);

    // Center line
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginPath();
    g.moveTo(480, F.farLeft.y);
    g.lineTo(480, F.nearLeft.y);
    g.strokePath();

    // Center circle
    g.strokeCircle(480, 280, 72);
    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(480, 280, 72);
    // Center spot
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(480, 280, 4);

    // ── Penalty areas ─────────────────────────────────────────
    const LB = CFG.LEFT_BOX, RB = CFG.RIGHT_BOX;
    g.lineStyle(2, 0xffffff, 0.75);
    g.strokeRect(LB.x1, LB.y1, LB.x2 - LB.x1, LB.y2 - LB.y1);
    g.strokeRect(RB.x1, RB.y1, RB.x2 - RB.x1, RB.y2 - RB.y1);
    // Penalty spots
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(LB.x1 + 80, 278, 4);
    g.fillCircle(RB.x2 - 80, 278, 4);

    // ── Goals ─────────────────────────────────────────────────
    this._drawGoal(g, CFG.LEFT_GOAL,  true);
    this._drawGoal(g, CFG.RIGHT_GOAL, false);

    // ── Corner flags ─────────────────────────────────────────
    const corners = [
      [F.farLeft.x,   F.farLeft.y],
      [F.farRight.x,  F.farRight.y],
      [F.nearLeft.x,  F.nearLeft.y],
      [F.nearRight.x, F.nearRight.y],
    ];
    corners.forEach(([cx, cy]) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 1, cy - 20, 2, 20);
      g.fillStyle(0xcc0000, 1);
      g.fillTriangle(cx, cy - 20, cx + 12, cy - 15, cx, cy - 10);
    });

    // ── Advertising boards (bottom edge) ─────────────────────
    const adColors = [0x1a4a96, 0xcc2222, 0x229922, 0xcc9900, 0x7722cc, 0x22aacc];
    for (let i = 0; i < 12; i++) {
      const adX = 60 + i * 72;
      g.fillStyle(adColors[i % adColors.length], 1);
      g.fillRect(adX, H - 42, 68, 22);
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeRect(adX, H - 42, 68, 22);
    }

    // Stadium lights
    [[80, 5], [880, 5], [80, 90], [880, 90]].forEach(([lx, ly]) => {
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(lx, ly, 8);
      g.fillStyle(0xffffcc, 0.12);
      g.fillCircle(lx, ly, 40);
    });
  }

  _drawGoal(g, goal, isLeft) {
    const cx = goal.x;
    const cy = goal.y;
    const hw = goal.halfH;    // half-height of goal opening
    const pd = goal.postW;    // depth of goal (how far it extends)
    const dir = isLeft ? -1 : 1;  // which direction the net extends

    // Goal posts (white)
    g.lineStyle(4, 0xffffff, 1);
    // Left post
    g.beginPath();
    g.moveTo(cx, cy - hw);
    g.lineTo(cx + dir * pd, cy - hw);
    g.strokePath();
    // Right post
    g.beginPath();
    g.moveTo(cx, cy + hw);
    g.lineTo(cx + dir * pd, cy + hw);
    g.strokePath();
    // Crossbar front
    g.beginPath();
    g.moveTo(cx, cy - hw);
    g.lineTo(cx, cy + hw);
    g.strokePath();
    // Back bar
    g.lineStyle(3, 0xdddddd, 0.8);
    g.beginPath();
    g.moveTo(cx + dir * pd, cy - hw);
    g.lineTo(cx + dir * pd, cy + hw);
    g.strokePath();

    // Net (diagonal grey lines)
    g.lineStyle(1, 0xaaaaaa, 0.45);
    const netSteps = 8;
    for (let i = 0; i <= netSteps; i++) {
      const yPos = cy - hw + (i / netSteps) * (hw * 2);
      g.beginPath();
      g.moveTo(cx, yPos);
      g.lineTo(cx + dir * pd, yPos);
      g.strokePath();
    }
    for (let i = 0; i <= 4; i++) {
      const xPos = cx + (dir * pd * i / 4);
      g.beginPath();
      g.moveTo(xPos, cy - hw);
      g.lineTo(xPos, cy + hw);
      g.strokePath();
    }

    // Goal fill (very subtle)
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(
      isLeft ? cx + dir * pd : cx,
      cy - hw,
      Math.abs(pd),
      hw * 2
    );
  }
}
