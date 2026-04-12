# Ninja Raccoons Team Up — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 1v1 Street Fighter-style fighting game with 4 ninja raccoons, 2-player keyboard controls, HP bars, round system, and ElevenLabs voices.

**Architecture:** Pure static web app — Phaser.js 3 for game rendering, HTML/CSS overlays for HUD, ElevenLabs REST API for voice. ES modules throughout. No build step, no backend. Open `index.html` directly in browser.

**Tech Stack:** Phaser 3.60 (CDN), ElevenLabs TTS API v1, vanilla JS ES modules, HTML/CSS

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Entry point — loads Phaser CDN, boots game |
| `config.js` | Character data, voice IDs, ElevenLabs API key |
| `game/systems/CombatSystem.js` | Pure functions: damage, block, special meter, round end |
| `game/systems/VoiceSystem.js` | ElevenLabs REST calls, audio blob cache, playback |
| `game/entities/Fighter.js` | Base fighter: movement, jump, attack states, sprite |
| `game/entities/characters/Rico.js` | Rico stats + Shadow Slash special |
| `game/entities/characters/Razz.js` | Razz stats + Rage Rush special |
| `game/entities/characters/Munchy.js` | Munchy stats + Pizza Time special + random timer |
| `game/entities/characters/Dex.js` | Dex stats + Static Shock special |
| `game/scenes/TitleScene.js` | Title screen, Boomer wisdom, keypress to start |
| `game/scenes/CharacterSelectScene.js` | HTML overlay character picker for P1 + P2 |
| `game/scenes/FightScene.js` | Main fight loop, input, rounds, HUD |
| `game/scenes/WinScene.js` | Winner display, Slicer taunt, play again |
| `ui/hud.css` | HP bars, special meter, timer styles |
| `tests/run.html` | Browser-based unit tests for CombatSystem + VoiceSystem |

---

### Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `config.js`
- Create: `ui/hud.css`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
config.js
.superpowers/
```

- [ ] **Step 2: Create `config.js`**

```js
// config.js — ADD YOUR ELEVENLABS API KEY BELOW
// This file is gitignored — never commit your key

export const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY_HERE';

// ElevenLabs voice IDs — replace with real IDs from your ElevenLabs account
// Go to elevenlabs.io → Voices → click a voice → copy the Voice ID
export const VOICE_IDS = {
  rico:   'replace_with_rico_voice_id',
  razz:   'replace_with_razz_voice_id',
  munchy: 'replace_with_munchy_voice_id',
  dex:    'replace_with_dex_voice_id',
  boomer: 'replace_with_boomer_voice_id',
  slicer: 'replace_with_slicer_voice_id',
};

export const CHARACTERS = {
  rico: {
    id: 'rico',
    name: 'Rico',
    color: 0x3b82f6,       // blue
    cssColor: '#3b82f6',
    speed: 220,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 22,
    specialName: 'Shadow Slash',
    voiceId: VOICE_IDS.rico,
    lines: {
      intro:   'We fight as one.',
      special: 'Shadow Slash!',
      hit:     'Tch.',
      win:     'Discipline wins every time.',
    },
  },
  razz: {
    id: 'razz',
    name: 'Razz',
    color: 0xef4444,       // red
    cssColor: '#ef4444',
    speed: 280,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 20,
    specialName: 'Rage Rush',
    voiceId: VOICE_IDS.razz,
    lines: {
      intro:   "You wanna go?! COME ON!",
      special: 'RAGE RUSH!',
      hit:     "That's IT, you're DEAD!",
      win:     "Yeah! YEAH! THAT'S WHAT I'M TALKING ABOUT!",
    },
  },
  munchy: {
    id: 'munchy',
    name: 'Munchy',
    color: 0xfb923c,       // orange
    cssColor: '#fb923c',
    speed: 230,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 21,
    specialName: 'Pizza Time',
    voiceId: VOICE_IDS.munchy,
    lines: {
      intro:   "Dude... can we fight after I finish this slice?",
      special: 'PIZZA TIIIIME!',
      hit:     'Ow... worth it.',
      win:     'Victory tastes like pepperoni.',
      random:  "IT'S PIZZA TIME!",
    },
  },
  dex: {
    id: 'dex',
    name: 'Dex',
    color: 0xa855f7,       // purple
    cssColor: '#a855f7',
    speed: 190,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 25,
    specialName: 'Static Shock',
    voiceId: VOICE_IDS.dex,
    lines: {
      intro:   'Statistically, you never had a chance.',
      special: 'Static Shock — initiated.',
      hit:     'Fascinating. That hurt.',
      win:     'As calculated.',
    },
  },
};

export const CHARACTER_ORDER = ['rico', 'razz', 'munchy', 'dex'];

export const BOOMER = {
  voiceId: VOICE_IDS.boomer,
  wisdomLines: [
    'A raccoon who rushes in... gets hit first.',
    'Patience, young dumpster diver.',
    'The trash heap of life holds many treasures.',
    'Strike with purpose. Eat pizza with passion.',
    'Your enemy is fast. Your mind must be faster.',
  ],
};

export const SLICER = {
  voiceId: VOICE_IDS.slicer,
  tauntLines: [
    'You call that fighting?',
    'Pathetic. Even for raccoons.',
    "Next time I won't hold back.",
  ],
};

export const GAME = {
  width: 900,
  height: 500,
  groundY: 420,
  roundTime: 60,
  maxRounds: 3,
  winsNeeded: 2,
  pizzaTimerMin: 8000,
  pizzaTimerMax: 15000,
};
```

- [ ] **Step 3: Create `ui/hud.css`**

```css
/* ui/hud.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

#hud {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  font-family: 'Impact', sans-serif;
  z-index: 10;
}

#hud-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 20px;
  gap: 20px;
}

.player-hud {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-hud.p2 { align-items: flex-end; }

.player-name {
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 0 #000;
  letter-spacing: 1px;
}

.hp-bar-bg {
  width: 100%;
  height: 22px;
  background: #333;
  border: 2px solid #000;
  border-radius: 4px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #22c55e, #86efac);
  transition: width 0.1s ease-out;
}

.hp-bar-fill.low    { background: linear-gradient(to right, #f59e0b, #fcd34d); }
.hp-bar-fill.danger { background: linear-gradient(to right, #ef4444, #fca5a5); }

.special-bar-bg {
  width: 100%;
  height: 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 2px;
  overflow: hidden;
}

.special-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #6366f1, #a78bfa);
  transition: width 0.15s ease-out;
}

.special-ready {
  font-size: 12px;
  color: #a78bfa;
  letter-spacing: 2px;
  animation: pulse 0.6s infinite alternate;
  display: none;
}

.special-ready.visible { display: block; }

@keyframes pulse {
  from { opacity: 0.5; }
  to   { opacity: 1; }
}

#timer-box {
  width: 80px;
  text-align: center;
  flex-shrink: 0;
}

#timer {
  font-size: 42px;
  font-weight: bold;
  color: #fff;
  text-shadow: 3px 3px 0 #000;
  line-height: 1;
}

#round-display {
  font-size: 13px;
  color: #aaa;
  text-align: center;
  margin-top: 2px;
}

.round-pip {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  margin: 0 2px;
}

.round-pip.won { background: #facc15; border-color: #facc15; }

#fight-flash {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  font-weight: bold;
  color: #fff;
  text-shadow: 4px 4px 0 #000, -2px -2px 0 #000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 20;
  letter-spacing: 4px;
}

#fight-flash.show { opacity: 1; }
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ninja Raccoons</title>
  <link rel="stylesheet" href="ui/hud.css">
  <style>
    body {
      margin: 0;
      background: #0a0a0a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script type="module">
    import { TitleScene }           from './game/scenes/TitleScene.js';
    import { CharacterSelectScene } from './game/scenes/CharacterSelectScene.js';
    import { FightScene }           from './game/scenes/FightScene.js';
    import { WinScene }             from './game/scenes/WinScene.js';
    import { GAME }                 from './config.js';

    const config = {
      type: Phaser.AUTO,
      width: GAME.width,
      height: GAME.height,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false },
      },
      scene: [TitleScene, CharacterSelectScene, FightScene, WinScene],
    };

    new Phaser.Game(config);
  </script>
</body>
</html>
```

- [ ] **Step 5: Open `index.html` in browser — verify black screen with no console errors**

Open `index.html` in Chrome/Firefox. Expected: black/dark background, no red console errors (a warning about missing scenes is fine — they don't exist yet).

- [ ] **Step 6: Commit**

```bash
git init
git add index.html config.js ui/hud.css .gitignore docs/
git commit -m "feat: project scaffold — index.html, config, HUD CSS, spec+plan docs"
```

---

### Task 2: CombatSystem (pure functions + tests)

**Files:**
- Create: `game/systems/CombatSystem.js`
- Create: `tests/run.html`

- [ ] **Step 1: Create `tests/run.html` (test runner)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ninja Raccoons — Tests</title>
  <style>
    body { font-family: monospace; background: #0f0f0f; color: #e5e5e5; padding: 24px; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    h2 { color: #a78bfa; margin: 16px 0 8px; }
    #summary { margin-top: 20px; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
<h1>Test Results</h1>
<div id="output"></div>
<div id="summary"></div>
<script type="module">
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  }

  function assertEqual(a, b) {
    if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
  }

  // ── CombatSystem tests ────────────────────────────────────────────────
  import {
    calcDamage,
    updateSpecialMeter,
    checkRoundEnd,
    applyKnockback,
  } from '../game/systems/CombatSystem.js';

  test('calcDamage: full damage when not blocking', () => {
    assertEqual(calcDamage(10, false), 10);
  });

  test('calcDamage: 30% damage when blocking', () => {
    assertEqual(calcDamage(10, true), 3);
  });

  test('calcDamage: rounds down', () => {
    assertEqual(calcDamage(5, true), 2); // floor(5 * 0.3) = 1... actually floor(1.5) = 1
    assertEqual(calcDamage(7, true), 2); // floor(7 * 0.3) = floor(2.1) = 2
  });

  test('updateSpecialMeter: adds 10% per hit dealt', () => {
    assertEqual(updateSpecialMeter(0, 10, 0), 10);
  });

  test('updateSpecialMeter: adds 10% per hit received', () => {
    assertEqual(updateSpecialMeter(0, 0, 10), 10);
  });

  test('updateSpecialMeter: caps at 100', () => {
    assertEqual(updateSpecialMeter(95, 10, 0), 100);
  });

  test('updateSpecialMeter: does not go below 0', () => {
    assertEqual(updateSpecialMeter(0, 0, 0), 0);
  });

  test('checkRoundEnd: returns null when both fighters alive', () => {
    assert(checkRoundEnd(50, 50, 30) === null);
  });

  test('checkRoundEnd: returns 0 when p2 hp is 0', () => {
    assertEqual(checkRoundEnd(50, 0, 30), 0);
  });

  test('checkRoundEnd: returns 1 when p1 hp is 0', () => {
    assertEqual(checkRoundEnd(0, 50, 30), 1);
  });

  test('checkRoundEnd: returns winner by hp when timer hits 0', () => {
    assertEqual(checkRoundEnd(80, 40, 0), 0);
    assertEqual(checkRoundEnd(20, 90, 0), 1);
  });

  test('checkRoundEnd: timer 0 with equal hp returns null (draw — sudden death)', () => {
    assert(checkRoundEnd(50, 50, 0) === null);
  });

  test('applyKnockback: returns positive offset for p1 hitting p2', () => {
    const { dx } = applyKnockback(0); // p1 knocks p2 right
    assert(dx > 0);
  });

  test('applyKnockback: returns negative offset for p2 hitting p1', () => {
    const { dx } = applyKnockback(1); // p2 knocks p1 left
    assert(dx < 0);
  });

  // ── Render results ────────────────────────────────────────────────────
  const out = document.getElementById('output');
  const byGroup = {};
  for (const r of results) {
    const group = r.name.split(':')[0];
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(r);
  }

  for (const [group, items] of Object.entries(byGroup)) {
    const h = document.createElement('h2');
    h.textContent = group;
    out.appendChild(h);
    for (const r of items) {
      const p = document.createElement('p');
      p.className = r.pass ? 'pass' : 'fail';
      p.textContent = r.pass
        ? `✅ ${r.name}`
        : `❌ ${r.name} — ${r.error}`;
      out.appendChild(p);
    }
  }

  const passed = results.filter(r => r.pass).length;
  const total  = results.length;
  const sum = document.getElementById('summary');
  sum.className = passed === total ? 'pass' : 'fail';
  sum.textContent = `${passed}/${total} tests passed`;
</script>
</body>
</html>
```

- [ ] **Step 2: Open `tests/run.html` — verify all tests fail with "Cannot find module"**

Expected: red errors in console, no results rendered. This confirms the test file loads but the module doesn't exist yet.

- [ ] **Step 3: Create `game/systems/CombatSystem.js`**

```js
// game/systems/CombatSystem.js

const BLOCK_MULTIPLIER = 0.3;
const SPECIAL_METER_PER_DAMAGE = 1; // 1% meter per 1 damage dealt/received
const KNOCKBACK_AMOUNT = 60;

/**
 * Calculate damage after blocking.
 * @param {number} baseDamage
 * @param {boolean} isBlocking
 * @returns {number}
 */
export function calcDamage(baseDamage, isBlocking) {
  if (isBlocking) return Math.floor(baseDamage * BLOCK_MULTIPLIER);
  return baseDamage;
}

/**
 * Update special meter — gains 1% per point of damage dealt or received.
 * @param {number} current  0-100
 * @param {number} damageDealt
 * @param {number} damageReceived
 * @returns {number} new meter value, clamped 0-100
 */
export function updateSpecialMeter(current, damageDealt, damageReceived) {
  const gain = (damageDealt + damageReceived) * SPECIAL_METER_PER_DAMAGE;
  return Math.min(100, Math.max(0, current + gain));
}

/**
 * Check if a round has ended.
 * @param {number} p1Hp   0-100
 * @param {number} p2Hp   0-100
 * @param {number} timeLeft  seconds remaining
 * @returns {0|1|null}  winner index (0=p1, 1=p2) or null if still going
 */
export function checkRoundEnd(p1Hp, p2Hp, timeLeft) {
  if (p2Hp <= 0) return 0;
  if (p1Hp <= 0) return 1;
  if (timeLeft <= 0) {
    if (p1Hp > p2Hp) return 0;
    if (p2Hp > p1Hp) return 1;
    return null; // draw — continue (sudden death)
  }
  return null;
}

/**
 * Get knockback velocity for the defender.
 * @param {number} attackerIndex  0=p1, 1=p2
 * @returns {{ dx: number }}  velocity to add to defender
 */
export function applyKnockback(attackerIndex) {
  // p1 attacks p2: p2 flies right (+x)
  // p2 attacks p1: p1 flies left (-x)
  return { dx: attackerIndex === 0 ? KNOCKBACK_AMOUNT : -KNOCKBACK_AMOUNT };
}
```

- [ ] **Step 4: Open `tests/run.html` — verify all 12 tests pass**

Expected output:
```
✅ calcDamage: full damage when not blocking
✅ calcDamage: 30% damage when blocking
✅ calcDamage: rounds down
... (all green)
12/12 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add game/systems/CombatSystem.js tests/run.html
git commit -m "feat: CombatSystem with damage, special meter, round end logic (all tests pass)"
```

---

### Task 3: VoiceSystem

**Files:**
- Create: `game/systems/VoiceSystem.js`

- [ ] **Step 1: Add VoiceSystem tests to `tests/run.html`**

Add these tests inside the `<script type="module">` block in `tests/run.html`, after the CombatSystem import section and before the render section:

```js
// ── VoiceSystem tests ─────────────────────────────────────────────────
import { VoiceSystem } from '../game/systems/VoiceSystem.js';

test('VoiceSystem: caches audio by voiceId+text key', async () => {
  const vs = new VoiceSystem('fake-key');
  // Manually inject a cached entry
  vs._cache.set('voice1:hello', new Blob(['fake'], { type: 'audio/mpeg' }));
  assert(vs._cache.has('voice1:hello'), 'Cache should contain injected entry');
});

test('VoiceSystem: cache key format is voiceId:text', () => {
  const vs = new VoiceSystem('fake-key');
  assertEqual(vs._cacheKey('abc123', 'Hello!'), 'abc123:Hello!');
});

test('VoiceSystem: isCached returns true for cached line', () => {
  const vs = new VoiceSystem('fake-key');
  vs._cache.set('v:line', new Blob([], { type: 'audio/mpeg' }));
  assert(vs.isCached('v', 'line') === true);
});

test('VoiceSystem: isCached returns false for uncached line', () => {
  const vs = new VoiceSystem('fake-key');
  assert(vs.isCached('v', 'not-cached') === false);
});
```

- [ ] **Step 2: Open `tests/run.html` — verify VoiceSystem tests fail**

- [ ] **Step 3: Create `game/systems/VoiceSystem.js`**

```js
// game/systems/VoiceSystem.js

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export class VoiceSystem {
  constructor(apiKey) {
    this._apiKey = apiKey;
    this._cache = new Map(); // key: `${voiceId}:${text}` -> Blob
  }

  _cacheKey(voiceId, text) {
    return `${voiceId}:${text}`;
  }

  isCached(voiceId, text) {
    return this._cache.has(this._cacheKey(voiceId, text));
  }

  /**
   * Speak a line. Non-blocking — fires and forgets.
   * Caches the audio blob after first fetch.
   * @param {string} voiceId  ElevenLabs voice ID
   * @param {string} text     Text to speak
   */
  speak(voiceId, text) {
    if (!voiceId || voiceId.startsWith('replace_with')) {
      // API key or voice ID not configured — skip silently
      return;
    }
    const key = this._cacheKey(voiceId, text);
    if (this._cache.has(key)) {
      this._playBlob(this._cache.get(key));
      return;
    }
    this._fetchAndPlay(voiceId, text, key);
  }

  async _fetchAndPlay(voiceId, text, key) {
    try {
      const res = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this._apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (!res.ok) {
        console.warn(`VoiceSystem: ElevenLabs error ${res.status} for "${text}"`);
        return;
      }
      const blob = await res.blob();
      this._cache.set(key, blob);
      this._playBlob(blob);
    } catch (err) {
      console.warn('VoiceSystem: fetch failed', err.message);
    }
  }

  _playBlob(blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {
      // Browser autoplay policy — silently skip if blocked
    });
  }
}
```

- [ ] **Step 4: Open `tests/run.html` — verify all tests pass (now 16/16)**

- [ ] **Step 5: Commit**

```bash
git add game/systems/VoiceSystem.js tests/run.html
git commit -m "feat: VoiceSystem — ElevenLabs TTS with blob caching (tests pass)"
```

---

### Task 4: Fighter Base Class

**Files:**
- Create: `game/entities/Fighter.js`

- [ ] **Step 1: Create `game/entities/Fighter.js`**

```js
// game/entities/Fighter.js
import { calcDamage, updateSpecialMeter, applyKnockback } from '../systems/CombatSystem.js';

const GROUND_Y_OFFSET = 40; // half fighter height

export class Fighter {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y  ground Y
   * @param {object} config  from CHARACTERS in config.js
   * @param {number} playerIndex  0 or 1
   * @param {import('../systems/VoiceSystem.js').VoiceSystem} voiceSystem
   */
  constructor(scene, x, y, config, playerIndex, voiceSystem) {
    this.scene = scene;
    this.config = config;
    this.playerIndex = playerIndex;
    this.voiceSystem = voiceSystem;

    // Combat state
    this.hp = 100;
    this.specialMeter = 0;
    this.isBlocking = false;
    this.isAttacking = false;
    this.isStunned = false;
    this.stunTimer = 0;
    this.facingRight = playerIndex === 0; // p1 faces right, p2 faces left

    // Phaser physics body (rectangle sprite)
    this.sprite = scene.add.rectangle(x, y - GROUND_Y_OFFSET, 60, 80, config.color);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setMaxVelocityX(config.speed);

    // Name label above sprite
    this.label = scene.add.text(x, y - GROUND_Y_OFFSET - 52, config.name.toUpperCase(), {
      fontSize: '13px',
      fontFamily: 'Impact, sans-serif',
      color: config.cssColor,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Weapon emoji label
    this.weaponLabel = scene.add.text(x, y - GROUND_Y_OFFSET, '', {
      fontSize: '22px',
    }).setOrigin(0.5);

    // Attack hitbox (invisible rectangle)
    this.hitbox = scene.add.rectangle(x, y - GROUND_Y_OFFSET, 70, 60, 0xffffff, 0);
    scene.physics.add.existing(this.hitbox, true); // static

    this._attackCooldown = 0;
    this._heavyCooldown = 0;
    this._specialCooldown = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  // ── Input handlers ────────────────────────────────────────────────────

  moveLeft() {
    if (this.isStunned || this.isAttacking) return;
    this.sprite.body.setVelocityX(-this.config.speed);
    this.facingRight = false;
    this._updateHitboxPosition();
  }

  moveRight() {
    if (this.isStunned || this.isAttacking) return;
    this.sprite.body.setVelocityX(this.config.speed);
    this.facingRight = true;
    this._updateHitboxPosition();
  }

  stopHorizontal() {
    this.sprite.body.setVelocityX(0);
  }

  jump() {
    if (this.isStunned) return;
    if (this.sprite.body.blocked.down) {
      this.sprite.body.setVelocityY(this.config.jumpVelocity);
    }
  }

  setBlocking(active) {
    if (this.isStunned || this.isAttacking) return;
    this.isBlocking = active;
    this.sprite.setAlpha(active ? 0.6 : 1);
  }

  lightAttack(opponent) {
    if (this.isStunned || this._attackCooldown > 0) return;
    this._attackCooldown = 300; // ms
    this.isAttacking = true;
    this._performAttack(opponent, this.config.lightDamage, false);
    this.scene.time.delayedCall(200, () => { this.isAttacking = false; });
  }

  heavyAttack(opponent) {
    if (this.isStunned || this._heavyCooldown > 0) return;
    this._heavyCooldown = 600;
    this.isAttacking = true;
    this._performAttack(opponent, this.config.heavyDamage, true);
    this.scene.time.delayedCall(400, () => { this.isAttacking = false; });
  }

  specialAttack(opponent) {
    if (this.isStunned || this.specialMeter < 100 || this._specialCooldown > 0) return;
    this._specialCooldown = 1000;
    this.specialMeter = 0;
    this.isAttacking = true;
    this.voiceSystem.speak(this.config.voiceId, this.config.lines.special);
    this._doSpecial(opponent);
    this.scene.time.delayedCall(500, () => { this.isAttacking = false; });
  }

  // Override in subclasses for unique specials
  _doSpecial(opponent) {
    this._performAttack(opponent, this.config.specialDamage, true);
  }

  // ── Core combat ───────────────────────────────────────────────────────

  _performAttack(opponent, baseDamage, causesKnockback) {
    if (!this._inRange(opponent)) return;

    const damage = calcDamage(baseDamage, opponent.isBlocking);
    opponent.takeDamage(damage, this.playerIndex, causesKnockback);

    this.specialMeter = updateSpecialMeter(this.specialMeter, damage, 0);

    if (damage >= this.config.heavyDamage) {
      this.voiceSystem.speak(this.config.voiceId, this.config.lines.special);
    }

    // Flash attacker bright
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1.5, to: 1 },
      duration: 100,
    });
  }

  takeDamage(amount, attackerIndex, causesKnockback) {
    this.hp = Math.max(0, this.hp - amount);
    this.specialMeter = updateSpecialMeter(this.specialMeter, 0, amount);

    // Flash red
    this.sprite.setFillStyle(0xff0000);
    this.scene.time.delayedCall(120, () => {
      this.sprite.setFillStyle(this.config.color);
    });

    if (amount >= this.config.heavyDamage) {
      this.voiceSystem.speak(this.config.voiceId, this.config.lines.hit);
      if (causesKnockback) this._applyKnockback(attackerIndex);
    }

    if (this.scene.events) {
      this.scene.events.emit('hpChanged', this.playerIndex, this.hp);
      this.scene.events.emit('specialChanged', this.playerIndex, this.specialMeter);
    }
  }

  stun(durationMs) {
    this.isStunned = true;
    this.sprite.setAlpha(0.5);
    this.scene.time.delayedCall(durationMs, () => {
      this.isStunned = false;
      this.sprite.setAlpha(1);
    });
  }

  _applyKnockback(attackerIndex) {
    const { dx } = applyKnockback(attackerIndex);
    this.sprite.body.setVelocityX(this.sprite.body.velocity.x + dx * 5);
  }

  _inRange(opponent) {
    return Math.abs(this.x - opponent.x) < 110;
  }

  _updateHitboxPosition() {
    const offsetX = this.facingRight ? 50 : -50;
    this.hitbox.x = this.x + offsetX;
    this.hitbox.y = this.y;
  }

  // ── Per-frame update ──────────────────────────────────────────────────

  update(delta) {
    // Tick cooldowns
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    if (this._heavyCooldown > 0)  this._heavyCooldown  -= delta;
    if (this._specialCooldown > 0) this._specialCooldown -= delta;

    // Sync label positions
    this.label.setPosition(this.x, this.y - 52);
    this.weaponLabel.setPosition(this.x, this.y);
    this._updateHitboxPosition();
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.weaponLabel.destroy();
    this.hitbox.destroy();
  }
}
```

- [ ] **Step 2: Verify no JS errors by opening browser console**

There are no visual tests for this file yet — it will be verified when FightScene uses it. Open `index.html` and check the console for import errors. Expected: no errors (Fighter.js is not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add game/entities/Fighter.js
git commit -m "feat: Fighter base class — movement, attack, block, damage, knockback"
```

---

### Task 5: Character Classes

**Files:**
- Create: `game/entities/characters/Rico.js`
- Create: `game/entities/characters/Razz.js`
- Create: `game/entities/characters/Munchy.js`
- Create: `game/entities/characters/Dex.js`

- [ ] **Step 1: Create `game/entities/characters/Rico.js`**

```js
// game/entities/characters/Rico.js
import { Fighter } from '../Fighter.js';

export class Rico extends Fighter {
  // Special: Shadow Slash — dash forward + blade combo (3 rapid hits)
  _doSpecial(opponent) {
    const dashX = this.facingRight
      ? Math.min(this.x + 180, 860)
      : Math.max(this.x - 180, 40);

    this.scene.tweens.add({
      targets: this.sprite,
      x: dashX,
      duration: 150,
      onComplete: () => {
        // Three quick hits
        [0, 100, 200].forEach(delay => {
          this.scene.time.delayedCall(delay, () => {
            if (this._inRange(opponent)) {
              opponent.takeDamage(8, this.playerIndex, false);
            }
          });
        });
      },
    });
  }
}
```

- [ ] **Step 2: Create `game/entities/characters/Razz.js`**

```js
// game/entities/characters/Razz.js
import { Fighter } from '../Fighter.js';

export class Razz extends Fighter {
  // Special: Rage Rush — 5 rapid jabs
  _doSpecial(opponent) {
    let hits = 0;
    const maxHits = 5;
    const interval = this.scene.time.addEvent({
      delay: 80,
      repeat: maxHits - 1,
      callback: () => {
        hits++;
        if (this._inRange(opponent)) {
          opponent.takeDamage(4, this.playerIndex, false);
        }
        // Tiny lunge forward each hit
        const dir = this.facingRight ? 1 : -1;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x + dir * 12, 40, 860);
        this.sprite.y = this.sprite.y; // keep Y
        if (hits === maxHits) interval.destroy();
      },
    });
  }
}
```

- [ ] **Step 3: Create `game/entities/characters/Munchy.js`**

```js
// game/entities/characters/Munchy.js
import { Fighter } from '../Fighter.js';

export class Munchy extends Fighter {
  constructor(scene, x, y, config, playerIndex, voiceSystem) {
    super(scene, x, y, config, playerIndex, voiceSystem);
    this._pizzaTimer = null;
    this._pizzaProjectiles = scene.physics.add.group();
  }

  startPizzaTimer() {
    this._schedulePizzaLine();
  }

  _schedulePizzaLine() {
    const { pizzaTimerMin, pizzaTimerMax } = {
      pizzaTimerMin: 8000,
      pizzaTimerMax: 15000,
    };
    const delay = Phaser.Math.Between(pizzaTimerMin, pizzaTimerMax);
    this._pizzaTimer = this.scene.time.delayedCall(delay, () => {
      this.voiceSystem.speak(this.config.voiceId, this.config.lines.random);
      this._schedulePizzaLine(); // schedule next one
    });
  }

  stopPizzaTimer() {
    if (this._pizzaTimer) this._pizzaTimer.destroy();
  }

  // Special: throw a pizza slice projectile
  _doSpecial(opponent) {
    const dir = this.facingRight ? 1 : -1;
    const pizza = this.scene.add.text(this.x, this.y - 20, '🍕', {
      fontSize: '28px',
    }).setOrigin(0.5);
    this.scene.physics.add.existing(pizza);
    pizza.body.setVelocityX(dir * 500);
    pizza.body.setAllowGravity(false);
    this._pizzaProjectiles.add(pizza);

    // Check overlap each frame for up to 1.5s
    const checkInterval = this.scene.time.addEvent({
      delay: 50,
      repeat: 30,
      callback: () => {
        if (!pizza.active) return;
        const dist = Math.abs(pizza.x - opponent.x);
        if (dist < 60 && Math.abs(pizza.y - opponent.y) < 50) {
          opponent.takeDamage(this.config.specialDamage, this.playerIndex, true);
          pizza.destroy();
          checkInterval.destroy();
        }
      },
    });

    // Auto-destroy after 1.5s
    this.scene.time.delayedCall(1500, () => {
      if (pizza.active) pizza.destroy();
    });
  }

  destroy() {
    this.stopPizzaTimer();
    this._pizzaProjectiles.destroy(true);
    super.destroy();
  }
}
```

- [ ] **Step 4: Create `game/entities/characters/Dex.js`**

```js
// game/entities/characters/Dex.js
import { Fighter } from '../Fighter.js';

export class Dex extends Fighter {
  // Special: Static Shock — staff slam that stuns
  _doSpecial(opponent) {
    // Ground slam visual
    const slam = this.scene.add.rectangle(this.x, this.y + 30, 120, 8, 0xa855f7);
    this.scene.tweens.add({
      targets: slam,
      scaleX: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => slam.destroy(),
    });

    if (this._inRange(opponent)) {
      opponent.takeDamage(this.config.specialDamage, this.playerIndex, false);
      opponent.stun(1200); // stun for 1.2 seconds
    }
  }
}
```

- [ ] **Step 5: Create a character factory in `game/entities/characters/index.js`**

```js
// game/entities/characters/index.js
import { Rico }   from './Rico.js';
import { Razz }   from './Razz.js';
import { Munchy } from './Munchy.js';
import { Dex }    from './Dex.js';

export const CHARACTER_CLASSES = { rico: Rico, razz: Razz, munchy: Munchy, dex: Dex };

/**
 * Create a fighter instance by character id.
 * @param {string} id  'rico' | 'razz' | 'munchy' | 'dex'
 */
export function createFighter(id, scene, x, y, config, playerIndex, voiceSystem) {
  const Cls = CHARACTER_CLASSES[id];
  if (!Cls) throw new Error(`Unknown character: ${id}`);
  return new Cls(scene, x, y, config, playerIndex, voiceSystem);
}
```

- [ ] **Step 6: Commit**

```bash
git add game/entities/characters/
git commit -m "feat: character classes — Rico, Razz, Munchy, Dex with unique specials"
```

---

### Task 6: TitleScene

**Files:**
- Create: `game/scenes/TitleScene.js`

- [ ] **Step 1: Create `game/scenes/TitleScene.js`**

```js
// game/scenes/TitleScene.js
import { BOOMER, VOICE_IDS, ELEVENLABS_API_KEY } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this._voiceSystem = new VoiceSystem(ELEVENLABS_API_KEY);

    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // City silhouette
    const city = this.add.graphics();
    city.fillStyle(0x050510);
    [[50,380,80,120],[150,360,60,140],[230,370,100,130],[360,340,70,160],[450,355,90,145],[560,365,80,135],[660,350,70,150],[750,370,100,130],[860,360,60,140]].forEach(([x,y,w,h]) => {
      city.fillRect(x, y, w, h);
    });

    // Moon
    this.add.circle(750, 80, 50, 0xfef9c3, 0.9);
    this.add.circle(770, 70, 45, 0x0a0a1a); // crescent shadow

    // Title
    this.add.text(this.scale.width / 2, 120, 'NINJA', {
      fontSize: '90px',
      fontFamily: 'Impact, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 210, 'RACCOONS', {
      fontSize: '90px',
      fontFamily: 'Impact, sans-serif',
      color: '#a78bfa',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Master Boomer (kangaroo emoji + border)
    const boomerBox = this.add.rectangle(this.scale.width / 2, 330, 200, 80, 0x1a1a2e);
    boomerBox.setStrokeStyle(2, 0x6366f1);
    this.add.text(this.scale.width / 2 - 60, 330, '🦘', { fontSize: '42px' }).setOrigin(0.5);

    // Random wisdom line
    const wisdom = Phaser.Utils.Array.GetRandom(BOOMER.wisdomLines);
    this.add.text(this.scale.width / 2 + 10, 323, `"${wisdom}"`, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d1d5db',
      wordWrap: { width: 200 },
      align: 'center',
    }).setOrigin(0.5);

    // Speak wisdom
    this._voiceSystem.speak(VOICE_IDS.boomer, wisdom);

    // Press any key prompt (blinking)
    const prompt = this.add.text(this.scale.width / 2, 440, 'PRESS ANY KEY TO START', {
      fontSize: '22px',
      fontFamily: 'Impact, sans-serif',
      color: '#facc15',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Any key → CharacterSelect
    this.input.keyboard.once('keydown', () => {
      this.scene.start('CharacterSelect');
    });
  }
}
```

- [ ] **Step 2: Open `index.html` — verify title screen renders**

Expected: dark background, city skyline, moon, "NINJA RACCOONS" title, kangaroo wisdom box, blinking "PRESS ANY KEY" prompt. Press any key — browser should show a blank screen (CharacterSelect not built yet).

- [ ] **Step 3: Commit**

```bash
git add game/scenes/TitleScene.js
git commit -m "feat: TitleScene — logo, Boomer wisdom, city backdrop, keypress to start"
```

---

### Task 7: CharacterSelectScene

**Files:**
- Create: `game/scenes/CharacterSelectScene.js`

- [ ] **Step 1: Create `game/scenes/CharacterSelectScene.js`**

```js
// game/scenes/CharacterSelectScene.js
import { CHARACTERS, CHARACTER_ORDER } from '../../config.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  create() {
    this._selections = { p1: null, p2: null };
    this._overlay = null;
    this._buildOverlay();
  }

  _buildOverlay() {
    // Inject HTML overlay over the canvas
    this._overlay = document.createElement('div');
    this._overlay.id = 'char-select-overlay';
    this._overlay.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:#0a0a1a;display:flex;flex-direction:column;
      align-items:center;justify-content:center;z-index:100;
      font-family:Impact,sans-serif;color:#fff;
    `;

    this._overlay.innerHTML = `
      <h1 style="font-size:42px;margin-bottom:4px;letter-spacing:4px;color:#a78bfa;">
        SELECT YOUR RACCOON
      </h1>
      <p style="color:#6b7280;margin-bottom:32px;font-size:14px;font-family:sans-serif;">
        Player 1: WASD + G/H/T &nbsp;|&nbsp; Player 2: Arrow Keys + L/;/'
      </p>
      <div style="display:flex;gap:60px;align-items:flex-start;">
        ${this._playerPanel(1)}
        ${this._playerPanel(2)}
      </div>
      <button id="fight-btn" style="
        margin-top:36px;padding:14px 60px;font-size:28px;
        font-family:Impact,sans-serif;letter-spacing:4px;
        background:#7c3aed;color:#fff;border:none;border-radius:8px;
        cursor:pointer;opacity:0.4;pointer-events:none;
        text-shadow:2px 2px 0 #000;
      ">FIGHT!</button>
    `;

    document.body.appendChild(this._overlay);

    // Wire up card clicks
    this._overlay.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', () => {
        const player = parseInt(card.dataset.player);
        const charId = card.dataset.char;
        this._selectCharacter(player, charId);
      });
    });

    document.getElementById('fight-btn').addEventListener('click', () => {
      this._startFight();
    });
  }

  _playerPanel(playerNum) {
    const playerLabel = `PLAYER ${playerNum}`;
    const cards = CHARACTER_ORDER.map(id => {
      const ch = CHARACTERS[id];
      return `
        <div class="char-card" data-player="${playerNum}" data-char="${id}"
          style="
            width:110px;padding:14px;border-radius:10px;
            border:3px solid #333;cursor:pointer;text-align:center;
            background:#111;transition:all 0.15s;
          "
          onmouseover="this.style.borderColor='${ch.cssColor}'"
          onmouseout="if(!this.classList.contains('selected-p${playerNum}'))this.style.borderColor='#333'"
        >
          <div style="font-size:36px;margin-bottom:6px;">🦝</div>
          <div style="font-size:16px;color:${ch.cssColor};letter-spacing:1px;">${ch.name.toUpperCase()}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;font-family:sans-serif;">${ch.specialName}</div>
        </div>
      `;
    }).join('');

    return `
      <div style="text-align:center;">
        <div style="font-size:20px;color:${playerNum === 1 ? '#3b82f6' : '#ef4444'};
          letter-spacing:3px;margin-bottom:16px;">
          ${playerLabel}
        </div>
        <div style="display:flex;gap:12px;">${cards}</div>
        <div id="p${playerNum}-confirm" style="margin-top:14px;font-size:14px;color:#4b5563;
          font-family:sans-serif;">— not selected —</div>
      </div>
    `;
  }

  _selectCharacter(playerNum, charId) {
    const key = playerNum === 1 ? 'p1' : 'p2';
    this._selections[key] = charId;

    const ch = CHARACTERS[charId];

    // Clear previous selection highlight for this player
    this._overlay.querySelectorAll(`.selected-p${playerNum}`).forEach(el => {
      el.classList.remove(`selected-p${playerNum}`);
      el.style.borderColor = '#333';
      el.style.background = '#111';
    });

    // Highlight new selection
    const card = this._overlay.querySelector(
      `.char-card[data-player="${playerNum}"][data-char="${charId}"]`
    );
    card.classList.add(`selected-p${playerNum}`);
    card.style.borderColor = ch.cssColor;
    card.style.background = '#1a1a2e';

    document.getElementById(`p${playerNum}-confirm`).textContent =
      `✓ ${ch.name}`;
    document.getElementById(`p${playerNum}-confirm`).style.color = ch.cssColor;

    // Enable fight button when both selected
    if (this._selections.p1 && this._selections.p2) {
      const btn = document.getElementById('fight-btn');
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  _startFight() {
    document.body.removeChild(this._overlay);
    this._overlay = null;
    this.scene.start('Fight', {
      p1CharId: this._selections.p1,
      p2CharId: this._selections.p2,
    });
  }

  shutdown() {
    if (this._overlay && document.body.contains(this._overlay)) {
      document.body.removeChild(this._overlay);
    }
  }
}
```

- [ ] **Step 2: Open `index.html`, press any key — verify character select screen**

Expected: Full-screen character select overlay with 4 character cards per player. Clicking a card highlights it and shows the character name. FIGHT! button activates once both players pick. Clicking FIGHT! transitions (blank screen — FightScene not built yet).

- [ ] **Step 3: Commit**

```bash
git add game/scenes/CharacterSelectScene.js
git commit -m "feat: CharacterSelectScene — HTML overlay, both player selection, FIGHT! trigger"
```

---

### Task 8: FightScene (HUD + fight loop)

**Files:**
- Create: `game/scenes/FightScene.js`

- [ ] **Step 1: Create `game/scenes/FightScene.js`**

```js
// game/scenes/FightScene.js
import { CHARACTERS, GAME, ELEVENLABS_API_KEY, SLICER } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';
import { createFighter } from '../entities/characters/index.js';
import { checkRoundEnd } from '../systems/CombatSystem.js';

export class FightScene extends Phaser.Scene {
  constructor() { super('Fight'); }

  init(data) {
    this._p1CharId = data.p1CharId;
    this._p2CharId = data.p2CharId;
  }

  create() {
    this._voice = new VoiceSystem(ELEVENLABS_API_KEY);
    this._roundWins = [0, 0];
    this._roundActive = false;
    this._timeLeft = GAME.roundTime;
    this._hud = null;

    this._buildBackground();
    this._buildGround();
    this._spawnFighters();
    this._buildHUD();
    this._buildKeys();
    this._listenHudEvents();
    this._startRound();
  }

  _buildBackground() {
    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 1);
    bg.fillRect(0, 0, GAME.width, GAME.height);

    // City buildings
    const city = this.add.graphics();
    city.fillStyle(0x0d0d1a);
    [[0,300,80,200],[90,280,60,220],[160,260,100,240],[270,275,90,225],[370,255,70,245],
     [450,270,80,230],[540,260,90,240],[640,250,70,250],[720,265,80,235],[810,255,90,245]
    ].forEach(([x,y,w,h]) => city.fillRect(x, y, w, h));

    // Neon signs
    [[120, 285, '#ff6b9d'], [300, 260, '#00d4ff'], [500, 265, '#ffbe0b']].forEach(([x, y, c]) => {
      this.add.rectangle(x, y, 30, 8, Phaser.Display.Color.HexStringToColor(c).color, 0.8);
    });

    // Stars
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Phaser.Math.Between(0, GAME.width),
        Phaser.Math.Between(0, 200),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1)
      );
    }
  }

  _buildGround() {
    // Ground platform
    const ground = this.add.rectangle(GAME.width / 2, GAME.groundY + 15, GAME.width, 30, 0x1e293b);
    this.physics.add.existing(ground, true);
    this._ground = ground;

    // Rooftop ledge line
    this.add.rectangle(GAME.width / 2, GAME.groundY, GAME.width, 4, 0x334155);
  }

  _spawnFighters() {
    const p1Config = CHARACTERS[this._p1CharId];
    const p2Config = CHARACTERS[this._p2CharId];

    this._p1 = createFighter(this._p1CharId, this, 180, GAME.groundY, p1Config, 0, this._voice);
    this._p2 = createFighter(this._p2CharId, this, GAME.width - 180, GAME.groundY, p2Config, 1, this._voice);

    // Make fighters land on ground
    this.physics.add.collider(this._p1.sprite, this._ground);
    this.physics.add.collider(this._p2.sprite, this._ground);

    // If Munchy is player, start pizza timer
    if (this._p1CharId === 'munchy') this._p1.startPizzaTimer?.();
    if (this._p2CharId === 'munchy') this._p2.startPizzaTimer?.();
  }

  _buildHUD() {
    this._hud = document.createElement('div');
    this._hud.id = 'hud';
    this._hud.innerHTML = `
      <div id="hud-top">
        <div class="player-hud p1">
          <span class="player-name" style="color:${CHARACTERS[this._p1CharId].cssColor}">
            ${CHARACTERS[this._p1CharId].name.toUpperCase()}
          </span>
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" id="p1-hp-fill" style="width:100%"></div>
          </div>
          <div class="special-bar-bg">
            <div class="special-bar-fill" id="p1-special-fill" style="width:0%"></div>
          </div>
          <span class="special-ready" id="p1-special-ready">⚡ SPECIAL READY</span>
        </div>

        <div id="timer-box">
          <div id="timer">60</div>
          <div id="round-display">
            <span class="round-pip ${this._roundWins[0] > 0 ? 'won' : ''}" id="p1-pip1"></span>
            <span class="round-pip ${this._roundWins[0] > 1 ? 'won' : ''}" id="p1-pip2"></span>
            &nbsp;VS&nbsp;
            <span class="round-pip ${this._roundWins[1] > 0 ? 'won' : ''}" id="p2-pip1"></span>
            <span class="round-pip ${this._roundWins[1] > 1 ? 'won' : ''}" id="p2-pip2"></span>
          </div>
        </div>

        <div class="player-hud p2">
          <span class="player-name" style="color:${CHARACTERS[this._p2CharId].cssColor}">
            ${CHARACTERS[this._p2CharId].name.toUpperCase()}
          </span>
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" id="p2-hp-fill" style="width:100%"></div>
          </div>
          <div class="special-bar-bg">
            <div class="special-bar-fill" id="p2-special-fill" style="width:0%"></div>
          </div>
          <span class="special-ready" id="p2-special-ready">⚡ SPECIAL READY</span>
        </div>
      </div>
      <div id="fight-flash"></div>
    `;
    document.body.appendChild(this._hud);
  }

  _buildKeys() {
    const kb = this.input.keyboard;
    this._keys = {
      p1: {
        left:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        up:      kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        light:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.G),
        heavy:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.H),
        special: kb.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      },
      p2: {
        left:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up:      kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        light:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
        heavy:   kb.addKey(219), // semicolon (;)
        special: kb.addKey(222), // apostrophe (')
      },
    };

    // One-shot attack keys (not held)
    ['light', 'heavy', 'special'].forEach(action => {
      this._keys.p1[action].on('down', () => {
        if (!this._roundActive) return;
        if (action === 'light')   this._p1.lightAttack(this._p2);
        if (action === 'heavy')   this._p1.heavyAttack(this._p2);
        if (action === 'special') this._p1.specialAttack(this._p2);
      });
      this._keys.p2[action].on('down', () => {
        if (!this._roundActive) return;
        if (action === 'light')   this._p2.lightAttack(this._p1);
        if (action === 'heavy')   this._p2.heavyAttack(this._p1);
        if (action === 'special') this._p2.specialAttack(this._p1);
      });
    });
  }

  _listenHudEvents() {
    this.events.on('hpChanged', (playerIndex, hp) => {
      const id = playerIndex === 0 ? 'p1' : 'p2';
      const fill = document.getElementById(`${id}-hp-fill`);
      if (!fill) return;
      fill.style.width = `${hp}%`;
      fill.className = 'hp-bar-fill' +
        (hp <= 20 ? ' danger' : hp <= 50 ? ' low' : '');
    });

    this.events.on('specialChanged', (playerIndex, meter) => {
      const id = playerIndex === 0 ? 'p1' : 'p2';
      const fill = document.getElementById(`${id}-special-fill`);
      const ready = document.getElementById(`${id}-special-ready`);
      if (!fill || !ready) return;
      fill.style.width = `${meter}%`;
      ready.classList.toggle('visible', meter >= 100);
    });
  }

  _startRound() {
    this._roundActive = false;
    this._timeLeft = GAME.roundTime;

    // Reset fighters
    this._p1.hp = 100;
    this._p1.specialMeter = 0;
    this._p1.sprite.x = 180;
    this._p1.sprite.y = GAME.groundY - 40;
    this._p2.hp = 100;
    this._p2.specialMeter = 0;
    this._p2.sprite.x = GAME.width - 180;
    this._p2.sprite.y = GAME.groundY - 40;

    // Reset HUD bars
    ['p1', 'p2'].forEach(id => {
      const fill = document.getElementById(`${id}-hp-fill`);
      if (fill) { fill.style.width = '100%'; fill.className = 'hp-bar-fill'; }
      const sp = document.getElementById(`${id}-special-fill`);
      if (sp) sp.style.width = '0%';
      const ready = document.getElementById(`${id}-special-ready`);
      if (ready) ready.classList.remove('visible');
    });

    // "FIGHT!" flash then start
    this._showFlash('FIGHT!', () => {
      this._roundActive = true;
      // Speak intros
      this._voice.speak(CHARACTERS[this._p1CharId].voiceId, CHARACTERS[this._p1CharId].lines.intro);
      this.time.delayedCall(800, () => {
        this._voice.speak(CHARACTERS[this._p2CharId].voiceId, CHARACTERS[this._p2CharId].lines.intro);
      });
      // Start timer
      this._timerEvent = this.time.addEvent({
        delay: 1000,
        repeat: GAME.roundTime - 1,
        callback: this._tickTimer,
        callbackScope: this,
      });
    });
  }

  _tickTimer() {
    this._timeLeft = Math.max(0, this._timeLeft - 1);
    const el = document.getElementById('timer');
    if (el) {
      el.textContent = this._timeLeft;
      el.style.color = this._timeLeft <= 10 ? '#ef4444' : '#fff';
    }
  }

  _showFlash(text, onDone) {
    const el = document.getElementById('fight-flash');
    if (!el) { onDone?.(); return; }
    el.textContent = text;
    el.classList.add('show');
    this.time.delayedCall(900, () => {
      el.classList.remove('show');
      this.time.delayedCall(200, () => onDone?.());
    });
  }

  _endRound(winnerIndex) {
    if (!this._roundActive) return;
    this._roundActive = false;
    if (this._timerEvent) this._timerEvent.destroy();
    this._p1.stopHorizontal?.();
    this._p2.stopHorizontal?.();

    this._roundWins[winnerIndex]++;
    this._updateRoundPips();

    const winner = winnerIndex === 0 ? this._p1 : this._p2;
    const winConfig = CHARACTERS[winnerIndex === 0 ? this._p1CharId : this._p2CharId];
    this._voice.speak(winConfig.voiceId, winConfig.lines.win);

    const label = winnerIndex === 0 ? 'P1 WINS ROUND' : 'P2 WINS ROUND';
    this._showFlash(label, () => {
      if (this._roundWins[winnerIndex] >= GAME.winsNeeded) {
        this._endMatch(winnerIndex);
      } else {
        this._startRound();
      }
    });
  }

  _endMatch(winnerIndex) {
    const p1Hp = this._p1.hp;
    const p2Hp = this._p2.hp;
    const closeMatch = Math.abs(p1Hp - p2Hp) < 20;

    this._removeHUD();
    this.scene.start('Win', {
      winnerIndex,
      p1CharId: this._p1CharId,
      p2CharId: this._p2CharId,
      closeMatch,
      roundWins: [...this._roundWins],
    });
  }

  _updateRoundPips() {
    [0, 1].forEach(pi => {
      const prefix = pi === 0 ? 'p1' : 'p2';
      const pip1 = document.getElementById(`${prefix}-pip1`);
      const pip2 = document.getElementById(`${prefix}-pip2`);
      if (pip1) pip1.classList.toggle('won', this._roundWins[pi] >= 1);
      if (pip2) pip2.classList.toggle('won', this._roundWins[pi] >= 2);
    });
  }

  _removeHUD() {
    if (this._hud && document.body.contains(this._hud)) {
      document.body.removeChild(this._hud);
      this._hud = null;
    }
  }

  update(time, delta) {
    if (!this._roundActive) return;

    const { p1, p2 } = this._keys;

    // P1 movement
    if (p1.left.isDown)       this._p1.moveLeft();
    else if (p1.right.isDown) this._p1.moveRight();
    else                      this._p1.stopHorizontal();

    if (Phaser.Input.Keyboard.JustDown(p1.up)) this._p1.jump();
    this._p1.setBlocking(p1.down.isDown);

    // P2 movement
    if (p2.left.isDown)       this._p2.moveLeft();
    else if (p2.right.isDown) this._p2.moveRight();
    else                      this._p2.stopHorizontal();

    if (Phaser.Input.Keyboard.JustDown(p2.up)) this._p2.jump();
    this._p2.setBlocking(p2.down.isDown);

    // Per-frame fighter updates
    this._p1.update(delta);
    this._p2.update(delta);

    // Check round end
    const roundWinner = checkRoundEnd(this._p1.hp, this._p2.hp, this._timeLeft);
    if (roundWinner !== null) {
      this._endRound(roundWinner);
    }
  }

  shutdown() {
    this._removeHUD();
    if (this._p1) { this._p1.stopPizzaTimer?.(); this._p1.destroy(); }
    if (this._p2) { this._p2.stopPizzaTimer?.(); this._p2.destroy(); }
  }
}
```

- [ ] **Step 2: Open `index.html`, select characters, click FIGHT! — verify fight screen**

Expected:
- City rooftop background
- Two colored rectangles (fighters) on the ground with character name labels
- HP bars at top, timer counting down from 60
- Player 1 moves with WASD, attacks with G/H/T
- Player 2 moves with arrow keys, attacks with L/;/'
- HP bars decrease when attacks land
- "FIGHT!" flash on round start
- Round win flash when a fighter reaches 0 HP

- [ ] **Step 3: Commit**

```bash
git add game/scenes/FightScene.js
git commit -m "feat: FightScene — fight loop, input, HUD, round system, round end detection"
```

---

### Task 9: WinScene

**Files:**
- Create: `game/scenes/WinScene.js`

- [ ] **Step 1: Create `game/scenes/WinScene.js`**

```js
// game/scenes/WinScene.js
import { CHARACTERS, SLICER, VOICE_IDS, ELEVENLABS_API_KEY } from '../../config.js';
import { VoiceSystem } from '../systems/VoiceSystem.js';

export class WinScene extends Phaser.Scene {
  constructor() { super('Win'); }

  init(data) {
    this._winnerIndex = data.winnerIndex;
    this._p1CharId    = data.p1CharId;
    this._p2CharId    = data.p2CharId;
    this._closeMatch  = data.closeMatch;
    this._roundWins   = data.roundWins;
  }

  create() {
    this._voice = new VoiceSystem(ELEVENLABS_API_KEY);

    const winnerCharId = this._winnerIndex === 0 ? this._p1CharId : this._p2CharId;
    const winnerConfig = CHARACTERS[winnerCharId];
    const playerLabel  = this._winnerIndex === 0 ? 'PLAYER 1' : 'PLAYER 2';

    // Dark background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Winner banner
    this.add.text(this.scale.width / 2, 80, `${playerLabel} WINS!`, {
      fontSize: '64px',
      fontFamily: 'Impact, sans-serif',
      color: winnerConfig.cssColor,
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Winner raccoon (big emoji + colored box)
    const winBox = this.add.rectangle(this.scale.width / 2, 200, 160, 160,
      Phaser.Display.Color.HexStringToColor(winnerConfig.cssColor).color, 0.15);
    winBox.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(winnerConfig.cssColor).color);

    this.add.text(this.scale.width / 2, 185, '🦝', { fontSize: '72px' }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 255, winnerConfig.name.toUpperCase(), {
      fontSize: '28px',
      fontFamily: 'Impact, sans-serif',
      color: winnerConfig.cssColor,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Victory pose bounce
    const raccoon = this.children.list.find(c => c.text === '🦝');
    if (raccoon) {
      this.tweens.add({
        targets: raccoon,
        y: raccoon.y - 20,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Round score
    this.add.text(this.scale.width / 2, 310,
      `${this._roundWins[0]} — ${this._roundWins[1]}`, {
      fontSize: '36px',
      fontFamily: 'Impact, sans-serif',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Slicer taunt (only on close match)
    if (this._closeMatch) {
      const taunt = Phaser.Utils.Array.GetRandom(SLICER.tauntLines);
      const slicerBox = this.add.rectangle(this.scale.width - 130, this.scale.height - 90,
        220, 70, 0x1a0000);
      slicerBox.setStrokeStyle(2, 0xef4444);

      this.add.text(this.scale.width - 200, this.scale.height - 100, '⚔️', {
        fontSize: '28px',
      });

      this.add.text(this.scale.width - 165, this.scale.height - 100, `"${taunt}"`, {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#fca5a5',
        wordWrap: { width: 170 },
      });

      this._voice.speak(VOICE_IDS.slicer, taunt);
      this.time.delayedCall(600, () => {
        this._voice.speak(winnerConfig.voiceId, winnerConfig.lines.win);
      });
    } else {
      this._voice.speak(winnerConfig.voiceId, winnerConfig.lines.win);
    }

    // Buttons
    const btnStyle = `
      padding:12px 32px;font-size:20px;font-family:Impact,sans-serif;
      letter-spacing:2px;border:none;border-radius:6px;cursor:pointer;
      text-shadow:1px 1px 0 #000;
    `;

    const overlay = document.createElement('div');
    overlay.id = 'win-overlay-btns';
    overlay.style.cssText = `
      position:fixed;bottom:40px;left:50%;transform:translateX(-50%);
      display:flex;gap:20px;z-index:50;
    `;
    overlay.innerHTML = `
      <button id="play-again-btn" style="${btnStyle}background:#7c3aed;color:#fff;">
        PLAY AGAIN
      </button>
      <button id="change-chars-btn" style="${btnStyle}background:#1e293b;color:#94a3b8;border:2px solid #334155;">
        CHANGE CHARACTERS
      </button>
    `;
    document.body.appendChild(overlay);

    document.getElementById('play-again-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.scene.start('Fight', {
        p1CharId: this._p1CharId,
        p2CharId: this._p2CharId,
      });
    });

    document.getElementById('change-chars-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
      this.scene.start('CharacterSelect');
    });
  }

  shutdown() {
    const overlay = document.getElementById('win-overlay-btns');
    if (overlay && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }
}
```

- [ ] **Step 2: Play a full match — verify win screen**

Fight until one player wins 2 rounds. Expected:
- "PLAYER 1 WINS!" or "PLAYER 2 WINS!" banner in winner's color
- Bouncing raccoon emoji
- Round score displayed (e.g., 2 — 1)
- Slicer taunt box visible if match was close (HP difference < 20)
- "PLAY AGAIN" restarts fight with same characters
- "CHANGE CHARACTERS" goes back to character select

- [ ] **Step 3: Commit**

```bash
git add game/scenes/WinScene.js
git commit -m "feat: WinScene — winner display, Slicer close-match taunt, play again / change chars"
```

---

### Task 10: Wire ElevenLabs API Key + Smoke Test

**Files:**
- Modify: `config.js` — add real API key + voice IDs

- [ ] **Step 1: Get voice IDs from ElevenLabs**

1. Go to [elevenlabs.io](https://elevenlabs.io) → sign in
2. Go to **Voices** → pick or create 6 voices (Rico, Razz, Munchy, Dex, Boomer, Slicer)
3. For each voice: click the voice → copy the **Voice ID** from the URL or info panel

- [ ] **Step 2: Update `config.js` with real values**

Replace the placeholder strings in `config.js`:
```js
export const ELEVENLABS_API_KEY = 'sk_...your_real_key...';

export const VOICE_IDS = {
  rico:   'actual_voice_id_for_rico',
  razz:   'actual_voice_id_for_razz',
  munchy: 'actual_voice_id_for_munchy',
  dex:    'actual_voice_id_for_dex',
  boomer: 'actual_voice_id_for_boomer',
  slicer: 'actual_voice_id_for_slicer',
};
```

**Note:** `config.js` is in `.gitignore` — it will never be committed.

- [ ] **Step 3: Full smoke test**

Play through the complete game flow:
1. Open `index.html` → hear Master Boomer wisdom line spoken aloud
2. Press any key → character select appears
3. P1 selects Rico (blue), P2 selects Razz (red) → click FIGHT!
4. Hear intro voice lines at round start
5. Fight — verify:
   - G/H/T attack for P1, L/;/' for P2
   - HP bars decrease on hit
   - Blocking (S / ↓) reduces damage
   - Special meter fills with damage dealt/received
   - T/` fires special when meter is full + voice line plays
   - Heavy attack causes knockback
6. Win 2 rounds → win screen appears with voice line
7. If match was close → Slicer taunt appears and speaks
8. Click "PLAY AGAIN" → returns to fight with same characters

- [ ] **Step 4: If Munchy is selected — verify pizza timer**

Pick Munchy as P1. During the fight, wait 8–15 seconds. Expected: "IT'S PIZZA TIME!" plays aloud. Wait another 8–15 seconds — it fires again.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Ninja Raccoons — all scenes, voice integration, full game loop"
```

---

## Self-Review Checklist

Verifying spec coverage:

| Spec requirement | Covered in |
|-----------------|-----------|
| 4 raccoon characters (Rico blue, Razz red, Munchy orange, Dex purple) | Task 2 config + Task 5 |
| Unique weapons + specials per character | Task 5 characters |
| Munchy random "pizza time" timer (8–15s) | Task 5 Munchy.js |
| Master Boomer on title screen with wisdom | Task 6 TitleScene |
| Slicer villain on close-match win screen | Task 9 WinScene |
| 2-player keyboard controls (WASD + arrows) | Task 8 FightScene |
| HP bars + special meter (HTML overlay) | Task 8 FightScene + ui/hud.css |
| 60-second round timer | Task 8 FightScene |
| Best of 3 rounds | Task 8 FightScene |
| Light (5dmg) + heavy (12dmg) + special (20-25dmg) attacks | Task 2 CombatSystem + config |
| Block reduces damage 70% | Task 2 CombatSystem |
| Knockback on heavy attacks | Task 2 CombatSystem + Fighter |
| ElevenLabs voice on match start | Task 8 FightScene._startRound |
| ElevenLabs voice on special move | Task 4 Fighter.specialAttack |
| ElevenLabs voice on heavy damage | Task 4 Fighter.takeDamage |
| ElevenLabs voice on round win | Task 8 FightScene._endRound |
| Slicer voice taunt | Task 9 WinScene |
| Audio blob caching | Task 3 VoiceSystem |
| API key in config.js (gitignored) | Task 1 |
| Character select (P1 + P2 panels) | Task 7 CharacterSelectScene |
| Same character selectable by both players | Task 7 (no restriction on same pick) |
| City rooftop background | Task 8 FightScene._buildBackground |
| Title screen | Task 6 TitleScene |
| Win/loss screen with play again + change chars | Task 9 WinScene |
