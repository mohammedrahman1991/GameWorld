// ============================================================
//  GameScene – Core gameplay: truck physics, enemies, bosses,
//  HP, sprints, slides, fire, invisibility, 10 levels
// ============================================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    // ── Scene init (called before create each time) ───────────
    init(data) {
        this.currentLevel  = data.level       || 1;
        this.playerCount   = data.playerCount || 1;
        this.p1HP          = data.p1HP        !== undefined ? data.p1HP : GAME_CONFIG.PLAYER_MAX_HP;
        this.p2HP          = data.p2HP        !== undefined ? data.p2HP : GAME_CONFIG.PLAYER_MAX_HP;
        this.invisCharges  = data.invisCharges || { p1: 0, p2: 0 };
        this.score         = data.score        || 0;

        // Per-frame state
        this.p1SprintTimer   = 0;  this.p1SprintCooldown   = 0;
        this.p2SprintTimer   = 0;  this.p2SprintCooldown   = 0;
        this.p1IsSprinting   = false; this.p2IsSprinting   = false;
        this.p1SlideTimer    = 0;  this.p2SlideTimer       = 0;
        this.p1IsSliding     = false; this.p2IsSliding     = false;
        this.p1FireCooldown  = 0;  this.p2FireCooldown     = 0;
        this.p1InvisTimer    = 0;  this.p2InvisTimer       = 0;
        this.p1LastHit       = -9999; this.p2LastHit       = -9999;

        this.bossActive      = false;
        this.bossRef         = null;
        this.bossHP          = 0;
        this.bossAttackTimer = 0;
        this.bossPhase       = 1;
        this.bossZoneLocked  = false;
        this.bossKilled      = false;
        this.gameState       = 'playing'; // 'playing' | 'bossIntro' | 'boss' | 'levelComplete' | 'dead'
        this.levelCompleteTriggered = false;
    }

    // ═══════════════════════════════════════════════════════════
    //  CREATE
    // ═══════════════════════════════════════════════════════════
    create() {
        const ld = LEVEL_DATA[this.currentLevel - 1];
        this.ld = ld;
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
        const worldW = ld.worldLength;

        // ── Physics world bounds ──────────────────────────────
        this.physics.world.setBounds(0, 0, worldW, H);
        this.physics.world.gravity.y = GAME_CONFIG.GRAVITY;

        // ── Background ───────────────────────────────────────
        this._createBackground(worldW, H, ld);

        // ── Ground & Platforms ────────────────────────────────
        this.platforms = this.physics.add.staticGroup();
        this._createGround(worldW, ld);
        this._createPlatforms(ld);

        // ── Groups ────────────────────────────────────────────
        this.enemies          = this.physics.add.group();
        this.projectiles      = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        this.hpBoxes          = this.physics.add.staticGroup();

        // ── Players ───────────────────────────────────────────
        this._createPlayers(H);

        // ── Enemies ───────────────────────────────────────────
        this._spawnAllEnemies(ld);

        // ── HP Boxes ─────────────────────────────────────────
        this._createHPBoxes(ld);

        // ── Goal ─────────────────────────────────────────────
        this._createGoal(worldW, H);

        // ── Boss zone trigger ─────────────────────────────────
        if (ld.isBossLevel) {
            this._createBossZoneTrigger(worldW, H);
        }

        // ── Camera ────────────────────────────────────────────
        this._setupCamera(worldW, H);

        // ── Input ────────────────────────────────────────────
        this._setupInput();

        // ── Collisions ───────────────────────────────────────
        this._setupCollisions();

        // ── Music ─────────────────────────────────────────────
        if (window.AUDIO) {
            window.AUDIO.resume();
            window.AUDIO.playTrack(ld.isBossLevel ? 'boss' : 'play');
        }

        // ── HUD ──────────────────────────────────────────────
        this.scene.launch('HUDScene', {
            playerCount: this.playerCount,
            p1HP: this.p1HP, p2HP: this.p2HP,
            level: this.currentLevel,
            levelName: ld.name,
            invisCharges: this.invisCharges,
            isBossLevel: ld.isBossLevel,
            bossMaxHP: ld.isBossLevel ? ld.boss.hp : 0,
        });
        this.hudScene = this.scene.get('HUDScene');
    }

    // ── Background world art ─────────────────────────────────
    _createBackground(worldW, H, ld) {
        const g = this.add.graphics();

        // Sky gradient — 4 bands for depth
        g.fillStyle(ld.sky.top);
        g.fillRect(0, 0, worldW, H * 0.25);
        // Blend band
        const rt = (ld.sky.top >> 16) & 0xFF, gt2 = (ld.sky.top >> 8) & 0xFF, bt = ld.sky.top & 0xFF;
        const rb = (ld.sky.bottom >> 16) & 0xFF, gb2 = (ld.sky.bottom >> 8) & 0xFF, bb = ld.sky.bottom & 0xFF;
        const mid = (((rt+rb)>>1) << 16) | (((gt2+gb2)>>1) << 8) | ((bt+bb)>>1);
        g.fillStyle(mid);
        g.fillRect(0, H * 0.25, worldW, H * 0.25);
        g.fillStyle(ld.sky.bottom);
        g.fillRect(0, H * 0.5, worldW, H * 0.5);

        // Fluffy cloud layer (behind everything)
        this._drawClouds(g, worldW, H);

        // World-specific decorations
        switch (ld.world) {
            case 'forest':    this._bgForest(g, worldW, H, ld);    break;
            case 'jungle':    this._bgJungle(g, worldW, H, ld);    break;
            case 'desert':    this._bgDesert(g, worldW, H, ld);    break;
            case 'cake':      this._bgCake(g, worldW, H, ld);      break;
            case 'pizza':     this._bgPizza(g, worldW, H, ld);     break;
            case 'zombie':    this._bgZombie(g, worldW, H, ld);    break;
            case 'blockworld':this._bgBlockWorld(g, worldW, H, ld);break;
            case 'brickland': this._bgBrickLand(g, worldW, H, ld); break;
            case 'beach':     this._bgBeach(g, worldW, H, ld);     break;
            case 'nyc':       this._bgNYC(g, worldW, H, ld);       break;
        }
    }

    _drawClouds(g, worldW, H) {
        for (let x = 80; x < worldW; x += Phaser.Math.Between(200, 350)) {
            const cy = Phaser.Math.Between(40, H * 0.32);
            const scale = 0.6 + Math.random() * 0.8;
            const alpha = 0.55 + Math.random() * 0.35;
            g.fillStyle(0xFFFFFF, alpha);
            // Main puff
            g.fillEllipse(x, cy, 90 * scale, 46 * scale);
            // Extra puffs
            g.fillEllipse(x - 28 * scale, cy + 6 * scale, 58 * scale, 36 * scale);
            g.fillEllipse(x + 30 * scale, cy + 4 * scale, 64 * scale, 38 * scale);
            g.fillEllipse(x - 8 * scale, cy - 16 * scale, 52 * scale, 32 * scale);
        }
    }

    _bgForest(g, W, H, ld) {
        // Rolling hills
        g.fillStyle(0x388E3C, 0.4);
        for (let x = 0; x < W; x += 280) {
            g.fillEllipse(x + 140, H - 200, 340, 200);
        }
        // Background trees
        for (let x = 60; x < W; x += Phaser.Math.Between(90, 160)) {
            const h = Phaser.Math.Between(80, 140);
            g.fillStyle(0x2E7D32);
            g.fillTriangle(x, H - 220, x - 40, H - 220 + h, x + 40, H - 220 + h);
            g.fillStyle(0x1B5E20);
            g.fillTriangle(x, H - 240, x - 30, H - 240 + h * 0.75, x + 30, H - 240 + h * 0.75);
            g.fillStyle(0x6D4C41);
            g.fillRect(x - 8, H - 220 + h, 16, 30);
        }
        // Flowers
        for (let x = 80; x < W; x += 80) {
            const flowerColors = [0xFF80AB, 0xFFFF00, 0xFF6D00, 0xFFFFFF];
            g.fillStyle(Phaser.Math.RND.pick(flowerColors));
            g.fillCircle(x + Phaser.Math.Between(-20, 20), H - 165, 5);
        }
    }

    _bgJungle(g, W, H, ld) {
        // Dark canopy
        for (let x = 0; x < W; x += 120) {
            g.fillStyle(0x1B5E20, 0.7);
            g.fillEllipse(x + 60, 80, 160, 130);
        }
        // Hanging vines
        g.lineStyle(3, 0x33691E, 0.8);
        for (let x = 80; x < W; x += 140) {
            const vineLen = Phaser.Math.Between(80, 180);
            g.lineBetween(x, 0, x + Phaser.Math.Between(-20, 20), vineLen);
        }
        // Jungle plants
        for (let x = 40; x < W; x += 100) {
            g.fillStyle(0x2E7D32);
            g.fillTriangle(x, H - 200, x - 30, H - 140, x + 30, H - 140);
        }
        // Ruins (stone blocks)
        for (let x = 300; x < W; x += 500) {
            g.fillStyle(0x616161, 0.5);
            g.fillRect(x, H - 260, 60, 80);
            g.fillRect(x + 80, H - 230, 50, 50);
        }
    }

    _bgDesert(g, W, H, ld) {
        // Sun
        g.fillStyle(0xFFD600);
        g.fillCircle(W * 0.15, 90, 55);
        g.fillStyle(0xFFFF00, 0.3);
        g.fillCircle(W * 0.15, 90, 75);
        // Dunes
        for (let x = 0; x < W; x += 300) {
            g.fillStyle(0xFFA726, 0.5);
            g.fillEllipse(x + 150, H - 180, 400, 180);
        }
        // Cacti (bg)
        for (let x = 150; x < W; x += 220) {
            g.fillStyle(0x558B2F);
            g.fillRect(x - 7, H - 270, 14, 90);
            g.fillRect(x - 20, H - 250, 14, 30);
            g.fillRect(x + 7, H - 240, 14, 25);
        }
        // Heat shimmer lines
        g.lineStyle(2, 0xFFEE58, 0.15);
        for (let x = 0; x < W; x += 60) {
            g.lineBetween(x, H - 200, x + 30, H - 160);
        }
    }

    _bgCake(g, W, H, ld) {
        // Rainbow sky
        const rainbowColors = [0xFF1744, 0xFF6D00, 0xFFD600, 0x00E676, 0x00B0FF, 0x651FFF];
        rainbowColors.forEach((c, i) => {
            g.fillStyle(c, 0.15);
            g.fillRect(0, i * (H / rainbowColors.length), W, H / rainbowColors.length);
        });
        // Giant cake layers in background
        const cakeColors = [0xF48FB1, 0xF8BBD0, 0xFFD54F, 0xA5D6A7];
        for (let x = 100; x < W; x += 400) {
            cakeColors.forEach((c, i) => {
                g.fillStyle(c, 0.4);
                g.fillRect(x - 60 + i * 5, H - 280 + i * 45, 180 - i * 10, 40);
            });
            // Frosting drips
            g.fillStyle(0xFFFFFF, 0.6);
            for (let d = 0; d < 5; d++) {
                g.fillEllipse(x - 40 + d * 30, H - 238, 14, 22);
            }
        }
        // Floating candy sprinkles
        const sprinkleColors = [0xFF80AB, 0x69F0AE, 0xFF6D00, 0x40C4FF, 0xFFD740];
        for (let i = 0; i < 60; i++) {
            g.fillStyle(Phaser.Math.RND.pick(sprinkleColors));
            g.fillRect(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(0, H - 200),
                Phaser.Math.Between(6, 16), 4
            );
        }
    }

    _bgPizza(g, W, H, ld) {
        // Orange sky with pizza-slice sun
        g.fillStyle(0xFF5722, 0.3);
        g.fillCircle(W * 0.8, 80, 70);
        // Crust lines
        g.lineStyle(4, 0xBF360C, 0.5);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.lineBetween(W * 0.8, 80,
                W * 0.8 + Math.cos(a) * 65, 80 + Math.sin(a) * 65);
        }
        // Cheese blobs in background
        for (let x = 100; x < W; x += 200) {
            g.fillStyle(0xFFCC02, 0.4);
            g.fillEllipse(x, H - 230, 120, 80);
        }
        // Tomato sauce splashes
        for (let x = 50; x < W; x += 160) {
            g.fillStyle(0xBF360C, 0.3);
            g.fillCircle(x, H - 210, Phaser.Math.Between(20, 45));
        }
    }

    _bgZombie(g, W, H, ld) {
        // Dark purple fog
        g.fillStyle(0x4A148C, 0.2);
        for (let x = 0; x < W; x += 200) {
            g.fillEllipse(x + 100, H - 150, 280, 120);
        }
        // Dead trees
        g.lineStyle(5, 0x37474F);
        for (let x = 80; x < W; x += 200) {
            g.lineBetween(x, H - 160, x, H - 320);
            g.lineBetween(x, H - 280, x - 30, H - 330);
            g.lineBetween(x, H - 260, x + 25, H - 310);
            g.lineBetween(x, H - 310, x - 15, H - 345);
        }
        // Tombstones
        for (let x = 160; x < W; x += 300) {
            g.fillStyle(0x546E7A, 0.6);
            g.fillRoundedRect(x - 15, H - 230, 30, 45, { tl: 10, tr: 10, bl: 0, br: 0 });
            g.fillStyle(0x455A64);
            g.fillRect(x - 8, H - 208, 16, 2);
            g.fillRect(x - 1, H - 220, 2, 22);
        }
        // Full moon
        g.fillStyle(0xFFF9C4, 0.8);
        g.fillCircle(W * 0.85, 70, 45);
        g.fillStyle(0xE0E0E0, 0.3);
        g.fillCircle(W * 0.85 + 18, 65, 14);
    }

    _bgBlockWorld(g, W, H, ld) {
        // Pixelated clouds
        const blockSize = 16;
        const cloudPositions = [];
        for (let x = 80; x < W; x += 260) {
            cloudPositions.push({ x, y: Phaser.Math.Between(50, 160) });
        }
        cloudPositions.forEach(({ x, y }) => {
            g.fillStyle(0xFFFFFF, 0.85);
            [
                [0, 0, 3, 1], [-1, -1, 2, 1], [1, -1, 3, 1], [0, 1, 4, 1]
            ].forEach(([bx, by, bw, bh]) => {
                g.fillRect(x + bx * blockSize, y + by * blockSize, bw * blockSize, bh * blockSize);
            });
        });
        // Pixelated mountains
        for (let x = 0; x < W; x += 320) {
            g.fillStyle(0x78909C, 0.5);
            const mh = Phaser.Math.Between(100, 180);
            for (let row = 0; row < mh / blockSize; row++) {
                const w2 = (mh / blockSize - row) * blockSize * 1.5;
                g.fillRect(x + 160 - w2 / 2, H - 220 - row * blockSize, w2, blockSize);
            }
            // Snow cap
            g.fillStyle(0xFFFFFF, 0.8);
            g.fillRect(x + 160 - blockSize * 2, H - 220 - mh + blockSize, blockSize * 4, blockSize * 2);
        }
    }

    _bgBrickLand(g, W, H, ld) {
        // Neon grid lines
        g.lineStyle(1, 0x00E5FF, 0.12);
        for (let x = 0; x < W; x += 80) g.lineBetween(x, 0, x, H);
        for (let y = 0; y < H; y += 80) g.lineBetween(0, y, W, y);
        // Floating platforms (background)
        const platColors = [0xE040FB, 0x00E5FF, 0xFF6D00, 0x69F0AE];
        for (let x = 80; x < W; x += 200) {
            g.fillStyle(Phaser.Math.RND.pick(platColors), 0.3);
            g.fillRoundedRect(x - 40, Phaser.Math.Between(H - 380, H - 250), 80, 14, 4);
        }
        // Brick structures
        for (let x = 100; x < W; x += 350) {
            const bColors = [0xFF1744, 0xFFD600, 0x00E5FF, 0x69F0AE];
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    g.fillStyle(Phaser.Math.RND.pick(bColors), 0.35);
                    g.fillRect(x + col * 22, H - 250 - row * 22, 20, 20);
                    g.lineStyle(1, 0x000000, 0.3);
                    g.strokeRect(x + col * 22, H - 250 - row * 22, 20, 20);
                }
            }
        }
    }

    _bgBeach(g, W, H, ld) {
        // Ocean
        g.fillStyle(0x0288D1, 0.4);
        for (let x = 0; x < W; x += 120) {
            g.fillEllipse(x + 60, H - 160, 160, 60);
        }
        // Waves
        g.lineStyle(3, 0x4FC3F7, 0.6);
        for (let x = 0; x < W; x += 80) {
            g.beginPath();
            g.moveTo(x, H - 195);
            g.lineTo(x + 20, H - 205);
            g.lineTo(x + 40, H - 195);
            g.lineTo(x + 60, H - 205);
            g.lineTo(x + 80, H - 195);
            g.strokePath();
        }
        // Palm trees
        for (let x = 140; x < W; x += 280) {
            // Trunk
            g.lineStyle(10, 0x795548);
            g.lineBetween(x, H - 160, x + 20, H - 320);
            // Fronds
            g.lineStyle(6, 0x2E7D32);
            const tx = x + 20, ty = H - 320;
            [[-60, -40], [-30, -70], [10, -70], [50, -40], [60, -10], [-60, -10]].forEach(([dx, dy]) => {
                g.lineBetween(tx, ty, tx + dx, ty + dy);
            });
            // Coconuts
            g.fillStyle(0x795548);
            g.fillCircle(tx - 8, ty + 12, 7);
            g.fillCircle(tx + 8, ty + 8, 7);
        }
        // Beach balls
        for (let x = 200; x < W; x += 400) {
            const ballColors = [0xFF1744, 0x00E5FF, 0xFFD600];
            ballColors.forEach((c, i) => {
                g.fillStyle(c, 0.7);
                g.fillCircle(x, H - 175, 18);
            });
            g.lineStyle(2, 0xFFFFFF, 0.5);
            g.strokeCircle(x, H - 175, 18);
        }
    }

    _bgNYC(g, W, H, ld) {
        // City skyline
        const buildingColors = [0x37474F, 0x455A64, 0x546E7A, 0x263238, 0x4A4A4A];
        for (let x = 0; x < W; x += Phaser.Math.Between(60, 100)) {
            const bh = Phaser.Math.Between(120, 300);
            const bw = Phaser.Math.Between(40, 80);
            g.fillStyle(Phaser.Math.RND.pick(buildingColors), 0.75);
            g.fillRect(x, H - 180 - bh, bw, bh);
            // Windows
            g.fillStyle(0xFFD600, 0.8);
            const cols = Math.floor(bw / 14);
            const rows = Math.floor(bh / 18);
            for (let wr = 1; wr < rows - 1; wr++) {
                for (let wc = 0; wc < cols; wc++) {
                    if (Math.random() > 0.35) {
                        g.fillRect(x + wc * 14 + 4, H - 180 - bh + wr * 18 + 4, 8, 10);
                    }
                }
            }
        }
        // Water towers
        for (let x = 200; x < W; x += 450) {
            g.fillStyle(0x5D4037);
            g.fillRect(x, H - 380, 4, 30);
            g.fillRect(x + 20, H - 380, 4, 30);
            g.fillStyle(0x6D4C41, 0.8);
            g.fillEllipse(x + 12, H - 370, 36, 26);
        }
        // Taxi strip (yellow road markings)
        g.fillStyle(0xFFD600, 0.3);
        g.fillRect(0, H - 170, W, 10);
        // Street lights
        for (let x = 100; x < W; x += 200) {
            g.lineStyle(3, 0x9E9E9E, 0.8);
            g.lineBetween(x, H - 160, x, H - 260);
            g.lineBetween(x, H - 260, x + 20, H - 260);
            g.fillStyle(0xFFFFFF, 0.9);
            g.fillCircle(x + 20, H - 260, 5);
        }
    }

    // ── Ground ───────────────────────────────────────────────
    _createGround(worldW, ld) {
        const G = GAME_CONFIG.GROUND_Y, GH = GAME_CONFIG.GROUND_H;
        const ground = this.platforms.create(worldW / 2, G + GH / 2, 'pixel');
        ground.setDisplaySize(worldW, GH);
        ground.setTint(ld.ground.color);
        ground.refreshBody();

        // Dirt layer
        const dirt = this.add.graphics();
        dirt.fillStyle(ld.ground.dirt);
        dirt.fillRect(0, G + 10, worldW, GH);
        dirt.fillStyle(ld.ground.color);
        dirt.fillRect(0, G, worldW, 10);

        // Grass blades / ground detail
        this._drawGroundDetail(dirt, worldW, G, ld);
    }

    _drawGroundDetail(g, worldW, groundY, ld) {
        switch (ld.world) {
            case 'forest': case 'jungle':
                g.fillStyle(0x66BB6A, 0.7);
                for (let x = 0; x < worldW; x += 12) {
                    const h = Phaser.Math.Between(6, 14);
                    g.fillTriangle(x, groundY, x + 5, groundY, x + 2, groundY - h);
                }
                break;
            case 'desert':
                g.fillStyle(0xFFA726, 0.4);
                for (let x = 0; x < worldW; x += 40) {
                    g.fillEllipse(x + 20, groundY, Phaser.Math.Between(30, 70), 8);
                }
                break;
            case 'cake':
                // Frosting drips
                g.fillStyle(0xFFFFFF, 0.5);
                for (let x = 20; x < worldW; x += 60) {
                    g.fillEllipse(x, groundY + 4, 24, 16);
                }
                break;
            case 'zombie':
                // Cracks
                g.lineStyle(2, 0x000000, 0.4);
                for (let x = 60; x < worldW; x += 120) {
                    g.lineBetween(x, groundY, x + 20, groundY + 8);
                    g.lineBetween(x + 20, groundY + 8, x + 30, groundY + 4);
                }
                break;
            case 'beach':
                // Wet sand shimmer
                g.fillStyle(0xFFECB3, 0.3);
                for (let x = 0; x < worldW; x += 80) {
                    g.fillEllipse(x + 40, groundY + 5, 100, 12);
                }
                break;
            case 'nyc':
                // Road lines
                g.fillStyle(0xFFFFFF, 0.4);
                for (let x = 100; x < worldW; x += 120) {
                    g.fillRect(x, groundY + 20, 60, 6);
                }
                break;
        }
    }

    // ── Platforms ────────────────────────────────────────────
    _createPlatforms(ld) {
        if (!ld.platforms) return;
        ld.platforms.forEach(p => {
            const plat = this.platforms.create(p.x + p.width / 2, p.y, 'pixel');
            plat.setDisplaySize(p.width, 18);
            plat.setTint(p.color || 0x888888);
            plat.refreshBody();

            // Visual decoration on top of platform
            const g = this.add.graphics();
            g.lineStyle(3, 0xFFFFFF, 0.35);
            g.lineBetween(p.x, p.y - 9, p.x + p.width, p.y - 9);
        });
    }

    // ── Players ──────────────────────────────────────────────
    _createPlayers(H) {
        const GY = GAME_CONFIG.GROUND_Y;
        this.p1 = this.physics.add.sprite(160, GY - 40, 'truck_p1');
        this.p1.setCollideWorldBounds(true);
        this.p1.body.setSize(90, 52);
        this.p1.body.setOffset(5, 12);
        this.p1.setData('player', 'p1');
        this.p1.setDepth(10);

        if (this.playerCount === 2) {
            this.p2 = this.physics.add.sprite(260, GY - 40, 'truck_p2');
            this.p2.setCollideWorldBounds(true);
            this.p2.body.setSize(90, 52);
            this.p2.body.setOffset(5, 12);
            this.p2.setData('player', 'p2');
            this.p2.setDepth(10);
        }
    }

    // ── Spawn all enemies ────────────────────────────────────
    _spawnAllEnemies(ld) {
        ld.enemyGroups.forEach(group => {
            for (let i = 0; i < group.count; i++) {
                const x = group.startX + i * group.spacing;
                this._spawnEnemy(group.type, x, GAME_CONFIG.GROUND_Y - 35, ld);
            }
        });
    }

    _spawnEnemy(type, x, y, ld) {
        const stats = ld.enemyStats[type];
        if (!stats) return null;

        const key = type;
        const enemy = this.enemies.create(x, y, key);
        enemy.setData('type', type);
        enemy.setData('hp', stats.hp);
        enemy.setData('maxHp', stats.hp);
        enemy.setData('speed', stats.speed);
        enemy.setData('damage', stats.damage);
        enemy.setData('score', stats.score);
        enemy.setData('shooter', stats.shooter || false);
        enemy.setData('floats', stats.floats || false);
        enemy.setData('floatBase', y);
        enemy.setData('shootTimer', 0);
        enemy.setData('alive', true);
        enemy.setBounceY(0.05);
        enemy.setCollideWorldBounds(true);

        if (stats.floats) {
            enemy.body.allowGravity = false;
        }

        enemy.setDepth(8);
        return enemy;
    }

    // ── HP Boxes ─────────────────────────────────────────────
    _createHPBoxes(ld) {
        ld.hpBoxes.forEach(box => {
            const b = this.hpBoxes.create(box.x, GAME_CONFIG.GROUND_Y - 28, 'hpBox');
            b.setDisplaySize(42, 42);
            b.refreshBody();
            b.setDepth(7);
            // Floating bob
            this.tweens.add({
                targets: b, y: { from: GAME_CONFIG.GROUND_Y - 28, to: GAME_CONFIG.GROUND_Y - 40 },
                duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            // Glow pulse
            this.tweens.add({
                targets: b, alpha: { from: 1, to: 0.7 },
                duration: 600, yoyo: true, repeat: -1,
            });
        });
    }

    // ── Goal ─────────────────────────────────────────────────
    _createGoal(worldW, H) {
        const GY = GAME_CONFIG.GROUND_Y;
        this.goal = this.add.image(worldW - 160, GY - 55, 'goal').setDepth(6);
        // Store goal X for update() proximity check
        this.goalX = worldW - 160;
        // Spin + bob
        this.tweens.add({
            targets: this.goal, angle: 360, duration: 4000, repeat: -1, ease: 'Linear',
        });
        this.tweens.add({
            targets: this.goal, y: { from: GY - 55, to: GY - 68 },
            duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // ── Boss zone trigger ────────────────────────────────────
    _createBossZoneTrigger(worldW, H) {
        const triggerX = worldW - GAME_CONFIG.BOSS_ZONE_OFFSET;
        this.bossZoneTrigger = this.add.zone(triggerX, GAME_CONFIG.GROUND_Y - 100, 60, 300);
        this.physics.world.enable(this.bossZoneTrigger);
        this.bossZoneTrigger.body.setAllowGravity(false);

        // Visual marker (faint)
        const g = this.add.graphics();
        g.lineStyle(3, 0xFF1744, 0.3);
        g.lineBetween(triggerX, 0, triggerX, GAME_CONFIG.HEIGHT);
        g.setDepth(1);
    }

    // ── Camera ───────────────────────────────────────────────
    _setupCamera(worldW, H) {
        this.cameras.main.setBounds(0, 0, worldW, H);
        this.cameras.main.setLerp(0.1, 0.0);
        if (this.playerCount === 2 && this.p2) {
            // 2P: follow a virtual midpoint target so startFollow is always active
            this._camTarget = { x: (this.p1.x + this.p2.x) / 2, y: H / 2 };
            this.cameras.main.startFollow(this._camTarget, true, 0.1, 0.0);
        } else {
            this._camTarget = null;
            this.cameras.main.startFollow(this.p1, true, 0.1, 0.0);
        }
    }

    // ── Input ────────────────────────────────────────────────
    _setupInput() {
        // P1
        this.keyA     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyS     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyI     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        // P2
        this.keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyCtrl  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyO     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);

        // Cooldown flags for one-shot keys
        this._p1JumpHeld = false;
        this._p2JumpHeld = false;
        this._p1InvisHeld = false;
        this._p2InvisHeld = false;
    }

    // ── Collisions ───────────────────────────────────────────
    _setupCollisions() {
        // Players stand on platforms
        this.physics.add.collider(this.p1, this.platforms);
        if (this.p2) this.physics.add.collider(this.p2, this.platforms);

        // Enemies stand on platforms
        this.physics.add.collider(this.enemies, this.platforms);

        // Fireballs hit enemies
        this.physics.add.overlap(this.projectiles, this.enemies,
            this._onFireballHitEnemy, null, this);

        // Enemy projectiles hit players
        this.physics.add.overlap(this.enemyProjectiles, this.p1,
            (proj, player) => this._onEnemyProjectileHitPlayer(proj, player, 'p1'), null, this);
        if (this.p2) {
            this.physics.add.overlap(this.enemyProjectiles, this.p2,
                (proj, player) => this._onEnemyProjectileHitPlayer(proj, player, 'p2'), null, this);
        }

        // Players collect HP boxes
        this.physics.add.overlap(this.p1, this.hpBoxes,
            (player, box) => this._onCollectHPBox(player, box, 'p1'), null, this);
        if (this.p2) {
            this.physics.add.overlap(this.p2, this.hpBoxes,
                (player, box) => this._onCollectHPBox(player, box, 'p2'), null, this);
        }

        // Goal is checked by X-position in update() — no zone needed
    }

    // ═══════════════════════════════════════════════════════════
    //  UPDATE
    // ═══════════════════════════════════════════════════════════
    update(time, delta) {
        if (this.gameState === 'dead' || this.gameState === 'levelComplete') return;

        // Handle player input
        this._handleP1Input(time, delta);
        if (this.playerCount === 2 && this.p2 && this.p2.active) {
            this._handleP2Input(time, delta);
        }

        // Update camera for 2P
        if (this.playerCount === 2 && this.p2 && this.p2.active) {
            this._update2PCamera();
        }

        // Enemy AI
        this._updateEnemyAI(time, delta);

        // Boss logic
        if (this.bossActive && this.bossRef && this.bossRef.active) {
            this._updateBoss(time, delta);
        }

        // Invisibility timers
        this._updateInvisibility(time, delta);

        // Sprint FX
        this._updateSprintFX(time);

        // Slide FX
        this._updateSlideFX(time, delta);

        // Boss zone check
        if (this.ld.isBossLevel && !this.bossActive && !this.bossKilled) {
            this._checkBossZone();
        }

        // Goal proximity check — trigger when player reaches end 250px of world
        if (!this.levelCompleteTriggered && this.goalX && this.p1) {
            const threshold = this.goalX - 250;
            const p1Near = this.p1.x >= threshold;
            const p2Near = this.playerCount === 2 && this.p2 ? this.p2.x >= threshold : false;
            if (p1Near || p2Near) {
                this._onReachGoal();
            }
        }

        // Keep projectiles alive for at most FIRE_LIFETIME ms
        this.projectiles.getChildren().forEach(p => {
            if (time - p.getData('born') > GAME_CONFIG.FIRE_LIFETIME) {
                this._popProjectile(p);
            }
        });
        this.enemyProjectiles.getChildren().forEach(p => {
            if (time - p.getData('born') > GAME_CONFIG.FIRE_LIFETIME) {
                p.destroy();
            }
        });
    }

    // ── P1 Input ──────────────────────────────────────────────
    _handleP1Input(time, delta) {
        if (!this.p1 || !this.p1.active) return;
        const onGround = this.p1.body.blocked.down;
        const speed = this.p1IsSprinting ? GAME_CONFIG.PLAYER_SPRINT_SPEED :
                      this.p1IsSliding   ? GAME_CONFIG.SLIDE_SPEED : GAME_CONFIG.PLAYER_SPEED;

        // Movement
        if (this.keyA.isDown) {
            this.p1.setVelocityX(-speed);
            this.p1.setFlipX(true);
        } else if (this.keyD.isDown) {
            this.p1.setVelocityX(speed);
            this.p1.setFlipX(false);
        } else {
            this.p1.setVelocityX(0);
        }

        // Jump (W)
        if (this.keyW.isDown && !this._p1JumpHeld && onGround) {
            this.p1.setVelocityY(GAME_CONFIG.PLAYER_JUMP_VEL);
            this._p1JumpHeld = true;
            this._popDust(this.p1.x, this.p1.y + 30);
            this._truckTalk(this.p1, 'JUMP');
            if (window.AUDIO) window.AUDIO.sfx('jump');
        }
        if (!this.keyW.isDown) this._p1JumpHeld = false;

        // Slide (S)
        if (this.keyS.isDown && onGround && !this.p1IsSliding) {
            this.p1IsSliding = true;
            this.p1SlideTimer = GAME_CONFIG.SLIDE_DURATION;
            this.p1.body.setSize(90, 30);
            this.p1.body.setOffset(5, 34);
        }
        if (this.p1IsSliding) {
            this.p1SlideTimer -= 16;
            if (this.p1SlideTimer <= 0) {
                this.p1IsSliding = false;
                this.p1.body.setSize(90, 52);
                this.p1.body.setOffset(5, 12);
            }
        }

        // Sprint (SHIFT)
        if (this.keyShift.isDown && !this.p1IsSprinting && this.p1SprintCooldown <= 0) {
            this.p1IsSprinting = true;
            this.p1SprintTimer = GAME_CONFIG.SPRINT_DURATION;
            this.p1SprintCooldown = GAME_CONFIG.SPRINT_COOLDOWN;
            this._truckTalk(this.p1, 'SPRINT');
        }
        if (this.p1IsSprinting) {
            this.p1SprintTimer -= delta;
            if (this.p1SprintTimer <= 0) this.p1IsSprinting = false;
        }
        if (this.p1SprintCooldown > 0) this.p1SprintCooldown -= delta;

        // Fire (SPACE)
        if (this.keySpace.isDown && time > this.p1FireCooldown) {
            this._shoot(this.p1, 'fireball_p1', time);
            this.p1FireCooldown = time + GAME_CONFIG.FIRE_COOLDOWN;
            if (window.AUDIO) window.AUDIO.sfx('shoot');
            if (Math.random() < 0.35) this._truckTalk(this.p1, 'FIRE');
        }

        // Invisibility (I)
        if (this.keyI.isDown && !this._p1InvisHeld) {
            this._activateInvisibility('p1', time);
            this._p1InvisHeld = true;
        }
        if (!this.keyI.isDown) this._p1InvisHeld = false;

        // Contact damage with enemies
        this._checkPlayerEnemyContact(this.p1, 'p1', time);
    }

    // ── P2 Input ──────────────────────────────────────────────
    _handleP2Input(time, delta) {
        if (!this.p2 || !this.p2.active) return;
        const onGround = this.p2.body.blocked.down;
        const speed = this.p2IsSprinting ? GAME_CONFIG.PLAYER_SPRINT_SPEED :
                      this.p2IsSliding   ? GAME_CONFIG.SLIDE_SPEED : GAME_CONFIG.PLAYER_SPEED;

        if (this.keyLeft.isDown) {
            this.p2.setVelocityX(-speed);
            this.p2.setFlipX(true);
        } else if (this.keyRight.isDown) {
            this.p2.setVelocityX(speed);
            this.p2.setFlipX(false);
        } else {
            this.p2.setVelocityX(0);
        }

        if (this.keyUp.isDown && !this._p2JumpHeld && onGround) {
            this.p2.setVelocityY(GAME_CONFIG.PLAYER_JUMP_VEL);
            this._p2JumpHeld = true;
            this._popDust(this.p2.x, this.p2.y + 30);
            this._truckTalk(this.p2, 'JUMP');
            if (window.AUDIO) window.AUDIO.sfx('jump');
        }
        if (!this.keyUp.isDown) this._p2JumpHeld = false;

        if (this.keyDown.isDown && onGround && !this.p2IsSliding) {
            this.p2IsSliding = true;
            this.p2SlideTimer = GAME_CONFIG.SLIDE_DURATION;
            this.p2.body.setSize(90, 30);
            this.p2.body.setOffset(5, 34);
        }
        if (this.p2IsSliding) {
            this.p2SlideTimer -= 16;
            if (this.p2SlideTimer <= 0) {
                this.p2IsSliding = false;
                this.p2.body.setSize(90, 52);
                this.p2.body.setOffset(5, 12);
            }
        }

        if (this.keyCtrl.isDown && !this.p2IsSprinting && this.p2SprintCooldown <= 0) {
            this.p2IsSprinting = true;
            this.p2SprintTimer = GAME_CONFIG.SPRINT_DURATION;
            this.p2SprintCooldown = GAME_CONFIG.SPRINT_COOLDOWN;
            this._truckTalk(this.p2, 'SPRINT');
        }
        if (this.p2IsSprinting) {
            this.p2SprintTimer -= delta;
            if (this.p2SprintTimer <= 0) this.p2IsSprinting = false;
        }
        if (this.p2SprintCooldown > 0) this.p2SprintCooldown -= delta;

        if (this.keyEnter.isDown && time > this.p2FireCooldown) {
            this._shoot(this.p2, 'fireball_p2', time);
            this.p2FireCooldown = time + GAME_CONFIG.FIRE_COOLDOWN;
            if (window.AUDIO) window.AUDIO.sfx('shoot');
            if (Math.random() < 0.35) this._truckTalk(this.p2, 'FIRE');
        }

        if (this.keyO.isDown && !this._p2InvisHeld) {
            this._activateInvisibility('p2', time);
            this._p2InvisHeld = true;
        }
        if (!this.keyO.isDown) this._p2InvisHeld = false;

        this._checkPlayerEnemyContact(this.p2, 'p2', time);

        // Warp P2 if too far behind camera
        const cam = this.cameras.main;
        if (this.p2.x < cam.scrollX - 20) {
            this.p2.setX(cam.scrollX + 80);
            this.p2.setVelocityX(0);
        }
    }

    // ── 2P camera follow midpoint ─────────────────────────────
    _update2PCamera() {
        if (!this.p2 || !this.p2.active || !this._camTarget) return;
        // Update the virtual target to the midpoint — camera's startFollow does the rest
        this._camTarget.x = (this.p1.x + this.p2.x) / 2;
        this._camTarget.y = GAME_CONFIG.HEIGHT / 2;
    }

    // ── Shoot fireball ────────────────────────────────────────
    _shoot(player, textureKey, time) {
        const dir = player.flipX ? -1 : 1;
        const fb = this.projectiles.create(player.x + dir * 55, player.y - 5, textureKey);
        fb.setVelocityX(dir * GAME_CONFIG.FIRE_SPEED);
        fb.setVelocityY(-30);
        fb.body.setAllowGravity(false);
        fb.setData('damage', GAME_CONFIG.FIRE_DAMAGE);
        fb.setData('born', time);
        fb.setFlipX(dir === -1);
        fb.setDepth(9);
        // Recoil kick
        player.setVelocityX(player.body.velocity.x - dir * 40);
    }

    // ── Enemy AI ─────────────────────────────────────────────
    _updateEnemyAI(time, delta) {
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active || !enemy.getData('alive')) return;

            const target = this._getClosestPlayer(enemy);
            if (!target) return;

            const dx = target.x - enemy.x;
            const speed = enemy.getData('speed');
            const isInvisTarget = this._isInvisible(target.getData('player'));

            // Floating enemies (ghosts)
            if (enemy.getData('floats')) {
                const dy = target.y - enemy.y;
                enemy.setVelocityX(isInvisTarget ? 0 : Math.sign(dx) * speed * 0.7);
                enemy.setVelocityY(isInvisTarget ? 0 : Math.sign(dy) * speed * 0.5);
                // Bob up and down
                const floatBase = enemy.getData('floatBase');
                const bobY = floatBase - 30 + Math.sin(time / 600 + enemy.x) * 20;
                if (Math.abs(enemy.y - floatBase) > 100) {
                    enemy.setVelocityY(Math.sign(floatBase - enemy.y) * 50);
                }
            } else {
                // Ground enemy
                if (!isInvisTarget && Math.abs(dx) > 10) {
                    enemy.setVelocityX(Math.sign(dx) * speed);
                    enemy.setFlipX(dx < 0);
                } else if (isInvisTarget) {
                    // Patrol when target invisible
                    const pat = enemy.getData('patrolDir') || 1;
                    enemy.setVelocityX(pat * speed * 0.5);
                    if (enemy.body.blocked.right || enemy.body.blocked.left) {
                        enemy.setData('patrolDir', -pat);
                    }
                } else {
                    enemy.setVelocityX(Phaser.Math.Linear(enemy.body.velocity.x, 0, 0.2));
                }
            }

            // Shooter enemies
            if (enemy.getData('shooter') && !isInvisTarget) {
                const shootTimer = enemy.getData('shootTimer');
                if (time > shootTimer) {
                    this._enemyShoot(enemy, target, time);
                    const cooldown = 2000 + Math.random() * 1500;
                    enemy.setData('shootTimer', time + cooldown);
                }
            }

            // HP bar above enemy
            this._drawEnemyHPBar(enemy);
        });
    }

    _getClosestPlayer(entity) {
        if (this.playerCount === 1 || !this.p2 || !this.p2.active) return this.p1;
        const d1 = Phaser.Math.Distance.Between(entity.x, entity.y, this.p1.x, this.p1.y);
        const d2 = Phaser.Math.Distance.Between(entity.x, entity.y, this.p2.x, this.p2.y);
        return d1 <= d2 ? this.p1 : this.p2;
    }

    _enemyShoot(enemy, target, time) {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proj = this.enemyProjectiles.create(enemy.x, enemy.y - 10, 'enemy_proj');
        proj.setVelocityX((dx / dist) * 220);
        proj.setVelocityY((dy / dist) * 220);
        proj.body.setAllowGravity(false);
        proj.setData('damage', enemy.getData('damage') * 0.7);
        proj.setData('born', time);
        proj.setDepth(9);
    }

    // ── Enemy HP bar ─────────────────────────────────────────
    _drawEnemyHPBar(enemy) {
        // Using a graphics object stored on the enemy
        let hpBar = enemy.getData('hpBar');
        if (!hpBar) {
            hpBar = this.add.graphics();
            hpBar.setDepth(20);
            enemy.setData('hpBar', hpBar);
        }
        hpBar.clear();
        const hp = enemy.getData('hp');
        const maxHp = enemy.getData('maxHp');
        const pct = Math.max(0, hp / maxHp);
        const bw = 40, bh = 5;
        const bx = enemy.x - bw / 2;
        const by = enemy.y - enemy.height / 2 - 12;
        hpBar.fillStyle(0x000000, 0.6);
        hpBar.fillRect(bx, by, bw, bh);
        const hpColor = pct > 0.5 ? 0x4CAF50 : pct > 0.25 ? 0xFDD835 : 0xF44336;
        hpBar.fillStyle(hpColor);
        hpBar.fillRect(bx, by, bw * pct, bh);
    }

    // ── Contact damage from enemies ───────────────────────────
    _checkPlayerEnemyContact(player, playerKey, time) {
        if (this._isInvisible(playerKey)) return;
        const lastHit = playerKey === 'p1' ? this.p1LastHit : this.p2LastHit;
        if (time - lastHit < GAME_CONFIG.INVINCIBILITY_DURATION) return;

        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active || !enemy.getData('alive')) return;
            const overlap = Phaser.Geom.Intersects.RectangleToRectangle(
                player.getBounds(), enemy.getBounds()
            );
            if (overlap) {
                this._damagePlayer(playerKey, enemy.getData('damage'), time);
                // Slight knockback
                const dir = Math.sign(player.x - enemy.x);
                player.setVelocityX(dir * 200);
                player.setVelocityY(-180);
            }
        });
    }

    // ── Fireball hits enemy ────────────────────────────────────
    _onFireballHitEnemy(fireball, enemy) {
        if (!enemy.getData('alive')) return;
        this._popProjectile(fireball);

        const dmg = fireball.getData('damage') || GAME_CONFIG.FIRE_DAMAGE;
        const hp = enemy.getData('hp') - dmg;
        enemy.setData('hp', hp);

        // Damage flash
        this.tweens.add({
            targets: enemy, alpha: 0.3, duration: 80, yoyo: true, repeat: 2,
        });

        // Score float
        this.score += enemy.getData('score') || 10;
        this._floatScore(enemy.x, enemy.y - 20, '+' + (enemy.getData('score') || 10));

        if (hp <= 0) {
            this._killEnemy(enemy);
        }

        // Update HUD score
        this.events.emit('updateScore', this.score);
    }

    _onEnemyProjectileHitPlayer(projectile, player, playerKey) {
        const time = this.time.now;
        if (this._isInvisible(playerKey)) {
            projectile.destroy();
            return;
        }
        const lastHit = playerKey === 'p1' ? this.p1LastHit : this.p2LastHit;
        if (time - lastHit < GAME_CONFIG.INVINCIBILITY_DURATION) {
            projectile.destroy();
            return;
        }
        projectile.destroy();
        this._damagePlayer(playerKey, projectile.getData('damage') || 15, time);
    }

    _killEnemy(enemy) {
        enemy.setData('alive', false);

        // Remove HP bar
        const hpBar = enemy.getData('hpBar');
        if (hpBar) hpBar.destroy();

        // Pop effect
        this._popEffect(enemy.x, enemy.y, 0xFF6D00);
        if (window.AUDIO) window.AUDIO.sfx('pop');
        enemy.destroy();

        // Boss summon: count remaining enemies, do nothing special
        if (this.bossActive && this.bossRef && this.bossRef.active) {
            // Boss might summon more; handled in boss AI
        }
    }

    // ── HP Box collected ──────────────────────────────────────
    _onCollectHPBox(player, box, playerKey) {
        box.destroy();
        const heal = GAME_CONFIG.HP_BOX_HEAL;
        this._healPlayer(playerKey, heal);
        this._popEffect(box.x, box.y, 0x4CAF50);
        this._floatScore(box.x, box.y - 20, `+${heal} HP`, '#00FF88');
        if (window.AUDIO) window.AUDIO.sfx('heal');

        // Screen flash green
        this.cameras.main.flash(200, 0, 255, 0, false);
    }

    // ── Reach goal ────────────────────────────────────────────
    _onReachGoal() {
        if (this.levelCompleteTriggered) return;
        if (this.ld.isBossLevel && !this.bossKilled) return; // must defeat boss first
        this.levelCompleteTriggered = true;
        this._completeLevel();
    }

    // ── Boss zone ─────────────────────────────────────────────
    _checkBossZone() {
        if (!this.bossZoneTrigger) return;
        const p1InZone = this.p1.x > this.bossZoneTrigger.x;
        if (p1InZone) {
            // Auto-clear any leftover regular enemies so the boss fight starts cleanly
            this.enemies.getChildren().slice().forEach(e => { if (e.active) this._killEnemy(e); });
            this._triggerBossIntro();
        }
    }

    _triggerBossIntro() {
        if (this.bossActive) return;
        this.bossActive = true;
        this.gameState = 'bossIntro';

        // Lock camera on boss arena
        this.cameras.main.stopFollow();
        this.cameras.main.pan(
            this.ld.worldLength - 550, GAME_CONFIG.HEIGHT / 2,
            1000, 'Power2', false,
            (cam, progress) => {
                if (progress === 1) {
                    this._spawnBoss();
                    this.gameState = 'boss';
                }
            }
        );

        // Invisible wall to keep players in arena
        const wallX = this.ld.worldLength - GAME_CONFIG.BOSS_ZONE_OFFSET - 50;
        const wall = this.platforms.create(wallX, GAME_CONFIG.HEIGHT / 2, 'pixel');
        wall.setDisplaySize(20, GAME_CONFIG.HEIGHT);
        wall.setTint(0xFF1744);
        wall.setAlpha(0.15);
        wall.refreshBody();

        // Warning flash
        this.cameras.main.flash(300, 255, 0, 0, false);
        this.cameras.main.shake(400, 0.01);

        // Boss intro text
        const worldW = this.ld.worldLength;
        const introText = this.add.text(worldW - 550, GAME_CONFIG.HEIGHT / 2 - 60,
            `⚠️ BOSS INCOMING ⚠️\n${this.ld.boss.name}`, {
                fontSize: '40px', color: '#FF1744', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 6, align: 'center',
            }).setOrigin(0.5).setDepth(100);
        const subText = this.add.text(worldW - 550, GAME_CONFIG.HEIGHT / 2 + 20,
            this.ld.boss.subName, {
                fontSize: '22px', color: '#FFD740', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: [introText, subText], scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 },
            duration: 600, ease: 'Back.Out',
        });
        this.time.delayedCall(2200, () => {
            this.tweens.add({
                targets: [introText, subText], alpha: 0, duration: 400, ease: 'Power2',
                onComplete: () => { introText.destroy(); subText.destroy(); },
            });
        });

        this.events.emit('bossStart', {
            name: this.ld.boss.name, hp: this.ld.boss.hp
        });
    }

    _spawnBoss() {
        const bossConfig = this.ld.boss;
        const spawnX = this.ld.worldLength - 450;
        const spawnY = GAME_CONFIG.GROUND_Y - bossConfig.size / 2 - 20;
        const key = 'boss_' + bossConfig.type;

        this.bossRef = this.physics.add.sprite(spawnX, spawnY, key);
        this.bossRef.setCollideWorldBounds(true);
        this.bossHP = bossConfig.hp;
        this.bossRef.setData('hp', bossConfig.hp);
        this.bossRef.setData('maxHp', bossConfig.hp);
        this.bossRef.setData('phase', 1);
        this.bossRef.setData('attackIndex', 0);
        this.bossRef.setDepth(15);
        this.bossAttackTimer = this.time.now + 1500;
        this.bossPhase = 1;

        this.physics.add.collider(this.bossRef, this.platforms);

        // Fireballs damage boss
        this.physics.add.overlap(this.projectiles, this.bossRef,
            this._onFireballHitBoss, null, this);

        // Boss damages players on contact
        this.physics.add.overlap(this.p1, this.bossRef,
            () => this._bossDamagePlayer('p1'), null, this);
        if (this.p2) {
            this.physics.add.overlap(this.p2, this.bossRef,
                () => this._bossDamagePlayer('p2'), null, this);
        }

        // Entrance animation — disable gravity so tween controls Y cleanly
        this.bossRef.body.setAllowGravity(false);
        this.bossRef.setY(spawnY - 220);
        this.tweens.add({
            targets: this.bossRef,
            y: spawnY,
            duration: 800, ease: 'Bounce.Out',
            onComplete: () => {
                if (this.bossRef && this.bossRef.active) {
                    this.bossRef.body.setAllowGravity(true);
                    this.cameras.main.shake(300, 0.015);
                }
            }
        });
    }

    // ── Boss update ───────────────────────────────────────────
    _updateBoss(time, delta) {
        const boss = this.bossRef;
        const cfg = this.ld.boss;
        const target = this._getClosestPlayer(boss);

        // Phase transitions
        const hpPct = this.bossHP / cfg.hp;
        if (hpPct <= 0.66 && this.bossPhase < 2) {
            this.bossPhase = 2;
            this.cameras.main.flash(200, 255, 50, 0, false);
        }
        if (hpPct <= 0.33 && this.bossPhase < 3) {
            this.bossPhase = 3;
            this.cameras.main.flash(200, 255, 0, 0, false);
            this.cameras.main.shake(300, 0.012);
        }

        // Basic movement towards player (slower than enemies)
        const dx = target.x - boss.x;
        const spd = cfg.speed * (0.6 + this.bossPhase * 0.2);
        boss.setVelocityX(Math.sign(dx) * spd);
        boss.setFlipX(dx < 0);

        // Attack cycle
        if (time > this.bossAttackTimer) {
            this._doBossAttack(boss, cfg, target, time);
        }

        // Update boss HP bar in HUD
        if (this.hudScene) {
            this.events.emit('bossHP', this.bossHP);
        }
    }

    _doBossAttack(boss, cfg, target, time) {
        const attacks = cfg.attacks;
        const idx = boss.getData('attackIndex') % attacks.length;
        const attack = attacks[idx];
        boss.setData('attackIndex', idx + 1);

        // Cooldown scales with phase (gets faster)
        const baseCooldown = 2800 - this.bossPhase * 500;
        this.bossAttackTimer = time + Phaser.Math.Between(baseCooldown - 300, baseCooldown + 300);

        switch (attack) {
            case 'slam': case 'toxic_slam': case 'ground_stomp': case 'mega_slam':
                this._bossSlam(boss, target, cfg);
                break;
            case 'charge':
                this._bossCharge(boss, target, cfg);
                break;
            case 'vine_toss': case 'frosting_spray': case 'poison_cloud':
            case 'neon_pulse': case 'rocket_volley':
                this._bossMultiShot(boss, target, cfg, time);
                break;
            case 'candy_rain': case 'drone_swarm':
                this._bossRainAttack(boss, cfg, time);
                break;
            case 'zombie_summon':
                this._bossSummonEnemies(boss, cfg);
                break;
            case 'laser_beam': case 'laser_sweep':
                this._bossLaser(boss, target, cfg, time);
                break;
            case 'wall_smash':
                this._bossWallSmash(boss, cfg);
                break;
            case 'ground_punch':
                this._bossGroundPunch(boss, target, cfg, time);
                break;
        }
    }

    _bossSlam(boss, target, cfg) {
        // Jump toward player and slam
        boss.setVelocityY(GAME_CONFIG.PLAYER_JUMP_VEL * 0.8);
        boss.setVelocityX(Math.sign(target.x - boss.x) * cfg.speed * 1.8);
        this.time.delayedCall(600, () => {
            if (!boss.active) return;
            boss.setVelocityY(900); // Slam down
            this.time.delayedCall(400, () => {
                if (!boss.active) return;
                this.cameras.main.shake(250, 0.02);
                this._shockwave(boss.x, GAME_CONFIG.GROUND_Y - 10, 200, cfg.damage);
            });
        });
    }

    _bossCharge(boss, target, cfg) {
        const dir = Math.sign(target.x - boss.x);
        boss.setVelocityX(dir * cfg.speed * 3.5);
        this.cameras.main.shake(200, 0.008);
        this.time.delayedCall(600, () => {
            if (!boss.active) return;
            boss.setVelocityX(0);
        });
    }

    _bossMultiShot(boss, target, cfg, time) {
        const angles = this.bossPhase === 1 ? [0] :
                       this.bossPhase === 2 ? [-20, 0, 20] : [-30, -15, 0, 15, 30];
        angles.forEach(angleDeg => {
            const dx = target.x - boss.x;
            const dy = (target.y - boss.y);
            const baseAngle = Math.atan2(dy, dx);
            const a = baseAngle + Phaser.Math.DegToRad(angleDeg);
            const proj = this.enemyProjectiles.create(boss.x, boss.y, 'enemy_proj');
            proj.setVelocityX(Math.cos(a) * 280);
            proj.setVelocityY(Math.sin(a) * 280);
            proj.body.setAllowGravity(false);
            proj.setData('damage', cfg.damage * 0.6);
            proj.setData('born', time);
            proj.setScale(1.8);
            proj.setDepth(9);
        });
    }

    _bossRainAttack(boss, cfg, time) {
        const count = 4 + this.bossPhase * 2;
        const worldW = this.ld.worldLength;
        const zoneX = worldW - GAME_CONFIG.BOSS_ZONE_OFFSET;
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 200, () => {
                if (!this.bossRef || !this.bossRef.active) return;
                const rainX = Phaser.Math.Between(zoneX + 50, worldW - 50);
                const proj = this.enemyProjectiles.create(rainX, 0, 'enemy_proj');
                proj.setVelocity(0, 350);
                proj.body.setAllowGravity(false);
                proj.setData('damage', cfg.damage * 0.5);
                proj.setData('born', time);
                proj.setScale(2);
                proj.setDepth(9);
            });
        }
    }

    _bossSummonEnemies(boss, cfg) {
        // Summon 2-3 small enemies
        const count = 2 + this.bossPhase;
        for (let i = 0; i < count; i++) {
            const type = this.ld.enemyGroups[0].type;
            const ex = boss.x + Phaser.Math.Between(-150, 150);
            const ey = GAME_CONFIG.GROUND_Y - 35;
            this._spawnEnemy(type, ex, ey, this.ld);
        }
        this.cameras.main.flash(150, 100, 255, 0, false);
    }

    _bossLaser(boss, target, cfg, time) {
        // Visual laser beam (Graphics)
        const g = this.add.graphics();
        g.setDepth(12);
        const dur = 800 + this.bossPhase * 200;
        let elapsed = 0;
        const ticker = this.time.addEvent({
            delay: 16, repeat: Math.floor(dur / 16),
            callback: () => {
                elapsed += 16;
                g.clear();
                if (!boss.active) { g.destroy(); return; }
                const t2 = this._getClosestPlayer(boss);
                g.lineStyle(8 - elapsed / 200, 0xFF1744, 1 - elapsed / dur);
                g.lineBetween(boss.x, boss.y, t2.x, t2.y);
                // Damage at end
                if (elapsed >= dur - 50) {
                    const t3 = this._getClosestPlayer(boss);
                    if (Phaser.Math.Distance.Between(boss.x, boss.y, t3.x, t3.y) < 300) {
                        const pk = t3.getData('player');
                        if (!this._isInvisible(pk)) {
                            this._damagePlayer(pk, cfg.damage * 0.8, time);
                        }
                    }
                    g.destroy();
                }
            }
        });
    }

    _bossWallSmash(boss, cfg) {
        // Rush to a wall, screen shake
        const worldW = this.ld.worldLength;
        const wallTarget = boss.x < worldW / 2 ? 100 : worldW - 100;
        const origX = boss.x;
        boss.setVelocityX(Math.sign(wallTarget - boss.x) * cfg.speed * 4);
        this.time.delayedCall(700, () => {
            if (!boss.active) return;
            boss.setVelocityX(0);
            this.cameras.main.shake(400, 0.025);
            // Shockwave from wall
            this._shockwave(boss.x, GAME_CONFIG.GROUND_Y, 350, cfg.damage * 0.7);
        });
    }

    _bossGroundPunch(boss, target, cfg, time) {
        // Rise up and punch ground
        this.tweens.add({
            targets: boss, y: boss.y - 120, duration: 400, ease: 'Power2',
            onComplete: () => {
                if (!boss.active) return;
                this.tweens.add({
                    targets: boss, y: GAME_CONFIG.GROUND_Y - cfg.size / 2,
                    duration: 200, ease: 'Power4.In',
                    onComplete: () => {
                        this.cameras.main.shake(350, 0.022);
                        this._shockwave(boss.x, GAME_CONFIG.GROUND_Y, 280, cfg.damage * 0.9);
                    }
                });
            }
        });
    }

    // ── Shockwave AoE ─────────────────────────────────────────
    _shockwave(cx, cy, radius, dmg) {
        // Visual ring
        const ring = this.add.graphics();
        ring.lineStyle(6, 0xFF6D00);
        ring.strokeCircle(cx, cy, 10);
        ring.setDepth(12);
        this.tweens.add({
            targets: ring, scaleX: radius / 10, scaleY: radius / 10 * 0.3,
            alpha: { from: 1, to: 0 }, duration: 400, ease: 'Power2',
            onComplete: () => ring.destroy(),
        });
        // Damage players in range
        [{ player: this.p1, key: 'p1' }, { player: this.p2, key: 'p2' }].forEach(({ player, key }) => {
            if (!player || !player.active) return;
            if (this._isInvisible(key)) return;
            const dist = Phaser.Math.Distance.Between(cx, cy, player.x, player.y);
            if (dist < radius) {
                this._damagePlayer(key, dmg * (1 - dist / radius), this.time.now);
            }
        });
    }

    // ── Fireball hits boss ────────────────────────────────────
    _onFireballHitBoss(fireball, boss) {
        this._popProjectile(fireball);
        const dmg = fireball.getData('damage') || GAME_CONFIG.FIRE_DAMAGE;
        this.bossHP -= dmg;
        boss.setData('hp', this.bossHP);

        // Hit flash
        this.tweens.add({
            targets: boss, alpha: 0.4, duration: 80, yoyo: true, repeat: 1,
        });
        if (window.AUDIO) window.AUDIO.sfx('bossHit');

        this.events.emit('bossHP', this.bossHP);

        if (this.bossHP <= 0) {
            this._killBoss(boss);
        }
    }

    _bossDamagePlayer(playerKey) {
        const time = this.time.now;
        if (this._isInvisible(playerKey)) return;
        this._damagePlayer(playerKey, this.ld.boss.damage, time);
    }

    _killBoss(boss) {
        this.bossKilled = true;
        this.bossActive = false;

        // Big explosion sequence
        for (let i = 0; i < 8; i++) {
            this.time.delayedCall(i * 120, () => {
                if (!boss.active) return;
                this._popEffect(
                    boss.x + Phaser.Math.Between(-60, 60),
                    boss.y + Phaser.Math.Between(-60, 60),
                    Phaser.Math.RND.pick([0xFF6D00, 0xFF1744, 0xFFD600])
                );
            });
        }
        this.time.delayedCall(800, () => {
            boss.destroy();
            this.cameras.main.shake(500, 0.02);
            this.cameras.main.flash(400, 255, 200, 0, false);
            if (window.AUDIO) { window.AUDIO.sfx('bossDie'); window.AUDIO.playTrack('win'); }

            // Award invisibility buff
            this.invisCharges.p1 += 1;
            if (this.playerCount === 2) this.invisCharges.p2 += 1;

            if (this.hudScene) {
                this.events.emit('bossKilled', this.invisCharges);
            }

            // Show boss killed text
            const worldW = this.ld.worldLength;
            const kt = this.add.text(worldW - 550, GAME_CONFIG.HEIGHT / 2, '🏆 BOSS DEFEATED! 🏆', {
                fontSize: '46px', color: '#FFD600', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 7,
            }).setOrigin(0.5).setDepth(100);
            const st = this.add.text(worldW - 550, GAME_CONFIG.HEIGHT / 2 + 55,
                '👻 INVISIBILITY UNLOCKED!', {
                    fontSize: '26px', color: '#00E5FF', fontStyle: 'bold',
                    stroke: '#000', strokeThickness: 5,
                }).setOrigin(0.5).setDepth(100);
            this.tweens.add({
                targets: [kt, st], scaleX: { from: 0, to: 1 }, scaleY: { from: 0, to: 1 },
                duration: 700, ease: 'Back.Out',
            });
            this.time.delayedCall(2500, () => {
                this.levelCompleteTriggered = false;
                this._onReachGoal();
            });
        });
    }

    // ── Player HP ─────────────────────────────────────────────
    _damagePlayer(playerKey, dmg, time) {
        const player = playerKey === 'p1' ? this.p1 : this.p2;
        if (!player || !player.active) return;

        if (playerKey === 'p1') {
            const lastHit = this.p1LastHit;
            if (time - lastHit < GAME_CONFIG.INVINCIBILITY_DURATION) return;
            this.p1HP = Math.max(0, this.p1HP - Math.round(dmg));
            this.p1LastHit = time;
        } else {
            const lastHit = this.p2LastHit;
            if (time - lastHit < GAME_CONFIG.INVINCIBILITY_DURATION) return;
            this.p2HP = Math.max(0, this.p2HP - Math.round(dmg));
            this.p2LastHit = time;
        }

        // Damage flash
        this.tweens.add({
            targets: player, alpha: 0.2, duration: 100, yoyo: true, repeat: 3,
        });
        this.cameras.main.flash(120, 255, 0, 0, false);
        if (window.AUDIO) window.AUDIO.sfx('hit');
        if (Math.random() < 0.6) this._truckTalk(player, 'HIT');

        if (this.hudScene) {
            this.events.emit('updateHP', { p1HP: this.p1HP, p2HP: this.p2HP });
        }

        // Check death
        if (this.p1HP <= 0 && (this.playerCount === 1 || this.p2HP <= 0)) {
            this._handleGameOver();
        } else if (this.p1HP <= 0 && this.playerCount === 2) {
            // P1 is "down" but game continues if P2 is alive
            player.setAlpha(0.3);
            this.p1HP = 1; // Keep them at 1 to avoid repeated game over triggers
        } else if (playerKey === 'p2' && this.p2HP <= 0) {
            player.setAlpha(0.3);
            this.p2HP = 1;
        }
    }

    _healPlayer(playerKey, amount) {
        if (playerKey === 'p1') {
            this.p1HP = Math.min(GAME_CONFIG.PLAYER_MAX_HP, this.p1HP + amount);
            if (this.p1) this.p1.setAlpha(1);
        } else {
            this.p2HP = Math.min(GAME_CONFIG.PLAYER_MAX_HP, this.p2HP + amount);
            if (this.p2) this.p2.setAlpha(1);
        }
        if (this.hudScene) {
            this.events.emit('updateHP', { p1HP: this.p1HP, p2HP: this.p2HP });
        }
    }

    // ── Invisibility ──────────────────────────────────────────
    _activateInvisibility(playerKey, time) {
        const charges = this.invisCharges[playerKey];
        if (charges <= 0) return;
        this.invisCharges[playerKey]--;

        if (playerKey === 'p1') this.p1InvisTimer = GAME_CONFIG.INVISIBILITY_DURATION;
        else this.p2InvisTimer = GAME_CONFIG.INVISIBILITY_DURATION;

        const player = playerKey === 'p1' ? this.p1 : this.p2;
        if (player) {
            player.setAlpha(0.25);
            player.setTint(0x00E5FF);
        }
        if (this.hudScene) {
            this.events.emit('invisActivated', { playerKey, charges: this.invisCharges });
        }
    }

    _updateInvisibility(time, delta) {
        if (this.p1InvisTimer > 0) {
            this.p1InvisTimer -= delta;
            if (this.p1InvisTimer <= 0) {
                this.p1InvisTimer = 0;
                if (this.p1) { this.p1.setAlpha(1); this.p1.clearTint(); }
                this.events.emit('invisEnd', 'p1');
            }
        }
        if (this.p2InvisTimer > 0) {
            this.p2InvisTimer -= delta;
            if (this.p2InvisTimer <= 0) {
                this.p2InvisTimer = 0;
                if (this.p2) { this.p2.setAlpha(1); this.p2.clearTint(); }
                this.events.emit('invisEnd', 'p2');
            }
        }
    }

    _isInvisible(playerKey) {
        return playerKey === 'p1' ? this.p1InvisTimer > 0 : this.p2InvisTimer > 0;
    }

    // ── Sprint / Slide VFX ────────────────────────────────────
    _updateSprintFX(time) {
        if (this.p1IsSprinting && this.p1 && this.p1.active) {
            if (!this._p1SprintFXTime || time - this._p1SprintFXTime > 80) {
                this._spawnTrail(this.p1, 0xFF6D00);
                this._p1SprintFXTime = time;
            }
        }
        if (this.p2IsSprinting && this.p2 && this.p2.active) {
            if (!this._p2SprintFXTime || time - this._p2SprintFXTime > 80) {
                this._spawnTrail(this.p2, 0x00B0FF);
                this._p2SprintFXTime = time;
            }
        }
    }

    _updateSlideFX(time, delta) {
        // Dust particles while sliding
        if (this.p1IsSliding && this.p1 && this.p1.active) {
            if (!this._p1SlideFXTime || time - this._p1SlideFXTime > 120) {
                this._popDust(this.p1.x, this.p1.y + 20);
                this._p1SlideFXTime = time;
            }
        }
    }

    _spawnTrail(player, color) {
        const trail = this.add.rectangle(player.x, player.y, 70, 28, color, 0.35);
        trail.setDepth(5);
        this.tweens.add({
            targets: trail, alpha: 0, scaleX: 0.5,
            duration: 250, ease: 'Power2',
            onComplete: () => trail.destroy(),
        });
    }

    // ── Level complete ────────────────────────────────────────
    _completeLevel() {
        this.gameState = 'levelComplete';
        const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

        // Rainbow flash burst
        const flashColors = [0xFF1744, 0xFF6D00, 0xFFD600, 0x00E676, 0x00B0FF];
        flashColors.forEach((c, i) => {
            this.time.delayedCall(i * 80, () => {
                this.cameras.main.flash(120, (c >> 16) & 255, (c >> 8) & 255, c & 255, false);
            });
        });

        // Big "LEVEL CLEAR!" text bang
        const bang = this.add.text(
            this.cameras.main.scrollX + W / 2,
            H / 2,
            '⭐ LEVEL CLEAR! ⭐',
            { fontSize: '72px', color: '#FFD600', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }
        ).setOrigin(0.5).setDepth(200).setScale(0.1);

        this.tweens.add({
            targets: bang,
            scaleX: 1.2, scaleY: 1.2,
            duration: 400, ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: bang,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 300, delay: 600, ease: 'Power3.In',
                    onComplete: () => bang.destroy(),
                });
            }
        });

        // Confetti burst
        for (let i = 0; i < 30; i++) {
            this.time.delayedCall(i * 30, () => {
                const cx = this.cameras.main.scrollX + Phaser.Math.Between(100, W - 100);
                const c  = Phaser.Math.RND.pick([0xFF1744, 0xFFD600, 0x00E676, 0x00B0FF, 0xFF80AB]);
                const dot = this.add.rectangle(cx, H * 0.3, 10, 10, c).setDepth(199);
                this.tweens.add({
                    targets: dot,
                    y: H * 0.85,
                    x: cx + Phaser.Math.Between(-120, 120),
                    angle: Phaser.Math.Between(0, 720),
                    alpha: 0,
                    duration: 900, ease: 'Power2',
                    onComplete: () => dot.destroy(),
                });
            });
        }

        this.cameras.main.shake(300, 0.012);
        if (window.AUDIO && !this.ld.isBossLevel) window.AUDIO.sfx('winJingle');

        this.time.delayedCall(1400, () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.stop('HUDScene');
                if (this.currentLevel >= 10) {
                    this.scene.start('WinScene', { score: this.score });
                } else {
                    this.scene.start('LevelCompleteScene', {
                        level: this.currentLevel,
                        playerCount: this.playerCount,
                        p1HP: this.p1HP,
                        p2HP: this.p2HP,
                        invisCharges: this.invisCharges,
                        score: this.score,
                        wasBossLevel: this.ld.isBossLevel,
                    });
                }
            });
        });
    }

    // ── Game Over ─────────────────────────────────────────────
    _handleGameOver() {
        if (this.gameState === 'dead') return;
        this.gameState = 'dead';
        this.cameras.main.shake(600, 0.025);
        this.cameras.main.flash(400, 255, 0, 0, false);
        this.time.delayedCall(1200, () => {
            this.scene.stop('HUDScene');
            this.scene.start('GameOverScene', {
                level: this.currentLevel,
                playerCount: this.playerCount,
                score: this.score,
            });
        });
    }

    // ── Visual utilities ─────────────────────────────────────
    _popProjectile(proj) {
        const flash = this.add.circle(proj.x, proj.y, 12, 0xFF6D00, 0.8);
        flash.setDepth(15);
        this.tweens.add({
            targets: flash, scaleX: 2, scaleY: 2, alpha: 0,
            duration: 180, ease: 'Power2',
            onComplete: () => flash.destroy(),
        });
        proj.destroy();
    }

    _popEffect(x, y, color) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Phaser.Math.Between(60, 140);
            const dot = this.add.circle(x, y, Phaser.Math.Between(4, 9), color);
            dot.setDepth(20);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 30,
                alpha: 0, duration: 500,
                ease: 'Power2', onComplete: () => dot.destroy(),
            });
        }
        // Central flash
        const flash = this.add.circle(x, y, 20, color, 0.9).setDepth(20);
        this.tweens.add({
            targets: flash, scaleX: 3, scaleY: 3, alpha: 0,
            duration: 350, ease: 'Power2',
            onComplete: () => flash.destroy(),
        });
    }

    _popDust(x, y) {
        for (let i = 0; i < 4; i++) {
            const dust = this.add.circle(
                x + Phaser.Math.Between(-20, 20), y,
                Phaser.Math.Between(4, 8), 0xD7CCC8, 0.6
            ).setDepth(4);
            this.tweens.add({
                targets: dust,
                x: dust.x + Phaser.Math.Between(-30, 30),
                y: dust.y - Phaser.Math.Between(20, 50),
                alpha: 0, scaleX: 2, scaleY: 2,
                duration: 400, ease: 'Power2',
                onComplete: () => dust.destroy(),
            });
        }
    }

    // ── Truck speech bubbles ──────────────────────────────────
    _truckTalk(player, event) {
        const JUMP_QUIPS  = ['WEEEE!', 'YOLO!', 'TO THE MOON!', 'BOING!', 'WHEEE!', 'UP UP!', 'WOO-HOO!'];
        const SPRINT_QUIPS= ['ZOOM!', 'EAT MY DUST!', 'VROOOOM!', 'BYE BYE!', 'TOO FAST!', 'FLOOR IT!'];
        const FIRE_QUIPS  = ['BOOM!', 'TAKE THAT!', 'FIRE!!!', 'GOTCHA!', 'ROASTED!', 'KABOOM!'];
        const HIT_QUIPS   = ['OUCH!', 'HEY!', 'NOT COOL!', 'YIKES!', 'OOF!', 'BONK!'];
        const pool = event === 'JUMP' ? JUMP_QUIPS : event === 'SPRINT' ? SPRINT_QUIPS :
                     event === 'FIRE' ? FIRE_QUIPS : HIT_QUIPS;
        const msg  = Phaser.Math.RND.pick(pool);
        if (window.AUDIO) window.AUDIO.speak(msg);
        const bx   = player.x - 30, by = player.y - 55;

        // Bubble background
        const bubble = this.add.graphics().setDepth(30);
        bubble.fillStyle(0xFFFFFF, 0.92);
        bubble.fillRoundedRect(bx - 4, by - 4, msg.length * 10 + 8, 26, 8);
        bubble.fillStyle(0xFFFFFF, 0.92);
        // Tail
        bubble.fillTriangle(bx + 10, by + 22, bx + 18, by + 22, bx + 14, by + 32);

        const txt = this.add.text(bx, by, msg, {
            fontSize: '14px', color: '#111', fontStyle: 'bold',
        }).setDepth(31);

        this.tweens.add({
            targets: [bubble, txt],
            y: `-=22`, alpha: 0,
            duration: 900, ease: 'Power2',
            onComplete: () => { bubble.destroy(); txt.destroy(); },
        });
    }

    _floatScore(x, y, text, color = '#FFD740') {
        const t = this.add.text(x, y, text, {
            fontSize: '18px', color, fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(25);
        this.tweens.add({
            targets: t, y: y - 50, alpha: 0,
            duration: 900, ease: 'Power2',
            onComplete: () => t.destroy(),
        });
    }
}
