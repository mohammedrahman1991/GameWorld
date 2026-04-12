// ============================================================
//  LevelCompleteScene – shown between levels
// ============================================================
class LevelCompleteScene extends Phaser.Scene {
    constructor() { super({ key: 'LevelCompleteScene' }); }

    init(data) {
        this.level        = data.level       || 1;
        this.playerCount  = data.playerCount || 1;
        this.p1HP         = data.p1HP        !== undefined ? data.p1HP : GAME_CONFIG.PLAYER_MAX_HP;
        this.p2HP         = data.p2HP        !== undefined ? data.p2HP : GAME_CONFIG.PLAYER_MAX_HP;
        this.invisCharges = data.invisCharges || { p1: 0, p2: 0 };
        this.score        = data.score        || 0;
        this.wasBossLevel = data.wasBossLevel || false;
    }

    create() {
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
        const nextLevel = this.level + 1;
        const nextLD    = LEVEL_DATA[nextLevel - 1];

        // ── Background ───────────────────────────────────────
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0D0520, 0x0D0520, 0x1A0A3E, 0x1A0A3E, 1);
        bg.fillRect(0, 0, W, H);

        // Celebration particles
        this._burstFireworks(W, H);

        // ── Title ────────────────────────────────────────────
        const titleMsg   = this.wasBossLevel ? '🏆 BOSS CRUSHED! 🏆' : '⭐ LEVEL COMPLETE! ⭐';
        const titleColor = this.wasBossLevel ? '#FFD740' : '#69F0AE';

        const title = this.add.text(W / 2, 80, titleMsg, {
            fontSize: '56px', color: titleColor, fontStyle: 'bold',
            stroke: '#000', strokeThickness: 8,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({
            targets: title, alpha: 1,
            scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 },
            duration: 600, ease: 'Back.Out',
        });

        // ── Stats panel ──────────────────────────────────────
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.55);
        panel.fillRoundedRect(W / 2 - 340, 155, 680, 230, 14);
        panel.lineStyle(2, 0xFF6D00, 0.5);
        panel.strokeRoundedRect(W / 2 - 340, 155, 680, 230, 14);

        // Score
        const scoreText = this.add.text(W / 2, 178, `SCORE: ${this.score.toLocaleString()}`, {
            fontSize: '28px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: scoreText, alpha: 1, duration: 300, delay: 350 });

        // P1 HP
        const p1hpText = this.add.text(W / 2 - (this.playerCount === 2 ? 150 : 0), 222,
            `🟠 P1 HP: ${Math.round(this.p1HP)} / ${GAME_CONFIG.PLAYER_MAX_HP}`, {
                fontSize: '20px', color: '#FF6D00', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: p1hpText, alpha: 1, duration: 300, delay: 450 });

        if (this.playerCount === 2) {
            const p2hpText = this.add.text(W / 2 + 150, 222,
                `🔵 P2 HP: ${Math.round(this.p2HP)} / ${GAME_CONFIG.PLAYER_MAX_HP}`, {
                    fontSize: '20px', color: '#42A5F5', fontStyle: 'bold',
                    stroke: '#000', strokeThickness: 4,
                }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: p2hpText, alpha: 1, duration: 300, delay: 520 });
        }

        // Invisibility charges
        const invisStr = `👻 Invisibility — P1: ×${this.invisCharges.p1}` +
            (this.playerCount === 2 ? `   P2: ×${this.invisCharges.p2}` : '');
        const invisText = this.add.text(W / 2, 262, invisStr, {
            fontSize: '18px', color: '#00E5FF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: invisText, alpha: 1, duration: 300, delay: 600 });

        if (this.wasBossLevel) {
            const bonusText = this.add.text(W / 2, 300, '🎁 Invisibility charge awarded for beating the boss!', {
                fontSize: '17px', color: '#FFD740',
                stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: bonusText, alpha: 1, duration: 300, delay: 700 });
        }

        const carryNote = this.add.text(W / 2, 345, '💚 HP carries over to the next level!', {
            fontSize: '15px', color: '#A5D6A7',
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: carryNote, alpha: 1, duration: 300, delay: 800 });

        // ── Next level preview ────────────────────────────────
        const previewPanel = this.add.graphics();
        previewPanel.fillStyle(0x000000, 0.5);
        previewPanel.fillRoundedRect(W / 2 - 280, 390, 560, 80, 10);
        previewPanel.lineStyle(2, 0x555555);
        previewPanel.strokeRoundedRect(W / 2 - 280, 390, 560, 80, 10);

        const nextLabel = this.add.text(W / 2, 403,
            `NEXT ▶  Level ${nextLevel} — ${nextLD.name}`, {
                fontSize: '22px', color: '#FFFFFF', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 5,
            }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: nextLabel, alpha: 1, duration: 300, delay: 950 });

        if (nextLD.isBossLevel) {
            const bossWarn = this.add.text(W / 2, 445, '⚠️  BOSS LEVEL!', {
                fontSize: '18px', color: '#FF1744', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: bossWarn, alpha: 1, duration: 300, delay: 1050 });
        }

        // ── Continue button ───────────────────────────────────
        const btnBG = this.add.graphics();
        btnBG.fillStyle(0xFF3D00);
        btnBG.fillRoundedRect(W / 2 - 160, 498, 320, 60, 12);
        btnBG.lineStyle(3, 0xFF6D00);
        btnBG.strokeRoundedRect(W / 2 - 160, 498, 320, 60, 12);

        const btnText = this.add.text(W / 2, 528, '▶  NEXT LEVEL!', {
            fontSize: '28px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: [btnBG, btnText], alpha: 1, duration: 300, delay: 1200 });

        // Pulse after appearing
        this.time.delayedCall(1600, () => {
            this.tweens.add({
                targets: btnText,
                scaleX: { from: 1, to: 1.05 }, scaleY: { from: 1, to: 1.05 },
                duration: 600, yoyo: true, repeat: -1,
            });
        });

        const hint = this.add.text(W / 2, H - 30,
            'Click the button or press any key to continue', {
                fontSize: '14px', color: '#555',
            }).setOrigin(0.5);

        // ── Input ────────────────────────────────────────────
        btnText.on('pointerdown', () => this._proceed());
        btnText.on('pointerover', () => btnText.setScale(1.06));
        btnText.on('pointerout',  () => btnText.setScale(1));

        // Any key after 1s
        this.time.delayedCall(1000, () => {
            this.input.keyboard.once('keydown', () => this._proceed());
        });
    }

    _burstFireworks(W, H) {
        for (let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 100, () => {
                const fx = Phaser.Math.Between(100, W - 100);
                const fy = Phaser.Math.Between(60, H * 0.45);
                const c  = Phaser.Math.RND.pick([0xFF6D00, 0xFFD740, 0x00E5FF, 0xFF80AB, 0x69F0AE]);
                for (let j = 0; j < 10; j++) {
                    const ang = (j / 10) * Math.PI * 2;
                    const d   = Phaser.Math.Between(40, 100);
                    const dot = this.add.circle(fx, fy, 4, c);
                    this.tweens.add({
                        targets: dot,
                        x: fx + Math.cos(ang) * d,
                        y: fy + Math.sin(ang) * d,
                        alpha: 0, duration: 700, ease: 'Power2',
                        onComplete: () => dot.destroy(),
                    });
                }
                const flash = this.add.circle(fx, fy, 22, c, 0.85);
                this.tweens.add({
                    targets: flash, scaleX: 3, scaleY: 3, alpha: 0,
                    duration: 380, onComplete: () => flash.destroy(),
                });
            });
        }
    }

    _proceed() {
        if (this._transitioning) return;
        this._transitioning = true;
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', {
                level:        this.level + 1,
                playerCount:  this.playerCount,
                p1HP:         Math.max(10, this.p1HP),
                p2HP:         Math.max(10, this.p2HP),
                invisCharges: this.invisCharges,
                score:        this.score,
            });
        });
    }
}
