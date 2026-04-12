// ============================================================
//  MenuScene – Title screen with 1P / 2P selection
// ============================================================
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

        // ── Background gradient ───────────────────────────────
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0D0520, 0x0D0520, 0x1A0A3E, 0x1A0A3E, 1);
        bg.fillRect(0, 0, W, H);

        // ── Stars ─────────────────────────────────────────────
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, W);
            const y = Phaser.Math.Between(0, H * 0.6);
            const r = Math.random() * 2 + 0.5;
            const a = Math.random() * 0.6 + 0.4;
            const c = this.add.circle(x, y, r, 0xFFFFFF, a);
            this.tweens.add({
                targets: c, alpha: { from: a, to: a * 0.3 },
                duration: Phaser.Math.Between(800, 2200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        }

        // ── Ground strip ─────────────────────────────────────
        const gfx = this.add.graphics();
        gfx.fillStyle(0x2E7D32);
        gfx.fillRect(0, H - 130, W, 130);
        gfx.fillStyle(0x1B5E20);
        gfx.fillRect(0, H - 135, W, 10);

        // ── Decorative trucks (background) ────────────────────
        this._drawDecorTruck(gfx, 80, H - 100, 0.8, 0x37474F);
        this._drawDecorTruck(gfx, W - 160, H - 100, 0.8, 0x37474F);

        // ── Title shadow ─────────────────────────────────────
        this.add.text(W / 2 + 4, 84, '🚛 MONSTER TRUCK MAYHEM! 🚛', {
            fontSize: '54px', color: '#000', fontStyle: 'bold',
        }).setOrigin(0.5);

        // ── Main title ───────────────────────────────────────
        const titleText = this.add.text(W / 2, 80, '🚛 MONSTER TRUCK MAYHEM! 🚛', {
            fontSize: '54px',
            color: '#FF6D00',
            fontStyle: 'bold',
            stroke: '#FF3D00',
            strokeThickness: 8,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            scaleX: { from: 1, to: 1.04 },
            scaleY: { from: 1, to: 1.04 },
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // ── Subtitle ─────────────────────────────────────────
        this.add.text(W / 2, 148, 'Smash, Shoot & Sprint Through 10 Wild Worlds!', {
            fontSize: '22px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);

        // ── Feature badges ───────────────────────────────────
        const features = ['🔥 Fire Cannon', '⚡ Sprint Boost', '🔄 Power Slide', '👻 Invisibility', '💥 Boss Fights'];
        features.forEach((f, i) => {
            const bx = W / 2 - 480 + i * 240;
            const badge = this.add.graphics();
            badge.fillStyle(0x000000, 0.5);
            badge.fillRoundedRect(bx - 80, 186, 160, 34, 8);
            badge.lineStyle(2, 0xFF6D00);
            badge.strokeRoundedRect(bx - 80, 186, 160, 34, 8);
            this.add.text(bx, 203, f, {
                fontSize: '16px', color: '#FFF', fontStyle: 'bold',
            }).setOrigin(0.5);
        });

        // ── Start menu music ──────────────────────────────────
        // Resume audio context (requires a user gesture, so we do it here
        // via the input listener; the buttons will also resume on click)
        this.input.keyboard.once('keydown', () => {
            if (window.AUDIO) window.AUDIO.resume();
        });
        // Start menu music immediately (will auto-resume when context unlocks)
        if (window.AUDIO) window.AUDIO.playTrack('menu');

        // ── 1 Player button ───────────────────────────────────
        const btn1 = this._makeButton(W / 2 - 180, 300, '🎮  1 PLAYER', 0xFF3D00, 0xFF6D00, () => {
            if (window.AUDIO) { window.AUDIO.resume(); window.AUDIO.sfx('winJingle'); }
            this._startGame(1);
        });

        // ── 2 Players button ──────────────────────────────────
        const btn2 = this._makeButton(W / 2 + 180, 300, '🎮🎮  2 PLAYERS', 0x1565C0, 0x42A5F5, () => {
            if (window.AUDIO) { window.AUDIO.resume(); window.AUDIO.sfx('winJingle'); }
            this._startGame(2);
        });

        // ── Controls legend ───────────────────────────────────
        const ctrlBg = this.add.graphics();
        ctrlBg.fillStyle(0x000000, 0.55);
        ctrlBg.fillRoundedRect(W / 2 - 540, 355, 1080, 170, 12);
        ctrlBg.lineStyle(2, 0x555555);
        ctrlBg.strokeRoundedRect(W / 2 - 540, 355, 1080, 170, 12);

        // P1 controls
        this.add.text(W / 2 - 390, 368, '🟠 PLAYER 1', {
            fontSize: '18px', color: '#FF6D00', fontStyle: 'bold',
        }).setOrigin(0.5);
        const p1Controls = [
            ['A / D', 'Move Left / Right'],
            ['W', 'Jump'],
            ['S', 'Slide'],
            ['SHIFT', 'Sprint'],
            ['SPACE', 'Shoot Fire'],
            ['I', 'Invisibility'],
        ];
        p1Controls.forEach(([key, desc], idx) => {
            const row = Math.floor(idx / 2), col = idx % 2;
            const px = W / 2 - 540 + col * 260 + 30;
            const py = 395 + row * 32;
            const kb = this.add.graphics();
            kb.fillStyle(0x333333);
            kb.fillRoundedRect(px, py, 60, 22, 4);
            kb.lineStyle(1, 0xAAAAAA);
            kb.strokeRoundedRect(px, py, 60, 22, 4);
            this.add.text(px + 30, py + 11, key, {
                fontSize: '12px', color: '#FFD740', fontStyle: 'bold',
            }).setOrigin(0.5);
            this.add.text(px + 70, py + 11, desc, {
                fontSize: '12px', color: '#CCC',
            }).setOrigin(0, 0.5);
        });

        // P2 controls
        this.add.text(W / 2 + 390, 368, '🔵 PLAYER 2', {
            fontSize: '18px', color: '#42A5F5', fontStyle: 'bold',
        }).setOrigin(0.5);
        const p2Controls = [
            ['← →', 'Move Left / Right'],
            ['↑', 'Jump'],
            ['↓', 'Slide'],
            ['CTRL', 'Sprint'],
            ['ENTER', 'Shoot Fire'],
            ['O', 'Invisibility'],
        ];
        p2Controls.forEach(([key, desc], idx) => {
            const row = Math.floor(idx / 2), col = idx % 2;
            const px = W / 2 + 10 + col * 260 + 30;
            const py = 395 + row * 32;
            const kb = this.add.graphics();
            kb.fillStyle(0x333333);
            kb.fillRoundedRect(px, py, 60, 22, 4);
            kb.lineStyle(1, 0xAAAAAA);
            kb.strokeRoundedRect(px, py, 60, 22, 4);
            this.add.text(px + 30, py + 11, key, {
                fontSize: '12px', color: '#42A5F5', fontStyle: 'bold',
            }).setOrigin(0.5);
            this.add.text(px + 70, py + 11, desc, {
                fontSize: '12px', color: '#CCC',
            }).setOrigin(0, 0.5);
        });

        // ── World preview row ─────────────────────────────────
        this.add.text(W / 2, 542, '10 WORLDS TO CONQUER:', {
            fontSize: '18px', color: '#FFD740', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5);

        const worlds = [
            { name: 'Forest', icon: '🌲', color: 0x2E7D32 },
            { name: 'Jungle', icon: '🌿', color: 0x1B5E20 },
            { name: 'Desert', icon: '🏜️', color: 0xF9A825 },
            { name: 'Cake',   icon: '🎂', color: 0xF06292 },
            { name: 'Pizza',  icon: '🍕', color: 0xFF5722 },
            { name: 'Zombie', icon: '🧟', color: 0x424242 },
            { name: 'Blocks', icon: '🧱', color: 0x8BC34A },
            { name: 'Bricks', icon: '🏗️', color: 0xCE93D8 },
            { name: 'Beach',  icon: '🏖️', color: 0x29B6F6 },
            { name: 'NYC',    icon: '🏙️', color: 0x607D8B },
        ];
        worlds.forEach((w, i) => {
            const wx = 80 + i * 112;
            const wy = 575;
            const wb = this.add.graphics();
            wb.fillStyle(w.color);
            wb.fillRoundedRect(wx - 44, wy - 22, 88, 52, 8);
            wb.lineStyle(2, 0xFFFFFF, 0.3);
            wb.strokeRoundedRect(wx - 44, wy - 22, 88, 52, 8);
            this.add.text(wx, wy - 4, w.icon, { fontSize: '20px' }).setOrigin(0.5);
            this.add.text(wx, wy + 16, w.name, {
                fontSize: '11px', color: '#FFF', fontStyle: 'bold',
            }).setOrigin(0.5);
        });

        // ── Copyright-free notice ─────────────────────────────
        this.add.text(W / 2, H - 18, '© 2025 Monster Truck Mayhem — All original artwork & design', {
            fontSize: '13px', color: '#555',
        }).setOrigin(0.5);

        // ── Entrance animation ────────────────────────────────
        [btn1, btn2].forEach(b => {
            b.setAlpha(0);
            this.tweens.add({ targets: b, alpha: 1, duration: 600, delay: 300, ease: 'Power2' });
        });
    }

    _makeButton(x, y, label, c1, c2, callback) {
        const container = this.add.container(x, y);
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-124, -26, 248, 52, 12);
        const bg = this.add.graphics();
        bg.fillGradientStyle(c2, c2, c1, c1, 1);
        bg.fillRoundedRect(-120, -28, 240, 52, 12);
        bg.lineStyle(3, 0xFFFFFF, 0.4);
        bg.strokeRoundedRect(-120, -28, 240, 52, 12);
        const text = this.add.text(0, -2, label, {
            fontSize: '22px', color: '#FFF', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, 240, 52, 0x000000, 0).setInteractive({ useHandCursor: true });
        hitArea.on('pointerover', () => {
            this.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 120, ease: 'Back.Out' });
        });
        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
        });
        hitArea.on('pointerdown', () => {
            this.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.94, duration: 80, yoyo: true,
                onComplete: callback });
        });
        container.add([shadow, bg, text, hitArea]);
        return container;
    }

    _drawDecorTruck(g, x, y, scale, color) {
        // Simple silhouette truck
        g.fillStyle(color, 0.3);
        g.fillRoundedRect(x, y, 80 * scale, 30 * scale, 4);
        g.fillRoundedRect(x + 14 * scale, y - 18 * scale, 36 * scale, 22 * scale, 4);
        g.fillCircle(x + 14 * scale, y + 28 * scale, 14 * scale);
        g.fillCircle(x + 62 * scale, y + 28 * scale, 14 * scale);
    }

    _startGame(playerCount) {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', {
                level: 1,
                playerCount,
                p1HP: GAME_CONFIG.PLAYER_MAX_HP,
                p2HP: GAME_CONFIG.PLAYER_MAX_HP,
                invisCharges: { p1: 0, p2: 0 },
                score: 0,
            });
        });
    }
}
