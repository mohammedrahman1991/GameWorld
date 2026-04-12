// ============================================================
//  WinScene – shown after completing all 10 levels
// ============================================================
class WinScene extends Phaser.Scene {
    constructor() { super({ key: 'WinScene' }); }

    init(data) {
        this.score       = data.score       || 0;
        this.playerCount = data.playerCount || 1;
    }

    create() {
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

        if (window.AUDIO) {
            window.AUDIO.playTrack('win');
            setTimeout(() => { if (window.AUDIO) window.AUDIO.speak('You win! Monster Truck Mayhem is complete! Amazing!'); }, 800);
        }

        // Celebration background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0D0520, 0x0D0520, 0x1A0A2E, 0x1A0A2E, 1);
        bg.fillRect(0, 0, W, H);

        // Continuous fireworks
        this._startFireworks(W, H);

        // Trophy / big checkmark
        const trophyText = this.add.text(W / 2, 70, '🏆', { fontSize: '80px' }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({
            targets: trophyText, alpha: 1, scaleX: { from: 0, to: 1 }, scaleY: { from: 0, to: 1 },
            duration: 800, ease: 'Back.Out',
        });
        this.tweens.add({
            targets: trophyText, y: { from: 70, to: 65 },
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            delay: 1000,
        });

        // Title
        const title = this.add.text(W / 2, 170, 'YOU WIN!!! 🎉', {
            fontSize: '80px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#FF6D00', strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({
            targets: title, alpha: 1, scaleX: { from: 0.3, to: 1 }, scaleY: { from: 0.3, to: 1 },
            duration: 900, ease: 'Back.Out', delay: 300,
        });

        // Subtitle
        const sub = this.add.text(W / 2, 258, 'ALL 10 WORLDS CONQUERED!', {
            fontSize: '32px', color: '#69F0AE', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: sub, alpha: 1, duration: 500, delay: 700 });

        // Score panel
        const panelBG = this.add.graphics().setAlpha(0).setName('panelBG');
        panelBG.fillStyle(0x000000, 0.6);
        panelBG.fillRoundedRect(W / 2 - 350, 295, 700, 190, 14);
        panelBG.lineStyle(3, 0xFFD740, 0.7);
        panelBG.strokeRoundedRect(W / 2 - 350, 295, 700, 190, 14);
        this.tweens.add({ targets: panelBG, alpha: 1, duration: 400, delay: 900 });

        const finalScore = this.add.text(W / 2, 320, `FINAL SCORE: ${this.score.toLocaleString()}`, {
            fontSize: '36px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setAlpha(0).setName('fscore');
        this.tweens.add({ targets: finalScore, alpha: 1, duration: 400, delay: 1000 });

        // Rank
        let rank, rankColor;
        if (this.score > 8000) {
            rank = '🌟 LEGENDARY TRUCKER! 🌟'; rankColor = '#FFD740';
        } else if (this.score > 5000) {
            rank = '⭐ MASTER TRUCKER! ⭐'; rankColor = '#C0C0C0';
        } else if (this.score > 2500) {
            rank = '🔥 AWESOME TRUCKER! 🔥'; rankColor = '#FF6D00';
        } else {
            rank = '🚛 ROAD WARRIOR! 🚛'; rankColor = '#69F0AE';
        }
        const rankText = this.add.text(W / 2, 375, rank, {
            fontSize: '28px', color: rankColor, fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0).setName('rank');
        this.tweens.add({ targets: rankText, alpha: 1, duration: 400, delay: 1200 });

        // World list
        const worldSummary = this.add.text(W / 2, 430, [
            '🌲 Forest  🌿 Jungle  🏜️ Desert  🎂 Cake  🍕 Pizza',
            '🧟 Zombie  🧱 Blocks  🏗️ Bricks  🏖️ Beach  🏙️ NYC',
        ].join('\n'), {
            fontSize: '18px', color: '#CCCCCC', align: 'center',
        }).setOrigin(0.5).setAlpha(0).setName('worlds');
        this.tweens.add({ targets: worldSummary, alpha: 1, duration: 400, delay: 1400 });

        // Play Again button
        const replayBG = this.add.graphics().setAlpha(0).setName('replayBG');
        replayBG.fillStyle(0xFF3D00);
        replayBG.fillRoundedRect(W / 2 - 200, 508, 400, 62, 14);
        replayBG.lineStyle(3, 0xFF6D00);
        replayBG.strokeRoundedRect(W / 2 - 200, 508, 400, 62, 14);
        this.tweens.add({ targets: replayBG, alpha: 1, duration: 300, delay: 1600 });

        const replayBtn = this.add.text(W / 2, 539, '🎮  PLAY AGAIN!', {
            fontSize: '30px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setAlpha(0).setName('replay').setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: replayBtn, alpha: 1, duration: 300, delay: 1600 });

        // Menu button
        const menuBG = this.add.graphics().setAlpha(0).setName('menuBG');
        menuBG.fillStyle(0x1565C0);
        menuBG.fillRoundedRect(W / 2 - 200, 586, 400, 55, 12);
        menuBG.lineStyle(3, 0x42A5F5);
        menuBG.strokeRoundedRect(W / 2 - 200, 586, 400, 55, 12);
        this.tweens.add({ targets: menuBG, alpha: 1, duration: 300, delay: 1700 });

        const menuBtn = this.add.text(W / 2, 613, '🏠  MAIN MENU', {
            fontSize: '24px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setName('menu').setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: menuBtn, alpha: 1, duration: 300, delay: 1700 });

        // Credits
        this.add.text(W / 2, H - 20, 'Monster Truck Mayhem — Original Game — All Rights Reserved', {
            fontSize: '12px', color: '#333',
        }).setOrigin(0.5);

        // Hover effects
        [replayBtn, menuBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setScale(1.06));
            btn.on('pointerout',  () => btn.setScale(1));
        });

        replayBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });
        menuBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        // Pulse play again
        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: replayBtn, scaleX: { from: 1, to: 1.05 }, scaleY: { from: 1, to: 1.05 },
                duration: 700, yoyo: true, repeat: -1,
            });
        });
    }

    _startFireworks(W, H) {
        const fireworkEvent = this.time.addEvent({
            delay: 400,
            repeat: -1,
            callback: () => {
                const fx = Phaser.Math.Between(80, W - 80);
                const fy = Phaser.Math.Between(50, H * 0.5);
                const hue = Phaser.Math.Between(0, 360);
                const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color;
                const count = Phaser.Math.Between(10, 20);
                for (let j = 0; j < count; j++) {
                    const ang = (j / count) * Math.PI * 2;
                    const d = Phaser.Math.Between(50, 140);
                    const dot = this.add.circle(fx, fy, Phaser.Math.Between(3, 6), color);
                    this.tweens.add({
                        targets: dot,
                        x: fx + Math.cos(ang) * d,
                        y: fy + Math.sin(ang) * d + 30,
                        alpha: 0, duration: Phaser.Math.Between(600, 1000),
                        ease: 'Power2', onComplete: () => dot.destroy(),
                    });
                }
                const flash = this.add.circle(fx, fy, 30, color, 0.8);
                this.tweens.add({
                    targets: flash, scaleX: 4, scaleY: 4, alpha: 0,
                    duration: 400, onComplete: () => flash.destroy(),
                });
            }
        });
    }
}
