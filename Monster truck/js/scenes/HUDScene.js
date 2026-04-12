// ============================================================
//  HUDScene – overlay scene: HP bars, level info, boss HP,
//  invisibility charges, sprint cooldown, score
// ============================================================
class HUDScene extends Phaser.Scene {
    constructor() { super({ key: 'HUDScene' }); }

    init(data) {
        this.playerCount   = data.playerCount || 1;
        this.p1HP          = data.p1HP   !== undefined ? data.p1HP  : GAME_CONFIG.PLAYER_MAX_HP;
        this.p2HP          = data.p2HP   !== undefined ? data.p2HP  : GAME_CONFIG.PLAYER_MAX_HP;
        this.currentLevel  = data.level  || 1;
        this.levelName     = data.levelName || '';
        this.invisCharges  = data.invisCharges || { p1: 0, p2: 0 };
        this.isBossLevel   = data.isBossLevel || false;
        this.bossMaxHP     = data.bossMaxHP || 0;
        this.bossCurrentHP = this.bossMaxHP;
        this.bossVisible   = false;
        this.score         = 0;
        this.p1InvisActive = false;
        this.p2InvisActive = false;
    }

    create() {
        const W = GAME_CONFIG.WIDTH;

        // ── Top bar background ────────────────────────────────
        const topBar = this.add.graphics();
        topBar.fillStyle(0x000000, 0.55);
        topBar.fillRect(0, 0, W, 70);
        topBar.lineStyle(2, 0xFF6D00, 0.4);
        topBar.lineBetween(0, 70, W, 70);

        // ── Level label ───────────────────────────────────────
        this.add.text(W / 2, 12, `LEVEL ${this.currentLevel}`, {
            fontSize: '14px', color: '#FFD740', fontStyle: 'bold',
        }).setOrigin(0.5, 0);

        this.levelNameText = this.add.text(W / 2, 28, this.levelName, {
            fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5, 0);

        // ── Score ────────────────────────────────────────────
        this.scoreText = this.add.text(W / 2, 50, 'SCORE: 0', {
            fontSize: '14px', color: '#FFD740',
        }).setOrigin(0.5, 0);

        // ── Player 1 HP bar ────────────────────────────────────
        this._buildHPBar(1);

        // ── Player 2 HP bar ────────────────────────────────────
        if (this.playerCount === 2) {
            this._buildHPBar(2);
        }

        // ── Boss HP bar (hidden until boss starts) ─────────────
        this._buildBossHPBar();

        // ── Invisibility charge indicators ────────────────────
        this._buildInvisIndicators();

        // ── Sprint / slide indicators ─────────────────────────
        this._buildBuffIndicators();

        // ── Event listeners from GameScene ────────────────────
        const gs = this.scene.get('GameScene');
        gs.events.on('updateHP',      (d)  => this._onUpdateHP(d),      this);
        gs.events.on('updateScore',   (s)  => this._onUpdateScore(s),   this);
        gs.events.on('bossStart',     (d)  => this._onBossStart(d),     this);
        gs.events.on('bossHP',        (hp) => this._onBossHP(hp),       this);
        gs.events.on('bossKilled',    (ic) => this._onBossKilled(ic),   this);
        gs.events.on('invisActivated',(d)  => this._onInvisActivated(d),this);
        gs.events.on('invisEnd',      (pk) => this._onInvisEnd(pk),     this);

        // Entrance animation
        this.tweens.add({
            targets: [topBar, this.scoreText, this.levelNameText],
            alpha: { from: 0, to: 1 }, duration: 600, ease: 'Power2',
        });
    }

    // ── Build P1 / P2 HP bar ─────────────────────────────────
    _buildHPBar(player) {
        const W = GAME_CONFIG.WIDTH;
        const isP1 = player === 1;
        const truckColor = isP1 ? GAME_CONFIG.COLORS.P1 : GAME_CONFIG.COLORS.P2;

        // Label
        const label = isP1 ? '🟠 P1' : 'P2 🔵';
        this.add.text(isP1 ? 14 : W - 14, 8, label, {
            fontSize: '14px', color: isP1 ? '#FF6D00' : '#42A5F5', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(isP1 ? 0 : 1, 0);

        // Truck icon (mini)
        const iconG = this.add.graphics();
        const ix = isP1 ? 14 : W - 104;
        iconG.fillStyle(truckColor, 0.9);
        iconG.fillRoundedRect(ix, 24, 90, 20, 4);
        iconG.fillRoundedRect(ix + 18, 14, 40, 14, 4);
        iconG.fillStyle(0x212121);
        iconG.fillCircle(ix + 14, 42, 8);
        iconG.fillCircle(ix + 76, 42, 8);

        // HP bar background
        const barW = 220;
        const barX = isP1 ? 14 : W - 14 - barW;
        const barBG = this.add.graphics();
        barBG.fillStyle(0x000000, 0.6);
        barBG.fillRoundedRect(barX, 50, barW, 16, 4);
        barBG.lineStyle(1.5, 0x555555);
        barBG.strokeRoundedRect(barX, 50, barW, 16, 4);

        // HP bar fill
        const barFill = this.add.graphics();
        barFill.fillStyle(GAME_CONFIG.COLORS.HP_HIGH);
        barFill.fillRoundedRect(barX + 1, 51, barW - 2, 14, 3);

        // HP text
        const hpText = this.add.text(barX + barW / 2, 58, `${GAME_CONFIG.PLAYER_MAX_HP}/${GAME_CONFIG.PLAYER_MAX_HP}`, {
            fontSize: '11px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5);

        if (isP1) {
            this._p1BarFill  = barFill;
            this._p1BarBGX   = barX; this._p1BarW = barW;
            this._p1HPText   = hpText;
        } else {
            this._p2BarFill  = barFill;
            this._p2BarBGX   = barX; this._p2BarW = barW;
            this._p2HPText   = hpText;
        }
    }

    // ── Boss HP bar ────────────────────────────────────────────
    _buildBossHPBar() {
        const W = GAME_CONFIG.WIDTH;
        const H = GAME_CONFIG.HEIGHT;
        const barW = 600;
        const barX = W / 2 - barW / 2;

        this._bossBarContainer = this.add.container(0, 0).setAlpha(0).setDepth(30);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(barX - 10, H - 76, barW + 20, 68, 8);
        bg.lineStyle(2, 0xFF1744, 0.7);
        bg.strokeRoundedRect(barX - 10, H - 76, barW + 20, 68, 8);

        const barBG = this.add.graphics();
        barBG.fillStyle(0x111111);
        barBG.fillRoundedRect(barX, H - 48, barW, 22, 6);

        this._bossBarFill = this.add.graphics();
        this._bossBarFill.fillStyle(GAME_CONFIG.COLORS.BOSS_HP);
        this._bossBarFill.fillRoundedRect(barX + 1, H - 47, barW - 2, 20, 5);

        this._bossNameText = this.add.text(W / 2, H - 72, 'BOSS', {
            fontSize: '16px', color: '#FF1744', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5, 0).setDepth(31);

        this._bossHPText = this.add.text(W / 2, H - 30, '', {
            fontSize: '12px', color: '#FFD740', fontStyle: 'bold',
        }).setOrigin(0.5, 0).setDepth(31);

        this._bossBarContainer.add([bg, barBG, this._bossBarFill, this._bossNameText, this._bossHPText]);
        this._bossBarBGX = barX;
        this._bossBarW   = barW;
        this._bossBarY   = GAME_CONFIG.HEIGHT - 47;
    }

    // ── Invisibility charge icons ─────────────────────────────
    _buildInvisIndicators() {
        const W = GAME_CONFIG.WIDTH;

        // P1 invis (bottom left)
        this._p1InvisContainer = this.add.container(10, GAME_CONFIG.HEIGHT - 70).setDepth(25);
        const p1InvisBG = this.add.graphics();
        p1InvisBG.fillStyle(0x000000, 0.5);
        p1InvisBG.fillRoundedRect(0, 0, 120, 56, 8);
        this._p1InvisLabel = this.add.text(60, 8, '👻 INVIS', {
            fontSize: '13px', color: '#00E5FF', fontStyle: 'bold',
        }).setOrigin(0.5, 0);
        this._p1InvisCount = this.add.text(60, 26, `x${this.invisCharges.p1}`, {
            fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5, 0);
        this._p1InvisKey = this.add.text(60, 46, 'Press [I]', {
            fontSize: '10px', color: '#888',
        }).setOrigin(0.5, 0);
        this._p1InvisContainer.add([p1InvisBG, this._p1InvisLabel, this._p1InvisCount, this._p1InvisKey]);

        // P1 active indicator
        this._p1InvisActiveBar = this.add.graphics().setDepth(26);

        if (this.playerCount === 2) {
            // P2 invis (bottom right)
            this._p2InvisContainer = this.add.container(W - 130, GAME_CONFIG.HEIGHT - 70).setDepth(25);
            const p2InvisBG = this.add.graphics();
            p2InvisBG.fillStyle(0x000000, 0.5);
            p2InvisBG.fillRoundedRect(0, 0, 120, 56, 8);
            this._p2InvisLabel = this.add.text(60, 8, '👻 INVIS', {
                fontSize: '13px', color: '#42A5F5', fontStyle: 'bold',
            }).setOrigin(0.5, 0);
            this._p2InvisCount = this.add.text(60, 26, `x${this.invisCharges.p2}`, {
                fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5, 0);
            this._p2InvisKey = this.add.text(60, 46, 'Press [O]', {
                fontSize: '10px', color: '#888',
            }).setOrigin(0.5, 0);
            this._p2InvisContainer.add([p2InvisBG, this._p2InvisLabel, this._p2InvisCount, this._p2InvisKey]);
            this._p2InvisActiveBar = this.add.graphics().setDepth(26);
        }
    }

    // ── Buff indicators (sprint/slide) ─────────────────────────
    _buildBuffIndicators() {
        // Small indicator bottom-left below invis
        this._buffText = this.add.text(12, GAME_CONFIG.HEIGHT - 14, '', {
            fontSize: '12px', color: '#FFD740',
        }).setDepth(25);
    }

    // ── Update HP ─────────────────────────────────────────────
    _onUpdateHP(data) {
        this._updateHPBar(1, data.p1HP, GAME_CONFIG.PLAYER_MAX_HP);
        if (this.playerCount === 2) {
            this._updateHPBar(2, data.p2HP, GAME_CONFIG.PLAYER_MAX_HP);
        }
    }

    _updateHPBar(player, hp, maxHP) {
        const pct = Math.max(0, hp / maxHP);
        const isP1 = player === 1;
        const barFill = isP1 ? this._p1BarFill : this._p2BarFill;
        const barX    = isP1 ? this._p1BarBGX  : this._p2BarBGX;
        const barW    = isP1 ? this._p1BarW    : this._p2BarW;
        const hpText  = isP1 ? this._p1HPText  : this._p2HPText;

        const hpColor = pct > 0.5 ? GAME_CONFIG.COLORS.HP_HIGH :
                        pct > 0.25 ? GAME_CONFIG.COLORS.HP_MED : GAME_CONFIG.COLORS.HP_LOW;
        if (!barFill) return;
        barFill.clear();
        barFill.fillStyle(hpColor);
        const fillW = Math.max(0, (barW - 2) * pct);
        if (fillW > 0) barFill.fillRoundedRect(barX + 1, 51, fillW, 14, 3);

        if (hpText) hpText.setText(`${Math.round(hp)}/${maxHP}`);

        // Pulse red on low HP
        if (pct < 0.25) {
            this.tweens.add({
                targets: barFill, alpha: { from: 1, to: 0.4 },
                duration: 300, yoyo: true, repeat: -1,
            });
        } else {
            barFill.setAlpha(1);
            this.tweens.killTweensOf(barFill);
        }
    }

    // ── Update score ──────────────────────────────────────────
    _onUpdateScore(score) {
        this.score = score;
        if (this.scoreText) this.scoreText.setText(`SCORE: ${score.toLocaleString()}`);
    }

    // ── Boss start ────────────────────────────────────────────
    _onBossStart(data) {
        this.bossCurrentHP = data.hp;
        if (this._bossNameText) this._bossNameText.setText(`⚔️ ${data.name}`);
        if (this._bossHPText) this._bossHPText.setText(`${data.hp} / ${data.hp}`);
        this.tweens.add({
            targets: this._bossBarContainer, alpha: 1, duration: 600, ease: 'Power2',
        });
        this.bossVisible = true;
    }

    _onBossHP(hp) {
        if (!this.bossVisible || !this._bossBarFill) return;
        this.bossCurrentHP = hp;
        const maxHP = this.bossMaxHP;
        const pct = Math.max(0, hp / maxHP);
        this._bossBarFill.clear();

        // Color: hot pink → orange → red based on phase
        const c = pct > 0.66 ? GAME_CONFIG.COLORS.BOSS_HP :
                  pct > 0.33 ? 0xFF6D00 : 0xFF1744;
        this._bossBarFill.fillStyle(c);
        const barW = this._bossBarW;
        const barX = this._bossBarBGX;
        const fillW = Math.max(0, (barW - 2) * pct);
        if (fillW > 0) {
            this._bossBarFill.fillRoundedRect(barX + 1, this._bossBarY, fillW, 20, 5);
        }
        if (this._bossHPText) {
            this._bossHPText.setText(`${Math.max(0, Math.round(hp))} / ${maxHP}`);
        }

        // Phase indicators
        const W = GAME_CONFIG.WIDTH;
        const barCenterX = W / 2;
        if (this._bossBarFill && !this._bossPhaseMarkers) {
            this._bossPhaseMarkers = this.add.graphics().setDepth(32);
            const bx = this._bossBarBGX;
            const bw = this._bossBarW;
            for (const frac of [1/3, 2/3]) {
                this._bossPhaseMarkers.lineStyle(2, 0xFFFFFF, 0.5);
                const mx = bx + bw * frac;
                this._bossPhaseMarkers.lineBetween(mx, this._bossBarY - 2, mx, this._bossBarY + 22);
            }
        }
    }

    _onBossKilled(invisCharges) {
        this.invisCharges = invisCharges;
        this._refreshInvisDisplays();
        if (this._bossBarContainer) {
            this.tweens.add({
                targets: this._bossBarContainer, alpha: 0, duration: 500,
            });
        }
    }

    // ── Invisibility events ───────────────────────────────────
    _onInvisActivated(data) {
        this.invisCharges = data.charges;
        this._refreshInvisDisplays();

        // Show active timer countdown
        const isP1 = data.playerKey === 'p1';
        const barG = isP1 ? this._p1InvisActiveBar : this._p2InvisActiveBar;
        if (!barG) return;

        const duration = GAME_CONFIG.INVISIBILITY_DURATION / 1000;
        const sx = isP1 ? 10 : GAME_CONFIG.WIDTH - 130;
        let elapsed = 0;
        this.time.addEvent({
            delay: 100, repeat: duration * 10,
            callback: () => {
                elapsed += 100;
                const pct = 1 - elapsed / GAME_CONFIG.INVISIBILITY_DURATION;
                barG.clear();
                barG.fillStyle(0x00E5FF, 0.4);
                barG.fillRoundedRect(sx, GAME_CONFIG.HEIGHT - 74, 120 * pct, 6, 3);
            }
        });
        // Pulsing glow on the container
        const container = isP1 ? this._p1InvisContainer : this._p2InvisContainer;
        if (container) {
            this.tweens.add({
                targets: container,
                alpha: { from: 1, to: 0.5 },
                duration: 400, yoyo: true, repeat: 24,
            });
        }
    }

    _onInvisEnd(playerKey) {
        const barG = playerKey === 'p1' ? this._p1InvisActiveBar : this._p2InvisActiveBar;
        if (barG) barG.clear();
    }

    _refreshInvisDisplays() {
        if (this._p1InvisCount) this._p1InvisCount.setText(`x${this.invisCharges.p1}`);
        if (this._p2InvisCount) this._p2InvisCount.setText(`x${this.invisCharges.p2}`);
    }
}
