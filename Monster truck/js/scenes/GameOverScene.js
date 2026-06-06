// ============================================================
//  GameOverScene
// ============================================================
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }

    init(data) {
        this.level       = data.level       || 1;
        this.playerCount = data.playerCount || 1;
        this.score       = data.score       || 0;
    }

    create() {
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

        // Music & voice
        if (window.AUDIO) {
            window.AUDIO.playTrack('gameover');
            window.AUDIO.sfx('hit');
            setTimeout(() => { if (window.AUDIO) window.AUDIO.speak('Oh no! Game over! Try again!'); }, 600);
        }

        // Dark red background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1A0000, 0x1A0000, 0x3D0000, 0x3D0000, 1);
        bg.fillRect(0, 0, W, H);

        // Particles (falling embers)
        for (let i = 0; i < 50; i++) {
            const ember = this.add.circle(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(-H, 0),
                Phaser.Math.Between(2, 5),
                Phaser.Math.RND.pick([0xFF6D00, 0xFF3D00, 0xFFD740])
            );
            this.tweens.add({
                targets: ember,
                y: H + 20,
                x: ember.x + Phaser.Math.Between(-60, 60),
                duration: Phaser.Math.Between(2000, 4000),
                delay: Phaser.Math.Between(0, 2000),
                repeat: -1,
                onRepeat: () => {
                    ember.x = Phaser.Math.Between(0, W);
                    ember.y = -10;
                },
            });
        }

        // Broken truck silhouette
        const truckG = this.add.graphics();
        truckG.fillStyle(0x333333, 0.7);
        truckG.fillRoundedRect(W / 2 - 80, H / 2 - 10, 160, 50, 6);
        truckG.fillRoundedRect(W / 2 - 40, H / 2 - 40, 70, 38, 6);
        truckG.fillStyle(0x212121);
        truckG.fillCircle(W / 2 - 50, H / 2 + 38, 22);
        truckG.fillCircle(W / 2 + 50, H / 2 + 38, 22);
        // X eyes on truck
        truckG.lineStyle(4, 0xFF1744, 0.8);
        truckG.lineBetween(W / 2 - 18, H / 2 - 30, W / 2 - 8, H / 2 - 20);
        truckG.lineBetween(W / 2 - 8, H / 2 - 30, W / 2 - 18, H / 2 - 20);

        // Title
        const title = this.add.text(W / 2, 100, '💥 GAME OVER 💥', {
            fontSize: '70px', color: '#FF1744', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: title,
            alpha: 1, scaleX: { from: 0.3, to: 1 }, scaleY: { from: 0.3, to: 1 },
            duration: 800, ease: 'Back.Out',
        });

        // Stats
        this.add.text(W / 2, 210, [
            `Reached: Level ${this.level} — ${LEVEL_DATA[this.level - 1].name}`,
            `Final Score: ${this.score.toLocaleString()}`,
        ].join('\n'), {
            fontSize: '24px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5, align: 'center',
        }).setOrigin(0.5).setAlpha(0).setName('stats');
        this.tweens.add({ targets: this.getByName('stats'), alpha: 1, duration: 400, delay: 600 });

        // Encouraging message
        const msgs = [
            "Keep truckin'! 🚛",
            "Don't give up! You got this! 💪",
            "One more try! 🔥",
            "The monsters won... this time! 👾",
        ];
        this.add.text(W / 2, 310, Phaser.Math.RND.pick(msgs), {
            fontSize: '26px', color: '#FF80AB', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('msg');
        this.tweens.add({ targets: this.getByName('msg'), alpha: 1, duration: 400, delay: 900 });

        // Retry button
        const retryBG = this.add.graphics().setAlpha(0).setName('retryBG');
        retryBG.fillStyle(0xFF3D00);
        retryBG.fillRoundedRect(W / 2 - 190, 430, 380, 60, 12);
        retryBG.lineStyle(3, 0xFF6D00);
        retryBG.strokeRoundedRect(W / 2 - 190, 430, 380, 60, 12);
        this.tweens.add({ targets: retryBG, alpha: 1, duration: 300, delay: 1100 });

        const retryBtn = this.add.text(W / 2, 460, '🔄  RETRY THIS LEVEL', {
            fontSize: '26px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0).setName('retryBtn').setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: retryBtn, alpha: 1, duration: 300, delay: 1100 });

        // Menu button
        const menuBG = this.add.graphics().setAlpha(0).setName('menuBG');
        menuBG.fillStyle(0x1565C0);
        menuBG.fillRoundedRect(W / 2 - 190, 512, 380, 55, 12);
        menuBG.lineStyle(3, 0x42A5F5);
        menuBG.strokeRoundedRect(W / 2 - 190, 512, 380, 55, 12);
        this.tweens.add({ targets: menuBG, alpha: 1, duration: 300, delay: 1200 });

        const menuBtn = this.add.text(W / 2, 539, '🏠  MAIN MENU', {
            fontSize: '22px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('menuBtn').setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: menuBtn, alpha: 1, duration: 300, delay: 1200 });

        // Hover effects
        [retryBtn, menuBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setScale(1.06));
            btn.on('pointerout',  () => btn.setScale(1));
        });

        retryBtn.on('pointerdown', () => this._retry());
        menuBtn.on('pointerdown',  () => this._menu());

        // Button pulse
        this.time.delayedCall(1400, () => {
            this.tweens.add({
                targets: retryBtn, alpha: { from: 1, to: 0.7 },
                duration: 500, yoyo: true, repeat: -1,
            });
        });

        this.add.text(W / 2, H - 30, 'Press R to retry  |  Press M for menu', {
            fontSize: '14px', color: '#555',
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-R', () => this._retry());
        this.input.keyboard.on('keydown-M', () => this._menu());

        // Share button
        if (window.WackyShare) {
            const _sb = document.getElementById('wb-mt-share') || (() => { const b=document.createElement('button'); b.id='wb-mt-share'; b.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 32px;background:linear-gradient(135deg,#f97316,#fbbf24);border:none;border-radius:12px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;z-index:999;'; b.textContent='⬆ Share Score'; document.body.appendChild(b); return b; })();
            _sb.style.display='block'; _sb.onclick=()=>WackyShare.show('Monster Truck',`I reached level ${this.level} with score ${this.score.toLocaleString()} in Monster Truck!`,'https://wackybrains.com/Monster%20truck/');
        }
    }

    _retry() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', {
                level: this.level,
                playerCount: this.playerCount,
                p1HP: GAME_CONFIG.PLAYER_MAX_HP,
                p2HP: GAME_CONFIG.PLAYER_MAX_HP,
                invisCharges: { p1: 0, p2: 0 },
                score: this.score,
            });
        });
    }

    _menu() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}
