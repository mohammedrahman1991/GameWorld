# Trutles 2.0 — Fighting Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete 2-player local fighting game in a single `index.html` using Phaser 3 — 6 pixel-art fighters, 3-button controls, best-of-3 rounds, smooth scene transitions.

**Architecture:** Four Phaser.Scene classes (Title, CharacterSelect, Fight, Win) in one HTML file with all JS inline. Fighter pixel art is generated at runtime using Phaser `Graphics.generateTexture()`. Combat uses Arcade Physics for gravity/movement with manual `Phaser.Geom.Rectangle.Overlaps()` hitbox checks for attacks.

**Tech Stack:** Phaser 3.60 (CDN), HTML5 Canvas, Vanilla JS (ES6 classes), no build step.

---

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Entire game — Phaser config, all 4 scenes, fighter data, pixel art generators |

Internal JS sections (all within `<script>` in `index.html`):
- `W, H, FLOOR_Y, S` — layout constants
- `FIGHTERS` — roster array (id, name, color, type)
- `px()`, `createChickenTextures()`, `createSenseiTextures()`, `createSlicerTextures()`, `createAllTextures()` — pixel art generators
- `Fighter` class — physics sprite, input, attack/hurt state
- `TitleScene extends Phaser.Scene`
- `CharacterSelectScene extends Phaser.Scene`
- `FightScene extends Phaser.Scene`
- `WinScene extends Phaser.Scene`
- `new Phaser.Game(config)` — boot

---

### Task 1: HTML Scaffold + Phaser Boot

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html with Phaser CDN, constants, and 4 scene stubs**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trutles 2.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
<script>

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const W = 800, H = 480, FLOOR_Y = 400;
const S = 4; // "pixel" size — each art cell is 4×4 screen pixels

const FIGHTERS = [
  { id: 'cluck',  name: 'CLUCK',  color: 0xe53935, type: 'chicken' },
  { id: 'wing',   name: 'WING',   color: 0x2196f3, type: 'chicken' },
  { id: 'peck',   name: 'PECK',   color: 0x9c27b0, type: 'chicken' },
  { id: 'talons', name: 'TALONS', color: 0x4caf50, type: 'chicken' },
  { id: 'sensei', name: 'SENSEI', color: 0xff9800, type: 'sensei'  },
  { id: 'slicer', name: 'SLICER', color: 0x607d8b, type: 'slicer'  },
];

// ─── SCENES (stubs) ───────────────────────────────────────────────────────────
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.add.text(W/2, H/2, 'TRUTLES 2.0', { fontSize: '48px', fill: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('CharacterSelect'));
  }
}

class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }
  create() {
    this.add.text(W/2, H/2, 'CHARACTER SELECT\n(stub)', { fontSize: '24px', fill: '#fff', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5);
  }
}

class FightScene extends Phaser.Scene {
  constructor() { super('Fight'); }
  create() {
    this.add.text(W/2, H/2, 'FIGHT SCENE\n(stub)', { fontSize: '24px', fill: '#fff', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5);
  }
  update() {}
}

class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }
  create() {
    this.add.text(W/2, H/2, 'WIN SCENE\n(stub)', { fontSize: '24px', fill: '#fff', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5);
  }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#111',
  physics: { default: 'arcade', arcade: { gravity: { y: 800 }, debug: false } },
  scene: [TitleScene, CharacterSelectScene, FightScene, WinScene],
});

</script>
</body>
</html>
```

- [ ] **Step 2: Open index.html in browser**

Double-click `index.html` or drag it into Chrome/Firefox.
Expected: Black canvas with "TRUTLES 2.0" text. Pressing Enter shows "CHARACTER SELECT (stub)".

- [ ] **Step 3: Initialize git and commit**

```bash
cd "/Users/mohammedrahman/Desktop/Games/Trutles 2.0"
git init
git add index.html
git commit -m "feat: scaffold Phaser game with 4 scene stubs"
```

---

### Task 2: Pixel Art Texture Generator

**Files:**
- Modify: `index.html` — add texture generation functions between FIGHTERS and the scene classes

Each fighter gets 2 textures: `{id}_idle` (8×10 art cells = 32×40px) and `{id}_attack` (slightly wider, arm/cane/blade extended). Hurt state uses a tint on the idle texture — no separate texture needed.

- [ ] **Step 1: Add pixel art helpers after the FIGHTERS constant**

```javascript
// ─── PIXEL ART ────────────────────────────────────────────────────────────────
// Draw a single "pixel" (S×S rect) at grid column col, row row
function px(g, col, row, color, w = 1, h = 1) {
  g.fillStyle(color, 1);
  g.fillRect(col * S, row * S, S * w, S * h);
}

function createChickenTextures(scene, fighter) {
  const g = scene.add.graphics();
  const c = fighter.color;
  const TW = 8 * S, TH = 10 * S;

  function drawBase() {
    g.clear();
    px(g, 2, 0, c); px(g, 3, 0, c); px(g, 4, 0, c);          // comb
    g.fillStyle(0xf5deb3, 1); g.fillRect(2*S, 1*S, 4*S, 3*S); // head
    px(g, 3, 2, 0x111111); px(g, 5, 2, 0x111111);              // eyes
    px(g, 4, 3, 0xf4a300);                                      // beak
    g.fillStyle(c, 1); g.fillRect(1*S, 4*S, 6*S, S);           // bandana
    g.fillStyle(0xf5deb3, 1); g.fillRect(1*S, 5*S, 6*S, 3*S); // body
    g.fillStyle(0xf4a300, 1);                                   // legs
    g.fillRect(2*S, 8*S, S, 2*S); g.fillRect(5*S, 8*S, S, 2*S);
  }

  // idle
  drawBase();
  g.fillStyle(0xe8c99a, 1); g.fillRect(0, 5*S, S, 2*S); g.fillRect(7*S, 5*S, S, 2*S); // wings
  g.generateTexture(`${fighter.id}_idle`, TW, TH);

  // attack (right wing punches out)
  drawBase();
  g.fillStyle(0xe8c99a, 1); g.fillRect(0, 5*S, S, 2*S);        // left wing normal
  g.fillRect(7*S, 5*S, 3*S, S);                                  // right wing extended
  g.generateTexture(`${fighter.id}_attack`, TW + 2*S, TH);

  g.destroy();
}

function createSenseiTextures(scene) {
  const g = scene.add.graphics();
  const TW = 8 * S, TH = 10 * S;

  function drawBase() {
    g.clear();
    px(g, 1, 0, 0xc97a30); px(g, 6, 0, 0xc97a30);              // ears
    g.fillStyle(0xc97a30, 1); g.fillRect(1*S, 1*S, 6*S, 3*S);  // head
    px(g, 2, 2, 0x111111); px(g, 5, 2, 0x111111);               // eyes
    g.fillStyle(0xe8a060, 1); g.fillRect(3*S, 3*S, 2*S, S);     // snout
    g.fillStyle(0xff9800, 1); g.fillRect(1*S, 4*S, 6*S, 4*S);  // gi
    g.fillStyle(0x222222, 1); g.fillRect(1*S, 6*S, 6*S, S);    // belt
    g.fillStyle(0xc97a30, 1);                                    // legs
    g.fillRect(2*S, 8*S, S, 2*S); g.fillRect(5*S, 8*S, S, 2*S);
  }

  // idle (cane held upright)
  drawBase();
  g.fillStyle(0x8b4513, 1); g.fillRect(7*S, 3*S, S, 5*S);
  g.generateTexture('sensei_idle', TW, TH);

  // attack (cane swings horizontally)
  drawBase();
  g.fillStyle(0x8b4513, 1); g.fillRect(5*S, 4*S, 4*S, S);
  g.generateTexture('sensei_attack', TW + 2*S, TH);

  g.destroy();
}

function createSlicerTextures(scene) {
  const g = scene.add.graphics();
  const TW = 8 * S, TH = 10 * S;

  function drawBase() {
    g.clear();
    px(g, 1, 0, 0x888888); px(g, 3, 0, 0xaaaaaa); px(g, 5, 0, 0x888888); // spikes
    g.fillStyle(0x555555, 1); g.fillRect(1*S, 1*S, 6*S, 3*S);  // helmet
    px(g, 2, 2, 0xe53935); px(g, 5, 2, 0xe53935);               // red eyes
    g.fillStyle(0x333333, 1); g.fillRect(3*S, 2*S, 2*S, S);    // visor bridge
    g.fillStyle(0x444444, 1); g.fillRect(1*S, 4*S, 6*S, 4*S);  // armor body
    px(g, 0, 4, 0x888888); px(g, 7, 4, 0x888888);               // shoulder pads
    g.fillStyle(0x666666, 1);                                    // chest plates
    g.fillRect(1*S, 4*S, 2*S, 2*S); g.fillRect(5*S, 4*S, 2*S, 2*S);
    g.fillStyle(0x333333, 1);                                    // legs
    g.fillRect(2*S, 8*S, S, 2*S); g.fillRect(5*S, 8*S, S, 2*S);
  }

  // idle (blade at side)
  drawBase();
  g.fillStyle(0xc0c0c0, 1); g.fillRect(7*S, 5*S, S, 3*S);
  g.generateTexture('slicer_idle', TW, TH);

  // attack (blade slashes out)
  drawBase();
  g.fillStyle(0xc0c0c0, 1); g.fillRect(7*S, 4*S, 4*S, S);
  g.generateTexture('slicer_attack', TW + 3*S, TH);

  g.destroy();
}

function createAllTextures(scene) {
  FIGHTERS.filter(f => f.type === 'chicken').forEach(f => createChickenTextures(scene, f));
  createSenseiTextures(scene);
  createSlicerTextures(scene);
}
```

- [ ] **Step 2: Call createAllTextures in TitleScene.create() and add texture preview to CharacterSelectScene stub**

Replace TitleScene.create():
```javascript
create() {
  createAllTextures(this);
  this.add.text(W/2, H/2, 'TRUTLES 2.0', { fontSize: '48px', fill: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
  this.input.keyboard.once('keydown-ENTER', () => this.scene.start('CharacterSelect'));
}
```

Replace CharacterSelectScene.create() with a preview test:
```javascript
create() {
  this.add.text(W/2, 20, 'TEXTURE PREVIEW', { fontSize: '14px', fill: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
  FIGHTERS.forEach((f, i) => {
    this.add.image(60 + i * 130, H/2 - 20, `${f.id}_idle`).setScale(4);
    this.add.image(60 + i * 130, H/2 + 60, `${f.id}_attack`).setScale(4);
    this.add.text(60 + i * 130, H/2 + 100, f.name, { fontSize: '11px', fill: '#aaa', fontFamily: 'monospace' }).setOrigin(0.5);
  });
}
```

- [ ] **Step 3: Open browser, press Enter from Title**

Expected: 6 idle sprites on top row, 6 attack sprites on bottom row.
- Chickens: each has a distinctly colored comb + bandana (red, blue, purple, green)
- Sensei: orange body, visible cane (upright idle, horizontal attack)
- Slicer: dark grey armor, red eye slit, silver blade (side idle, extended attack)

If a texture appears blank: open browser DevTools → Console, look for `generateTexture` errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: pixel art texture generators for all 6 fighters"
```

---

### Task 3: TitleScene

**Files:**
- Modify: `index.html` — replace TitleScene stub

- [ ] **Step 1: Replace TitleScene with full implementation**

```javascript
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    createAllTextures(this);

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, W, H);

    // Title
    this.add.text(W/2, 130, 'TRUTLES', {
      fontSize: '72px', fill: '#f4c430', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#c97a00', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W/2, 210, '2.0', {
      fontSize: '48px', fill: '#e53935', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#8b0000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Fighter parade with idle bob tween
    FIGHTERS.forEach((f, i) => {
      const img = this.add.image(80 + i * 110, 330, `${f.id}_idle`).setScale(3);
      this.tweens.add({
        targets: img, y: 322,
        duration: 600 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // Blinking prompt
    const prompt = this.add.text(W/2, 420, 'PRESS ENTER TO PLAY', {
      fontSize: '20px', fill: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    // Enter → fade to CharacterSelect
    this.input.keyboard.once('keydown-ENTER', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelect'));
    });
  }
}
```

- [ ] **Step 2: Verify in browser**

Expected:
- Dark gradient background
- "TRUTLES" in gold, "2.0" in red below it
- 6 fighter sprites bobbing along the bottom
- "PRESS ENTER TO PLAY" blinking
- Enter key → fades to black → CharacterSelect stub

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: TitleScene with animated fighter parade and fade transition"
```

---

### Task 4: CharacterSelectScene

**Files:**
- Modify: `index.html` — replace CharacterSelectScene stub

Passes `{ p1Fighter: 'cluck', p2Fighter: 'slicer' }` to FightScene via `scene.start()`.

- [ ] **Step 1: Replace CharacterSelectScene with full implementation**

```javascript
class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Background
    this.add.graphics().fillStyle(0x0d0d1a, 1).fillRect(0, 0, W, H);

    // Divider
    this.add.graphics().fillStyle(0x444444, 1).fillRect(W/2 - 2, 0, 4, H);

    // Headers
    this.add.text(W/4, 28, 'PLAYER 1', { fontSize: '18px', fill: '#4caf50', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(3*W/4, 28, 'PLAYER 2', { fontSize: '18px', fill: '#e53935', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);

    // Layout: 3 columns × 2 rows of portraits per half
    const cols = 3;
    const cellW = (W/2 - 40) / cols;
    const cellH = 130;
    const startY = 70;

    this.portraits = FIGHTERS.map((f, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx1 = 20 + col * cellW + cellW / 2;
      const cx2 = W/2 + 20 + col * cellW + cellW / 2;
      const cy  = startY + row * cellH + cellH / 2;

      const img1 = this.add.image(cx1, cy - 18, `${f.id}_idle`).setScale(3);
      this.add.text(cx1, cy + 28, f.name, { fontSize: '11px', fill: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

      const img2 = this.add.image(cx2, cy - 18, `${f.id}_idle`).setScale(3);
      this.add.text(cx2, cy + 28, f.name, { fontSize: '11px', fill: '#888', fontFamily: 'monospace' }).setOrigin(0.5);

      return { img1, img2, cx1, cx2, cy };
    });

    // Cursor graphics
    this.p1Cursor = this.add.graphics();
    this.p2Cursor = this.add.graphics();

    // State
    this.p1 = { cursor: 0, confirmed: false };
    this.p2 = { cursor: 1, confirmed: false };

    // Preview area
    this.p1Preview = this.add.image(W/4, 385, `${FIGHTERS[0].id}_idle`).setScale(5);
    this.p2Preview = this.add.image(3*W/4, 385, `${FIGHTERS[1].id}_idle`).setScale(5);
    this.p1Name = this.add.text(W/4, 432, FIGHTERS[0].name, { fontSize: '18px', fill: '#4caf50', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
    this.p2Name = this.add.text(3*W/4, 432, FIGHTERS[1].name, { fontSize: '18px', fill: '#e53935', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);

    // Controls hint
    this.add.text(W/4, 462, 'A / D to browse   F to confirm', { fontSize: '9px', fill: '#555', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(3*W/4, 462, '← / → to browse   L to confirm', { fontSize: '9px', fill: '#555', fontFamily: 'monospace' }).setOrigin(0.5);

    this._updateCursors();

    // Input
    const keys = this.input.keyboard.addKeys({
      p1Left: 'A', p1Right: 'D', p1Confirm: 'F',
      p2Left: 'LEFT', p2Right: 'RIGHT', p2Confirm: 'L',
    });
    keys.p1Left.on('down',    () => this._moveCursor(this.p1, -1, 'p1'));
    keys.p1Right.on('down',   () => this._moveCursor(this.p1,  1, 'p1'));
    keys.p1Confirm.on('down', () => this._confirm('p1'));
    keys.p2Left.on('down',    () => this._moveCursor(this.p2, -1, 'p2'));
    keys.p2Right.on('down',   () => this._moveCursor(this.p2,  1, 'p2'));
    keys.p2Confirm.on('down', () => this._confirm('p2'));
  }

  _moveCursor(player, dir, side) {
    if (player.confirmed) return;
    player.cursor = Phaser.Math.Clamp(player.cursor + dir, 0, FIGHTERS.length - 1);
    this._updateCursors();
    this._updatePreview(side);
  }

  _updateCursors() {
    const drawCursor = (g, portrait, side, confirmed) => {
      g.clear();
      const cx = side === 'p1' ? portrait.cx1 : portrait.cx2;
      const color = confirmed ? (side === 'p1' ? 0x4caf50 : 0xe53935) : 0xffffff;
      g.lineStyle(3, color, 1);
      g.strokeRect(cx - 28, portrait.cy - 56, 56, 72);
    };
    drawCursor(this.p1Cursor, this.portraits[this.p1.cursor], 'p1', this.p1.confirmed);
    drawCursor(this.p2Cursor, this.portraits[this.p2.cursor], 'p2', this.p2.confirmed);
  }

  _updatePreview(side) {
    const f = FIGHTERS[this[side].cursor];
    if (side === 'p1') { this.p1Preview.setTexture(`${f.id}_idle`); this.p1Name.setText(f.name); }
    else               { this.p2Preview.setTexture(`${f.id}_idle`); this.p2Name.setText(f.name); }
  }

  _confirm(side) {
    const player = this[side];
    if (player.confirmed) return;
    player.confirmed = true;
    this._updateCursors();
    if (this.p1.confirmed && this.p2.confirmed) this._startFight();
  }

  _startFight() {
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(600, () => {
      this.scene.start('Fight', {
        p1Fighter: FIGHTERS[this.p1.cursor].id,
        p2Fighter: FIGHTERS[this.p2.cursor].id,
      });
    });
  }
}
```

- [ ] **Step 2: Verify in browser**

Title → Enter → CharacterSelect. Expected:
- Split screen; P1 green header left, P2 red header right
- 6 fighter portraits on each side in a 3×2 grid
- A/D moves P1 white cursor; preview + name update at bottom
- ←/→ moves P2 white cursor; preview + name update at bottom
- F locks P1 (cursor turns green); L locks P2 (cursor turns red)
- Both locked → white flash → Fight stub loads

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: CharacterSelectScene split-screen picker with cursor and preview"
```

---

### Task 5: FightScene — Stage + HUD + Round System

**Files:**
- Modify: `index.html` — replace FightScene stub with stage, HUD, and round/timer logic (no fighters yet)

- [ ] **Step 1: Replace FightScene stub**

```javascript
class FightScene extends Phaser.Scene {
  constructor() { super('Fight'); }

  init(data) {
    this.p1FighterId = data.p1Fighter || 'cluck';
    this.p2FighterId = data.p2Fighter || 'slicer';
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.round  = 1;
  }

  create() {
    this._buildStage();
    this._buildHUD();
    this._showRoundBanner();
  }

  _buildStage() {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Sky
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a4e, 0x1a1a4e, 1);
    bg.fillRect(0, 0, W, H);

    // Stars
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < 60; i++) {
      stars.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 300),
                     Phaser.Math.Between(1, 2), Phaser.Math.Between(1, 2));
    }

    // Ground (visual)
    const gfx = this.add.graphics();
    gfx.fillStyle(0x4a3728, 1); gfx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    gfx.fillStyle(0x6b4f3a, 1); gfx.fillRect(0, FLOOR_Y, W, 8);

    // Ground (physics) — invisible rectangle
    const groundRect = this.add.rectangle(W/2, FLOOR_Y + 20, W, 40, 0x000000, 0);
    this.physics.add.existing(groundRect, true);
    this.groundCollider = groundRect;
  }

  _buildHUD() {
    // P1 health bar (left side)
    this.add.text(14, 10, 'P1', { fontSize: '13px', fill: '#4caf50', fontFamily: 'monospace', fontStyle: 'bold' });
    this.add.rectangle(114, 18, 200, 16, 0x333333).setOrigin(0, 0.5);
    this.p1Bar = this.add.rectangle(114, 18, 200, 16, 0x4caf50).setOrigin(0, 0.5);

    // P2 health bar (right side)
    this.add.text(W - 14, 10, 'P2', { fontSize: '13px', fill: '#e53935', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(1, 0);
    this.add.rectangle(W - 114, 18, 200, 16, 0x333333).setOrigin(1, 0.5);
    this.p2Bar = this.add.rectangle(W - 114, 18, 200, 16, 0xe53935).setOrigin(1, 0.5);

    // Win dots (best of 3)
    this.p1WinDots = [];
    this.p2WinDots = [];
    for (let i = 0; i < 3; i++) {
      this.p1WinDots.push(this.add.circle(330 + i * 14, 18, 5, 0x333333));
      this.p2WinDots.push(this.add.circle(W - 330 - i * 14, 18, 5, 0x333333));
    }

    // Timer
    this.timerText = this.add.text(W/2, 18, '99', {
      fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Round label
    this.roundLabel = this.add.text(W/2, 40, 'ROUND 1', {
      fontSize: '11px', fill: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // HP state
    this.p1HP = 100; this.p2HP = 100;
    this.timeLeft = 99;
    this.roundActive = false;
  }

  _updateHealthBars() {
    this.p1Bar.width = Math.max(0, (this.p1HP / 100) * 200);
    this.p2Bar.width = Math.max(0, (this.p2HP / 100) * 200);
  }

  _showRoundBanner() {
    this.roundLabel.setText(`ROUND ${this.round}`);
    const banner = this.add.text(W/2, H/2, `ROUND ${this.round}`, {
      fontSize: '56px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: banner, alpha: 1, duration: 300,
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: banner, alpha: 0, duration: 300,
            onComplete: () => { banner.destroy(); this._showFight(); },
          });
        });
      },
    });
  }

  _showFight() {
    const txt = this.add.text(W/2, H/2, 'FIGHT!', {
      fontSize: '72px', fill: '#f4c430', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#c97a00', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: txt, alpha: 1, duration: 200,
      onComplete: () => {
        this.time.delayedCall(500, () => {
          this.tweens.add({
            targets: txt, alpha: 0, duration: 200,
            onComplete: () => { txt.destroy(); this._startRound(); },
          });
        });
      },
    });
  }

  _startRound() {
    this.roundActive = true;
    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: 98,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(String(this.timeLeft));
        if (this.timeLeft <= 10) this.timerText.setColor('#e53935');
        if (this.timeLeft <= 0) this._endRound('time');
      },
    });
  }

  _endRound(reason) {
    if (!this.roundActive) return;
    this.roundActive = false;
    if (this.timerEvent) this.timerEvent.remove();

    const winner = (reason === 'ko')
      ? (this.p1HP <= 0 ? 'p2' : 'p1')
      : (this.p1HP >= this.p2HP ? 'p1' : 'p2');

    if (winner === 'p1') {
      this.p1WinDots[this.p1Wins].setFillStyle(0x4caf50);
      this.p1Wins++;
    } else {
      this.p2WinDots[this.p2Wins].setFillStyle(0xe53935);
      this.p2Wins++;
    }

    const label = reason === 'ko' ? 'KO!' : 'TIME!';
    const ko = this.add.text(W/2, H/2, label, {
      fontSize: '80px', fill: '#e53935', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#8b0000', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.tweens.add({ targets: ko, alpha: 1, duration: 200 });
    this.cameras.main.shake(300, 0.012);

    this.time.delayedCall(1500, () => {
      ko.destroy();
      if (this.p1Wins >= 2 || this.p2Wins >= 2) {
        this._endMatch();
      } else {
        this.round++;
        this.p1HP = 100; this.p2HP = 100;
        this.timeLeft = 99;
        this.timerText.setColor('#ffffff').setText('99');
        this._updateHealthBars();
        // Reposition fighters for next round
        if (this.f1) { this.f1.sprite.setPosition(200, FLOOR_Y - 60); this.f1.sprite.setVelocity(0, 0); }
        if (this.f2) { this.f2.sprite.setPosition(600, FLOOR_Y - 60); this.f2.sprite.setVelocity(0, 0); }
        this._showRoundBanner();
      }
    });
  }

  _endMatch() {
    const winner = this.p1Wins >= 2 ? 'p1' : 'p2';
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Win', {
        winner,
        p1Fighter: this.p1FighterId,
        p2Fighter: this.p2FighterId,
      });
    });
  }

  update() {}  // filled in Tasks 6 & 7
}
```

- [ ] **Step 2: Verify in browser**

Go Title → CharacterSelect → confirm both → Fight. Expected:
- Stars on dark blue sky, brown ground platform visible
- P1 green health bar left, P2 red health bar right, "99" center
- "ROUND 1" banner fades in, then "FIGHT!" flashes, then disappears
- Timer counts down from 99; turns red at 10
- At 0: "TIME!" appears, camera shakes, win dot fills, "ROUND 2" starts
- After 2 rounds won by same side: fades to WinScene stub

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: FightScene stage, HUD health bars, round/timer/KO system"
```

---

### Task 6: Fighter Class + Physics Movement

**Files:**
- Modify: `index.html` — add Fighter class before the scene classes, wire fighters into FightScene

- [ ] **Step 1: Add Fighter class before TitleScene**

```javascript
// ─── FIGHTER CLASS ─────────────────────────────────────────────────────────────
class Fighter {
  constructor(scene, x, y, fighterId, keys) {
    this.scene = scene;
    this.id = fighterId;
    this.keys = keys;
    this.facingRight = true;

    this.sprite = scene.physics.add.image(x, y, `${fighterId}_idle`);
    this.sprite.setScale(3);
    this.sprite.setCollideWorldBounds(true);

    this.isAttacking = false;
    this.isHurt      = false;
    this.attackTimer = 0;
    this.hurtTimer   = 0;
  }

  setFacing(right) {
    this.facingRight = right;
    this.sprite.setFlipX(!right);
  }

  update(delta) {
    if (this.isHurt) {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) { this.isHurt = false; this.sprite.clearTint(); }
      this.sprite.setVelocityX(0);
      return;
    }

    if (this.isAttacking) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.sprite.setTexture(`${this.id}_idle`);
        this.sprite.setFlipX(!this.facingRight);
      }
      this.sprite.setVelocityX(0);
      return;
    }

    // Horizontal movement
    let vx = 0;
    if (this.keys.left.isDown)  { vx = -220; this.setFacing(false); }
    else if (this.keys.right.isDown) { vx =  220; this.setFacing(true);  }
    this.sprite.setVelocityX(vx);

    // Jump
    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.sprite.body.blocked.down) {
      this.sprite.setVelocityY(-520);
    }

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
      this.isAttacking = true;
      this.attackTimer = 280;
      this.sprite.setTexture(`${this.id}_attack`);
      this.sprite.setFlipX(!this.facingRight);
    }
  }

  // Hitbox in world space — null when not attacking
  getHitbox() {
    if (!this.isAttacking) return null;
    const sx = this.sprite.x, sy = this.sprite.y;
    const reach = 72, h = 44;
    if (this.facingRight) return new Phaser.Geom.Rectangle(sx + 18, sy - h/2, reach, h);
    else                  return new Phaser.Geom.Rectangle(sx - 18 - reach, sy - h/2, reach, h);
  }

  // Hurtbox — always active
  getHurtbox() {
    return new Phaser.Geom.Rectangle(this.sprite.x - 22, this.sprite.y - 44, 44, 88);
  }

  takeDamage(amount) {
    if (this.isHurt) return false; // invincibility frames
    this.isHurt = true;
    this.hurtTimer = 450;
    this.sprite.setTint(0xff5500);
    this.sprite.setVelocityX(this.facingRight ? -130 : 130); // knockback
    return true;
  }
}
```

- [ ] **Step 2: Spawn fighters in FightScene.create() after _showRoundBanner()**

Add these lines at the end of `create()`, after `this._showRoundBanner()`:

```javascript
// Input maps
const p1Keys = this.input.keyboard.addKeys({ left:'A', right:'D', jump:'W', attack:'F' });
const p2Keys = this.input.keyboard.addKeys({ left:'LEFT', right:'RIGHT', jump:'UP', attack:'L' });

// Spawn
this.f1 = new Fighter(this, 200, FLOOR_Y - 60, this.p1FighterId, p1Keys);
this.f2 = new Fighter(this, 600, FLOOR_Y - 60, this.p2FighterId, p2Keys);
this.f1.setFacing(true);
this.f2.setFacing(false);

// Ground collision
this.physics.add.collider(this.f1.sprite, this.groundCollider);
this.physics.add.collider(this.f2.sprite, this.groundCollider);
```

- [ ] **Step 3: Replace FightScene.update() with fighter update calls**

```javascript
update(time, delta) {
  if (!this.roundActive) return;
  this.f1.update(delta);
  this.f2.update(delta);
}
```

- [ ] **Step 4: Verify in browser**

Pick fighters → fight starts. Expected:
- Both selected fighters appear standing on the ground platform
- P1: A/D moves left/right, W jumps, F triggers attack frame (brief texture swap)
- P2: arrow keys move, Up jumps, L attacks
- Fighters face toward center initially
- Fighters stay on ground (physics gravity working)
- Fighters stay within screen bounds (no walking off edge)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: Fighter class with arcade physics movement, jump, and attack animation"
```

---

### Task 7: Combat — Hit Detection + Damage

**Files:**
- Modify: `index.html` — add `_checkCombat()` to FightScene

- [ ] **Step 1: Add _checkCombat() to FightScene and call it from update()**

Add this method to FightScene:
```javascript
_checkCombat() {
  // f1 attacks f2
  const h1 = this.f1.getHitbox();
  if (h1 && Phaser.Geom.Rectangle.Overlaps(h1, this.f2.getHurtbox())) {
    if (this.f2.takeDamage(12)) {
      this.p2HP = Math.max(0, this.p2HP - 12);
      this._updateHealthBars();
      this.cameras.main.flash(80, 255, 60, 60, false);
      if (this.p2HP <= 0) this._endRound('ko');
    }
  }

  // f2 attacks f1
  const h2 = this.f2.getHitbox();
  if (h2 && Phaser.Geom.Rectangle.Overlaps(h2, this.f1.getHurtbox())) {
    if (this.f1.takeDamage(12)) {
      this.p1HP = Math.max(0, this.p1HP - 12);
      this._updateHealthBars();
      this.cameras.main.flash(80, 255, 60, 60, false);
      if (this.p1HP <= 0) this._endRound('ko');
    }
  }
}
```

Update update() to call it:
```javascript
update(time, delta) {
  if (!this.roundActive) return;
  this.f1.update(delta);
  this.f2.update(delta);
  this._checkCombat();
}
```

- [ ] **Step 2: Verify in browser**

Walk P1 close to P2 and press F. Expected:
- P2 flashes orange-red, bounces back slightly
- P2 health bar shrinks by ~12% per hit
- Screen flashes briefly red on each hit
- 9 clean hits → P2 HP reaches 0 → "KO!" appears, camera shakes
- Round ends, win dot fills for P1
- Next round starts or WinScene if P1 wins 2nd round

Test timer path: don't attack, wait 99s. Expected: "TIME!" appears, higher HP wins.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: hit detection with Rectangle.Overlaps, damage, KO and health drain"
```

---

### Task 8: WinScene

**Files:**
- Modify: `index.html` — replace WinScene stub

- [ ] **Step 1: Replace WinScene with full implementation**

```javascript
class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }

  init(data) {
    this.winner     = data.winner;
    this.p1Fighter  = data.p1Fighter;
    this.p2Fighter  = data.p2Fighter;
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Background
    this.add.graphics().fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1).fillRect(0, 0, W, H);

    const winFighter = this.winner === 'p1' ? this.p1Fighter : this.p2Fighter;
    const winColor   = this.winner === 'p1' ? '#4caf50' : '#e53935';
    const winLabel   = this.winner === 'p1' ? 'PLAYER 1' : 'PLAYER 2';

    // Winner text
    this.add.text(W/2, 90, `${winLabel} WINS!`, {
      fontSize: '48px', fill: winColor, fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Big winner sprite (pulsing)
    const sprite = this.add.image(W/2, H/2 - 20, `${winFighter}_idle`).setScale(8);
    this.tweens.add({ targets: sprite, scaleX: 8.5, scaleY: 8.5, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Falling confetti
    for (let i = 0; i < 35; i++) {
      const r = this.add.rectangle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(-40, 0),
        Phaser.Math.Between(6, 10), Phaser.Math.Between(6, 10),
        Phaser.Math.Between(0x444444, 0xffffff)
      );
      this.tweens.add({
        targets: r,
        y: H + 20,
        x: r.x + Phaser.Math.Between(-80, 80),
        duration: Phaser.Math.Between(1500, 3200),
        delay: Phaser.Math.Between(0, 1200),
        repeat: -1,
      });
    }

    // Menu options
    this.selected = 0;
    this.options = [
      this.add.text(W/2, 390, '▶  PLAY AGAIN', { fontSize: '22px', fontFamily: 'monospace' }).setOrigin(0.5),
      this.add.text(W/2, 430, '   QUIT TO TITLE', { fontSize: '22px', fontFamily: 'monospace', fill: '#888' }).setOrigin(0.5),
    ];
    this._updateSelection();

    // Input — either player can navigate
    const keys = this.input.keyboard.addKeys({
      up1:'W', down1:'S', ok1:'F',
      up2:'UP', down2:'DOWN', ok2:'L',
      enter:'ENTER',
    });
    keys.up1.on('down',   () => this._move(-1)); keys.down1.on('down', () => this._move(1));
    keys.up2.on('down',   () => this._move(-1)); keys.down2.on('down', () => this._move(1));
    keys.ok1.on('down',   () => this._select()); keys.ok2.on('down',   () => this._select());
    keys.enter.on('down', () => this._select());
  }

  _updateSelection() {
    this.options[0].setColor(this.selected === 0 ? '#f4c430' : '#888888').setFontStyle(this.selected === 0 ? 'bold' : 'normal');
    this.options[1].setColor(this.selected === 1 ? '#f4c430' : '#888888').setFontStyle(this.selected === 1 ? 'bold' : 'normal');
  }

  _move(dir) {
    this.selected = Phaser.Math.Clamp(this.selected + dir, 0, 1);
    this._updateSelection();
  }

  _select() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.selected === 0 ? 'CharacterSelect' : 'Title');
    });
  }
}
```

- [ ] **Step 2: Verify in browser**

Win a match (score 2 rounds). Expected:
- WinScene fades in
- Large pulsing winner sprite (correctly shows the character that won)
- "PLAYER 1 WINS!" in green or "PLAYER 2 WINS!" in red
- Colored confetti falls
- W/S or ↑/↓ highlights PLAY AGAIN / QUIT TO TITLE in gold
- F, L, or Enter confirms → fades to CharacterSelect or Title

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: WinScene with pulsing sprite, confetti, and play-again flow"
```

---

### Task 9: Polish — HUD Portraits + Fighter Facing Fix

**Files:**
- Modify: `index.html` — add fighter mini-portraits to HUD, fix P2 sprite facing on round reset

- [ ] **Step 1: Add fighter mini-portraits beside health bars in _buildHUD()**

Add these two lines at the end of `_buildHUD()`, after win dots:
```javascript
this.add.image(96, 18, `${this.p1FighterId}_idle`).setScale(2).setOrigin(1, 0.5);
this.add.image(W - 96, 18, `${this.p2FighterId}_idle`).setScale(2).setFlipX(true).setOrigin(0, 0.5);
```

- [ ] **Step 2: Fix fighter facing direction after round reset**

In `_endRound()`, inside the `else` branch where new round starts, after the `setPosition` calls:
```javascript
if (this.f1) {
  this.f1.sprite.setPosition(200, FLOOR_Y - 60);
  this.f1.sprite.setVelocity(0, 0);
  this.f1.setFacing(true);
  this.f1.isAttacking = false;
  this.f1.isHurt = false;
  this.f1.sprite.clearTint();
  this.f1.sprite.setTexture(`${this.f1.id}_idle`);
}
if (this.f2) {
  this.f2.sprite.setPosition(600, FLOOR_Y - 60);
  this.f2.sprite.setVelocity(0, 0);
  this.f2.setFacing(false);
  this.f2.isAttacking = false;
  this.f2.isHurt = false;
  this.f2.sprite.clearTint();
  this.f2.sprite.setTexture(`${this.f2.id}_idle`);
}
```

- [ ] **Step 3: End-to-end smoke test**

Play the full game from Title to WinScene and back:
1. Title loads — fighter parade bobs, Enter fades to CharacterSelect ✓
2. CharacterSelect — P1 picks Cluck, P2 picks Slicer, white flash → Fight ✓
3. Round 1 — "ROUND 1" + "FIGHT!" banners, both fighters visible ✓
4. Combat — hit detection works, HP drains, hurt flash on hit ✓
5. KO — "KO!" + camera shake, win dot fills ✓
6. Round 2 — fighters reset position facing each other ✓
7. Match end — fades to WinScene ✓
8. WinScene — correct winner, confetti, navigate menu ✓
9. Play Again → CharacterSelect with fade ✓
10. Quit → Title with fade ✓

- [ ] **Step 4: Final commit**

```bash
git add index.html
git commit -m "feat: HUD fighter portraits and round-reset facing fix — game complete"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| 4 chickens (Cluck, Wing, Peck, Talons) with colored bandanas | Task 2 |
| Kangaroo Sensei (orange gi, cane) | Task 2 |
| Slicer (dark armor, red visor, blade) | Task 2 |
| Pixel art style | Task 2 — S=4 pixel cells via Graphics API |
| TitleScene with fighter parade | Task 3 |
| Character select — split screen, both confirm | Task 4 |
| P1: WASD + F  /  P2: Arrows + L | Task 6 — Fighter constructor keys |
| Health bars | Task 5 — `_buildHUD` |
| 99s round timer | Task 5 — `_startRound` |
| Best of 3 rounds | Task 5 — `p1Wins`/`p2Wins`, `_endRound` |
| Jump + attack | Task 6 — Fighter.update() jump + attack combo |
| Hit detection + damage | Task 7 — `_checkCombat`, `Rectangle.Overlaps` |
| KO / TIME! announcements | Task 5 — `_endRound` |
| WinScene with play again | Task 8 |
| Smooth transitions (fade/flash) | Tasks 3, 4, 5, 8 |
| Single index.html, Phaser CDN | Task 1 |

**Placeholder scan:** None found.

**Type consistency:**
- `FIGHTERS[i].id` used as texture key prefix throughout — consistent ✓
- `Fighter.getHitbox()` / `Fighter.getHurtbox()` both return `Phaser.Geom.Rectangle` — consumed by `Phaser.Geom.Rectangle.Overlaps()` in Task 7 ✓
- Scene data `{ p1Fighter, p2Fighter }` passed from CharacterSelect, received in `FightScene.init(data)` ✓
- `FightScene` passes `{ winner, p1Fighter, p2Fighter }` to WinScene — all three consumed in `WinScene.init()` ✓
- `_endRound('ko')` and `_endRound('time')` strings match the conditional in `_endRound()` ✓
