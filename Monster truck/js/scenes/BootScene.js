// ============================================================
//  BootScene – generates all game textures procedurally
//  No external image assets needed – fully copyright-free
// ============================================================
class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    create() {
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
        const g = this.add.graphics();

        // ── 1×1 white pixel (utility) ─────────────────────────
        g.clear(); g.fillStyle(0xFFFFFF); g.fillRect(0,0,1,1);
        g.generateTexture('pixel', 1, 1); g.destroy();

        // ── Monster Trucks ────────────────────────────────────
        this._makeTruck('truck_p1', 0xFF3D00, 0xFF6D00, 0xBF360C);
        this._makeTruck('truck_p2', 0x1565C0, 0x42A5F5, 0x0D47A1);

        // ── Projectiles ───────────────────────────────────────
        this._makeFireball('fireball_p1', 0xFF6D00, 0xFF3D00);
        this._makeFireball('fireball_p2', 0x00B0FF, 0x0091EA);
        this._makeFireball('enemy_proj',  0xAA00FF, 0x6200EA);

        // ── HP Drop Box ───────────────────────────────────────
        this._makeHPBox();

        // ── Goal Portal ───────────────────────────────────────
        this._makeGoal();

        // ── Enemies ───────────────────────────────────────────
        this._makeSlime('slime',        0x66BB6A, 0x43A047);
        this._makeSlime('treeling',     0x8D6E63, 0x6D4C41);
        this._makeHumanoid('vineCreeper', 0x2E7D32, 0x1B5E20, 0xFFFF00);
        this._makeHumanoid('jungleSkull', 0xF4511E, 0xBF360C, 0xFF1744);
        this._makeSpider('sandScorpion', 0xFFA726, 0xE65100);
        this._makeSlime('cactusFiend',  0x66BB6A, 0x2E7D32);
        this._makeSlime('candyChomper', 0xFF4081, 0xC51162);
        this._makeGhost('frostingGhost',0xF8BBD0, 0xF48FB1);
        this._makeSpinner('pizzaGobbler',0xFF5722, 0xFFCC02);
        this._makeSlime('cheeseBlob',   0xFFD740, 0xFFA000);
        this._makeHumanoid('kidZombie', 0x8BC34A, 0x558B2F, 0x76FF03);
        this._makeGhost('ghost',        0xB39DDB, 0x7E57C2);
        this._makeCube('cubeCreep',     0x4FC3F7, 0x0288D1);
        this._makeSpider('pixelSpider', 0xCE93D8, 0x7B1FA2);
        this._makeCube('brickling',     0xCE93D8, 0x9C27B0);
        this._makeHumanoid('neonBot',   0x00E5FF, 0x00B0FF, 0xFF1744);
        this._makeHumanoid('waveRider', 0x29B6F6, 0x0288D1, 0xFFFFFF);
        this._makeSpider('sandCrab',    0xFFD54F, 0xF57F17);
        this._makeHumanoid('cityGremlin',0x78909C, 0x546E7A, 0xFFD600);
        this._makeGhost('rooftopBat',   0x37474F, 0x263238);

        // ── Bosses ────────────────────────────────────────────
        this._makeBoss('boss_jungleKing',  0x4E342E, 0x76FF03,  130);
        this._makeBoss('boss_cakeGolem',   0xF06292, 0xFFFFFF,  155);
        this._makeBoss('boss_zombieLord',  0x558B2F, 0x76FF03,  175);
        this._makeBoss('boss_brickTitan',  0x7C4DFF, 0x00E5FF,  195);
        this._makeBoss('boss_megaMech',    0x212121, 0xFF1744,  215);

        // ── Background decoration sheets ─────────────────────
        this._makeTree();
        this._makeCactus();

        // ── Show loading message then go to menu ──────────────
        this.add.rectangle(W/2, H/2, W, H, 0x0D0520);
        const title = this.add.text(W/2, H/2 - 30, '🚛 MONSTER TRUCK MAYHEM', {
            fontSize: '42px', color: '#FF6D00', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5);
        const sub = this.add.text(W/2, H/2 + 30, 'Loading...', {
            fontSize: '26px', color: '#FFF', fontStyle: 'bold',
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [title, sub], alpha: { from: 0, to: 1 },
            duration: 600, ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    this.scene.start('MenuScene');
                });
            }
        });
    }

    // ── Truck texture ────────────────────────────────────────
    _makeTruck(key, body, cab, shadow) {
        const TW = 100, TH = 72;
        const g = this.add.graphics();

        // Shadow / body underside
        g.fillStyle(shadow);
        g.fillRect(6, 30, TW - 12, 30);

        // Rear fender
        g.fillStyle(shadow);
        g.fillRect(0, 32, 18, 20);

        // Main body
        g.fillStyle(body);
        g.fillRoundedRect(4, 22, TW - 8, 32, 6);

        // Cab
        g.fillStyle(cab);
        g.fillRoundedRect(22, 4, 46, 26, 8);

        // Windshield (light blue glass)
        g.fillStyle(0xB3E5FC, 0.9);
        g.fillRoundedRect(24, 6, 28, 18, 4);
        // Windshield glare
        g.fillStyle(0xFFFFFF, 0.5);
        g.fillRect(26, 8, 10, 5);

        // Exhaust pipe
        g.fillStyle(0x757575);
        g.fillRect(34, 0, 6, 10);
        g.fillStyle(0x9E9E9E);
        g.fillRect(35, 1, 4, 8);

        // Front bumper
        g.fillStyle(0x616161);
        g.fillRect(TW - 14, 26, 14, 22);
        g.fillStyle(0x9E9E9E);
        g.fillRect(TW - 12, 28, 10, 4);

        // Grill bars
        g.fillStyle(0xBDBDBD);
        for (let i = 0; i < 3; i++) {
            g.fillRect(TW - 14, 28 + i * 5, 13, 2);
        }

        // Wheels (drawn AFTER body so they appear on top of overlap)
        const wheelColor = 0x212121;
        const treadColor = 0x424242;
        const hubColor   = 0x9E9E9E;
        const rearX = 18, frontX = 78, wheelY = 54, wheelR = 18;

        for (const wx of [rearX, frontX]) {
            // Tire
            g.fillStyle(wheelColor);
            g.fillCircle(wx, wheelY, wheelR);
            // Tread highlight
            g.lineStyle(3, treadColor);
            g.strokeCircle(wx, wheelY, wheelR - 2);
            // Hub cap
            g.fillStyle(hubColor);
            g.fillCircle(wx, wheelY, 7);
            // Lug nuts
            g.fillStyle(0x616161);
            for (let a = 0; a < 5; a++) {
                const ang = (a / 5) * Math.PI * 2;
                g.fillCircle(wx + Math.cos(ang) * 4, wheelY + Math.sin(ang) * 4, 1.5);
            }
        }

        // Fire nozzle on front
        g.fillStyle(0x9E9E9E);
        g.fillRect(TW - 2, 32, 10, 6);
        g.fillStyle(0xFF6D00);
        g.fillRect(TW + 4, 30, 5, 10);

        g.generateTexture(key, TW + 10, TH);
        g.destroy();
    }

    // ── Fireball ─────────────────────────────────────────────
    _makeFireball(key, c1, c2) {
        const g = this.add.graphics();
        g.fillStyle(c1, 0.9);
        g.fillEllipse(14, 10, 28, 20);
        g.fillStyle(c2, 0.8);
        g.fillEllipse(14, 10, 20, 14);
        g.fillStyle(0xFFFF00, 0.7);
        g.fillEllipse(14, 10, 10, 8);
        // Tail
        g.fillStyle(c1, 0.6);
        g.fillTriangle(0, 5, 8, 10, 0, 15);
        g.generateTexture(key, 28, 20);
        g.destroy();
    }

    // ── HP drop box ──────────────────────────────────────────
    _makeHPBox() {
        const g = this.add.graphics();
        // Crate body
        g.fillStyle(0x8B4513);
        g.fillRect(2, 2, 44, 44);
        // Crate boards
        g.lineStyle(2, 0x5D2E0C);
        g.strokeRect(2, 2, 44, 44);
        g.lineBetween(24, 2, 24, 46);
        g.lineBetween(2, 24, 46, 24);
        // Metal corners
        g.fillStyle(0xAAAAAA);
        for (const [cx, cy] of [[2,2],[44,2],[2,44],[44,44]]) {
            g.fillRect(cx - 1, cy - 1, 6, 6);
        }
        // Red cross
        g.fillStyle(0xFF1744);
        g.fillRect(16, 8, 16, 32);
        g.fillRect(8, 16, 32, 16);
        // White cross highlight
        g.fillStyle(0xFFFFFF, 0.5);
        g.fillRect(18, 10, 5, 28);
        g.generateTexture('hpBox', 48, 48);
        g.destroy();
    }

    // ── Goal portal ──────────────────────────────────────────
    _makeGoal() {
        const g = this.add.graphics();
        // Outer ring
        g.lineStyle(6, 0xFFD700);
        g.strokeCircle(40, 50, 36);
        g.lineStyle(4, 0xFFF176);
        g.strokeCircle(40, 50, 28);
        // Portal center glow
        g.fillStyle(0x00E5FF, 0.8);
        g.fillCircle(40, 50, 22);
        g.fillStyle(0xFFFFFF, 0.6);
        g.fillCircle(40, 50, 12);
        // Star
        g.fillStyle(0xFFD700);
        this._drawStar(g, 40, 50, 5, 10, 6);
        // Flag pole
        g.fillStyle(0xFFD700);
        g.fillRect(76, 14, 4, 70);
        // Flag
        g.fillStyle(0xFF3D00);
        g.fillTriangle(80, 14, 110, 22, 80, 30);
        g.generateTexture('goal', 120, 100);
        g.destroy();
    }

    // ── Slime enemy (goofy derpy face) ───────────────────────
    _makeSlime(key, c1, c2) {
        const g = this.add.graphics();
        // Wobbly body
        g.fillStyle(c1);
        g.fillEllipse(25, 32, 50, 42);
        g.fillStyle(c2);
        g.fillEllipse(25, 34, 44, 36);
        // Shine blobs
        g.fillStyle(0xFFFFFF, 0.45);
        g.fillEllipse(16, 22, 14, 9);
        g.fillEllipse(34, 20, 8, 5);
        // Big googly eyes — one bigger than the other
        g.fillStyle(0xFFFFFF);
        g.fillCircle(16, 26, 9);
        g.fillCircle(34, 24, 6);
        // Pupils pointing in slightly different directions (derp)
        g.fillStyle(0x111111);
        g.fillCircle(14, 28, 5);
        g.fillCircle(36, 23, 3);
        // Eye shine
        g.fillStyle(0xFFFFFF);
        g.fillCircle(12, 26, 2);
        g.fillCircle(35, 22, 1.5);
        // Goofy wide mouth
        g.lineStyle(3, 0x111111);
        g.beginPath();
        g.arc(25, 38, 10, 0.15, Math.PI - 0.15);
        g.strokePath();
        // Little tongue
        g.fillStyle(0xFF80AB);
        g.fillEllipse(25, 47, 10, 6);
        // Antennae
        g.lineStyle(2, c2);
        g.lineBetween(18, 12, 12, 4);
        g.fillStyle(c1);
        g.fillCircle(12, 4, 3);
        g.lineBetween(32, 10, 38, 2);
        g.fillStyle(c1);
        g.fillCircle(38, 2, 3);
        g.generateTexture(key, 52, 52);
        g.destroy();
    }

    // ── Humanoid enemy (goofy big-head tiny-body) ────────────
    _makeHumanoid(key, bodyC, headC, eyeC) {
        const g = this.add.graphics();
        // Tiny body
        g.fillStyle(bodyC);
        g.fillRoundedRect(11, 30, 24, 22, 4);
        // Flailing arms at funny angles
        g.fillStyle(bodyC);
        g.fillRoundedRect(0, 28, 12, 8, 3);   // left arm up
        g.fillRoundedRect(34, 34, 12, 8, 3);  // right arm down
        // Stubby legs
        g.fillStyle(headC);
        g.fillRoundedRect(12, 50, 9, 14, 3);
        g.fillRoundedRect(25, 50, 9, 14, 3);
        // Big oversized head
        g.fillStyle(headC);
        g.fillCircle(23, 16, 18);
        // Huge googly eyes
        g.fillStyle(0xFFFFFF);
        g.fillCircle(16, 12, 7);
        g.fillCircle(30, 12, 7);
        g.fillStyle(0x111111);
        g.fillCircle(17, 14, 4);
        g.fillCircle(31, 14, 4);
        g.fillStyle(eyeC);
        g.fillCircle(18, 13, 2);
        g.fillCircle(32, 13, 2);
        g.fillStyle(0xFFFFFF);
        g.fillCircle(15, 11, 1.5);
        g.fillCircle(29, 11, 1.5);
        // Silly grin
        g.lineStyle(2.5, 0x111111);
        g.beginPath();
        g.arc(23, 23, 7, 0.1, Math.PI - 0.1);
        g.strokePath();
        // Buckteeth
        g.fillStyle(0xFFFFFF);
        g.fillRect(20, 23, 4, 4);
        g.fillRect(25, 23, 4, 4);
        // Little hat or hair tuft
        g.fillStyle(headC);
        g.fillTriangle(23, 0, 16, 8, 30, 8);
        g.generateTexture(key, 46, 66);
        g.destroy();
    }

    // ── Spider/crab enemy (cute chubby derp) ─────────────────
    _makeSpider(key, c1, c2) {
        const g = this.add.graphics();
        // Wiggly bent legs
        g.lineStyle(3.5, c2);
        const legs = [[-22,-8],[-24,4],[-20,16],[-14,24],[22,-8],[24,4],[20,16],[14,24]];
        for (const [dx, dy] of legs) {
            const mx = 25 + dx * 0.5, my = 30 + dy * 0.3;
            g.beginPath(); g.moveTo(25, 32);
            g.lineTo(mx, my); g.lineTo(25 + dx, 30 + dy);
            g.strokePath();
        }
        // Round chubby body
        g.fillStyle(c1);
        g.fillCircle(25, 32, 20);
        g.fillStyle(c2);
        g.fillCircle(25, 27, 13);
        // Shine
        g.fillStyle(0xFFFFFF, 0.35);
        g.fillEllipse(20, 22, 10, 7);
        // Six eyes in a row (goofy)
        g.fillStyle(0xFFFFFF);
        for (const ex of [14, 21, 28, 35]) {
            g.fillCircle(ex, 24, 4.5);
        }
        g.fillStyle(0x111111);
        for (const ex of [14, 21, 28, 35]) {
            g.fillCircle(ex + 1, 25, 2.5);
        }
        // Red pupils on middle two
        g.fillStyle(0xFF1744);
        g.fillCircle(22, 24, 1.5);
        g.fillCircle(29, 24, 1.5);
        // Little frown
        g.lineStyle(2, 0x111111);
        g.beginPath();
        g.arc(25, 36, 5, Math.PI + 0.3, -0.3);
        g.strokePath();
        g.generateTexture(key, 54, 56);
        g.destroy();
    }

    // ── Ghost enemy (goofy scared expression) ────────────────
    _makeGhost(key, c1, c2) {
        const g = this.add.graphics();
        // Puffy body
        g.fillStyle(c1, 0.88);
        g.fillRoundedRect(3, 6, 44, 42, { tl: 22, tr: 22, bl: 0, br: 0 });
        // Wavy bottom (4 bumps)
        g.fillStyle(c1, 0.88);
        for (let i = 0; i < 4; i++) {
            g.fillCircle(7 + i * 12, 48, 8);
        }
        // Inner shading
        g.fillStyle(c2, 0.3);
        g.fillRoundedRect(10, 11, 30, 28, { tl: 15, tr: 15, bl: 0, br: 0 });
        // Big surprised eyes (O_O)
        g.fillStyle(0xFFFFFF);
        g.fillCircle(16, 24, 9);
        g.fillCircle(34, 24, 9);
        g.fillStyle(0x111111);
        g.fillCircle(16, 24, 6);
        g.fillCircle(34, 24, 6);
        g.fillStyle(0xFFFFFF);
        g.fillCircle(13, 21, 2.5);
        g.fillCircle(31, 21, 2.5);
        // "O" shaped surprised mouth
        g.fillStyle(0x111111);
        g.fillEllipse(25, 38, 10, 8);
        g.fillStyle(0xCC2222);
        g.fillEllipse(25, 38, 7, 5);
        // Tiny arms waving
        g.fillStyle(c1, 0.88);
        g.fillRoundedRect(-3, 22, 10, 6, 3);
        g.fillRoundedRect(43, 18, 10, 6, 3);
        g.generateTexture(key, 54, 58);
        g.destroy();
    }

    // ── Spinning enemy (dizzy pizza face) ────────────────────
    _makeSpinner(key, c1, c2) {
        const g = this.add.graphics();
        // Pizza crust outline
        g.fillStyle(c2);
        g.fillCircle(24, 24, 22);
        g.fillStyle(0xFFB74D);
        g.fillCircle(24, 24, 19);
        // Sauce
        g.fillStyle(0xE53935, 0.7);
        g.fillCircle(24, 24, 15);
        // Slice lines
        g.lineStyle(2, c2, 0.7);
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            g.lineBetween(24, 24, 24 + Math.cos(ang) * 19, 24 + Math.sin(ang) * 19);
        }
        // Pepperoni
        g.fillStyle(0xBF360C);
        g.fillCircle(13, 16, 4);
        g.fillCircle(33, 14, 3);
        g.fillCircle(16, 32, 3);
        g.fillCircle(32, 32, 4);
        // Big dizzy eyes (X eyes = dizzy)
        g.fillStyle(0xFFFFFF);
        g.fillCircle(18, 21, 5);
        g.fillCircle(30, 21, 5);
        g.lineStyle(2.5, 0x111111);
        // X left eye
        g.lineBetween(15, 18, 21, 24); g.lineBetween(21, 18, 15, 24);
        // X right eye
        g.lineBetween(27, 18, 33, 24); g.lineBetween(33, 18, 27, 24);
        // Happy drool mouth
        g.lineStyle(2, 0x111111);
        g.beginPath(); g.arc(24, 28, 6, 0, Math.PI); g.strokePath();
        g.fillStyle(0xFFFFFF);
        g.fillRect(21, 28, 3, 4);
        g.fillRect(25, 28, 3, 4);
        g.generateTexture(key, 48, 48);
        g.destroy();
    }

    // ── Cube enemy (goofy wobbly block face) ─────────────────
    _makeCube(key, c1, c2) {
        const g = this.add.graphics();
        // Slightly uneven cube for goofy look
        g.fillStyle(c1);
        g.fillRect(2, 6, 44, 40);
        // Top face lighter
        const r = ((c1 >> 16) & 0xFF), gr = ((c1 >> 8) & 0xFF), b = (c1 & 0xFF);
        const lighter = (Math.min(255, r + 60) << 16) | (Math.min(255, gr + 60) << 8) | Math.min(255, b + 60);
        g.fillStyle(lighter);
        g.fillRect(2, 6, 44, 9);
        // Right side darker
        g.fillStyle(c2);
        g.fillRect(42, 6, 8, 40);
        // Cracked grid lines
        g.lineStyle(1.5, c2, 0.55);
        g.strokeRect(2, 6, 44, 40);
        g.lineBetween(2, 22, 46, 22);
        g.lineBetween(2, 36, 46, 36);
        g.lineBetween(18, 6, 18, 46);
        g.lineBetween(34, 6, 34, 46);
        // Huge silly eyes — one squinting
        g.fillStyle(0xFFFFFF);
        g.fillRect(8, 16, 14, 14);   // left big eye
        g.fillRect(28, 18, 10, 8);   // right squinty eye
        // Pupils
        g.fillStyle(0x111111);
        g.fillRect(12, 20, 7, 7);
        g.fillRect(30, 19, 5, 5);
        // Coloured irises
        g.fillStyle(0xFF1744);
        g.fillRect(13, 21, 4, 4);
        g.fillStyle(0xFF6D00);
        g.fillRect(31, 20, 3, 3);
        // Gleam
        g.fillStyle(0xFFFFFF);
        g.fillRect(12, 19, 2, 2);
        g.fillRect(30, 19, 2, 2);
        // Wobbly raised eyebrow on one side
        g.lineStyle(3.5, 0x111111);
        g.lineBetween(6, 13, 24, 15);   // normal brow
        g.lineBetween(26, 16, 40, 12);  // raised brow
        // Goofy jagged smile
        g.lineStyle(2.5, 0x111111);
        g.beginPath();
        g.moveTo(10, 38); g.lineTo(14, 42); g.lineTo(18, 38);
        g.lineTo(22, 43); g.lineTo(26, 38); g.lineTo(30, 43); g.lineTo(36, 38);
        g.strokePath();
        g.generateTexture(key, 52, 52);
        g.destroy();
    }

    // ── Boss texture ─────────────────────────────────────────
    _makeBoss(key, bodyC, accentC, size) {
        const S = size;
        const g = this.add.graphics();

        // Body (large rounded rectangle)
        g.fillStyle(bodyC);
        g.fillRoundedRect(8, S * 0.2, S - 16, S * 0.75, 20);

        // Accent details
        g.fillStyle(accentC, 0.8);
        g.fillRoundedRect(16, S * 0.25, S - 32, S * 0.15, 8);

        // Head bump
        g.fillStyle(bodyC);
        g.fillCircle(S / 2, S * 0.15, S * 0.28);

        // Eyes (big scary)
        const ex1 = S * 0.35, ex2 = S * 0.65, ey = S * 0.13;
        g.fillStyle(accentC);
        g.fillCircle(ex1, ey, S * 0.1);
        g.fillCircle(ex2, ey, S * 0.1);
        g.fillStyle(0x000000);
        g.fillCircle(ex1 + 2, ey + 2, S * 0.06);
        g.fillCircle(ex2 + 2, ey + 2, S * 0.06);
        g.fillStyle(0xFFFFFF);
        g.fillCircle(ex1 - 1, ey - 2, S * 0.025);
        g.fillCircle(ex2 - 1, ey - 2, S * 0.025);

        // Mouth / teeth
        g.fillStyle(0x000000);
        g.fillRoundedRect(S * 0.35, S * 0.2, S * 0.3, S * 0.06, 4);
        g.fillStyle(0xFFFFFF);
        const teethW = S * 0.3 / 4;
        for (let t = 0; t < 4; t++) {
            g.fillRect(S * 0.35 + t * teethW + 2, S * 0.2, teethW - 3, S * 0.04);
        }

        // Arms
        g.fillStyle(bodyC);
        g.fillRoundedRect(0, S * 0.3, S * 0.15, S * 0.4, 8);
        g.fillRoundedRect(S - S * 0.15, S * 0.3, S * 0.15, S * 0.4, 8);

        // Accent arms
        g.fillStyle(accentC, 0.5);
        g.fillRect(0, S * 0.34, S * 0.12, 6);
        g.fillRect(S - S * 0.12, S * 0.34, S * 0.12, 6);

        // Legs
        g.fillStyle(bodyC);
        g.fillRoundedRect(S * 0.2, S * 0.88, S * 0.22, S * 0.15, 6);
        g.fillRoundedRect(S * 0.58, S * 0.88, S * 0.22, S * 0.15, 6);

        // HP bar outline above boss (drawn by HUD separately, just visual marker)
        g.lineStyle(4, accentC);
        g.strokeRect(8, S * 0.2, S - 16, S * 0.75);

        g.generateTexture(key, S, S);
        g.destroy();
    }

    // ── Background tree ──────────────────────────────────────
    _makeTree() {
        const g = this.add.graphics();
        // Trunk
        g.fillStyle(0x6D4C41);
        g.fillRect(20, 40, 16, 30);
        // Foliage layers
        g.fillStyle(0x2E7D32);
        g.fillTriangle(28, 0, 0, 40, 56, 40);
        g.fillStyle(0x388E3C);
        g.fillTriangle(28, 10, 4, 44, 52, 44);
        g.fillStyle(0x43A047);
        g.fillTriangle(28, 20, 8, 48, 48, 48);
        g.generateTexture('tree', 56, 70);
        g.destroy();
    }

    // ── Cactus ───────────────────────────────────────────────
    _makeCactus() {
        const g = this.add.graphics();
        g.fillStyle(0x558B2F);
        g.fillRect(18, 8, 20, 62);
        g.fillRect(2, 28, 18, 14);
        g.fillRect(36, 20, 18, 14);
        // Spines
        g.lineStyle(1.5, 0x33691E);
        for (let y = 12; y < 70; y += 8) {
            g.lineBetween(18, y, 10, y - 6);
            g.lineBetween(38, y, 46, y - 6);
        }
        g.generateTexture('cactus', 54, 70);
        g.destroy();
    }

    // ── Utility: draw star ────────────────────────────────────
    _drawStar(g, cx, cy, points, outer, inner) {
        g.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const x2 = cx + Math.cos(a) * r;
            const y2 = cy + Math.sin(a) * r;
            i === 0 ? g.moveTo(x2, y2) : g.lineTo(x2, y2);
        }
        g.closePath();
        g.fillPath();
    }
}
