# Shootpoint Battle Royale – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully-featured browser-based top-down battle royale shooting game with bots, 6 weapon types, inventory, minimap, scorestreaks, mythic shop, weekly ranks, save/reload, and vibrant CoD4/GTA SA visual style.

**Architecture:** Express server (port 3000) serves a Phaser 3 SPA; all game state (coins, unlocks, rank) persists to localStorage; bot AI uses client-side state machines; ElevenLabs/OpenAI are optional server-side proxies keeping keys out of the browser.

**Tech Stack:** Node.js 18+, Express 4, Phaser 3.60 (CDN), HTML5 Canvas, localStorage, dotenv, ElevenLabs API, OpenAI API

---

## File Map

```
Shootpoint/
├── .env
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js                   # Phaser config + scene list
│       ├── data/
│       │   ├── weapons.js            # All weapon definitions (normal + mythic)
│       │   ├── soldiers.js           # 4 soldier types
│       │   └── mythicItems.js        # Shop listings
│       ├── systems/
│       │   ├── SaveSystem.js         # localStorage wrapper
│       │   ├── WeaponSystem.js       # Weapon fire, bullet pool, reload
│       │   ├── InventorySystem.js    # 4-slot inventory, pick up, switch
│       │   ├── BotManager.js         # Bot spawning + state-machine AI
│       │   ├── MinimapSystem.js      # RenderTexture minimap
│       │   ├── ScorestreakSystem.js  # Killstreak tracker + plane bomb
│       │   ├── ChestSystem.js        # Chest spawn + loot tables
│       │   ├── ZoneSystem.js         # Shrinking battle-royale zone
│       │   └── UISystem.js           # HUD: health, ammo, coins, streak
│       └── scenes/
│           ├── BootScene.js
│           ├── MainMenuScene.js
│           ├── CharacterSelectScene.js
│           ├── GameScene.js
│           ├── GameOverScene.js
│           ├── ShopScene.js
│           └── RanksScene.js
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `public/index.html`
- Create: `public/css/style.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "shootpoint",
  "version": "1.0.0",
  "description": "Top-down battle royale shooter",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create server.js**

```javascript
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy: OpenAI kill commentary
app.post('/api/commentary', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.json({ text: '' });
  try {
    const { default: fetch } = await import('node-fetch');
    const { killCount, weapon } = req.body;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a hype battle royale commentator. 1 short sentence, max 12 words.' },
          { role: 'user', content: `Player got ${killCount} kills with ${weapon}. React!` }
        ],
        max_tokens: 40
      })
    });
    const data = await resp.json();
    res.json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    res.json({ text: '' });
  }
});

// Proxy: ElevenLabs TTS
app.post('/api/voice', async (req, res) => {
  if (!process.env.ELEVENLABS_API_KEY) return res.status(404).end();
  try {
    const { default: fetch } = await import('node-fetch');
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    res.set('Content-Type', 'audio/mpeg');
    resp.body.pipe(res);
  } catch (e) {
    res.status(500).end();
  }
});

app.listen(PORT, () => console.log(`Shootpoint running → http://localhost:${PORT}`));
```

- [ ] **Step 4: Create public/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SHOOTPOINT</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div id="game-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="/js/data/weapons.js"></script>
  <script src="/js/data/soldiers.js"></script>
  <script src="/js/data/mythicItems.js"></script>
  <script src="/js/systems/SaveSystem.js"></script>
  <script src="/js/systems/WeaponSystem.js"></script>
  <script src="/js/systems/InventorySystem.js"></script>
  <script src="/js/systems/BotManager.js"></script>
  <script src="/js/systems/MinimapSystem.js"></script>
  <script src="/js/systems/ScorestreakSystem.js"></script>
  <script src="/js/systems/ChestSystem.js"></script>
  <script src="/js/systems/ZoneSystem.js"></script>
  <script src="/js/systems/UISystem.js"></script>
  <script src="/js/scenes/BootScene.js"></script>
  <script src="/js/scenes/MainMenuScene.js"></script>
  <script src="/js/scenes/CharacterSelectScene.js"></script>
  <script src="/js/scenes/GameScene.js"></script>
  <script src="/js/scenes/GameOverScene.js"></script>
  <script src="/js/scenes/ShopScene.js"></script>
  <script src="/js/scenes/RanksScene.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create public/css/style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #0d0d1a;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}
#game-container canvas { display: block; }
```

- [ ] **Step 6: Verify server starts**

Run: `node server.js`
Expected: `Shootpoint running → http://localhost:3000`

---

## Task 2: Game Data Files

**Files:**
- Create: `public/js/data/weapons.js`
- Create: `public/js/data/soldiers.js`
- Create: `public/js/data/mythicItems.js`

- [ ] **Step 1: Create weapons.js**

```javascript
// All weapon definitions (normal + mythic variants)
const WEAPONS = {
  assault: {
    id: 'assault', name: 'Assault Rifle', type: 'assault',
    damage: 25, fireRate: 180, bulletSpeed: 600, range: 700,
    magSize: 30, reloadTime: 2000, spread: 0.05,
    color: 0x44ff88, bulletColor: 0xffff44,
    description: 'Versatile, reliable firepower'
  },
  smg: {
    id: 'smg', name: 'SMG', type: 'smg',
    damage: 15, fireRate: 80, bulletSpeed: 550, range: 400,
    magSize: 45, reloadTime: 1500, spread: 0.12,
    color: 0x44aaff, bulletColor: 0x88ffff,
    description: 'Shred at close range'
  },
  sniper: {
    id: 'sniper', name: 'Sniper Rifle', type: 'sniper',
    damage: 95, fireRate: 1800, bulletSpeed: 1200, range: 2000,
    magSize: 5, reloadTime: 3000, spread: 0.0,
    color: 0xff8844, bulletColor: 0xff4400,
    description: 'One shot, one kill'
  },
  shotgun: {
    id: 'shotgun', name: 'Shotgun', type: 'shotgun',
    damage: 18, fireRate: 900, bulletSpeed: 450, range: 280,
    magSize: 8, reloadTime: 2500, spread: 0.3, pellets: 8,
    color: 0xff4488, bulletColor: 0xff88cc,
    description: 'Devastating up close'
  },
  marksman: {
    id: 'marksman', name: 'Marksman Pistol', type: 'marksman',
    damage: 40, fireRate: 400, bulletSpeed: 700, range: 600,
    magSize: 12, reloadTime: 1800, spread: 0.02,
    color: 0xffee44, bulletColor: 0xffaa00,
    description: 'Precision semi-auto'
  },
  flamethrower: {
    id: 'flamethrower', name: 'Flamethrower', type: 'flamethrower',
    damage: 8, fireRate: 60, bulletSpeed: 220, range: 200,
    magSize: 100, reloadTime: 3500, spread: 0.4, isFlame: true,
    color: 0xff6600, bulletColor: 0xff2200,
    description: 'Burn everything'
  }
};

// Mythic versions (enhanced stats, golden glow)
const MYTHIC_WEAPONS = {};
Object.keys(WEAPONS).forEach(key => {
  MYTHIC_WEAPONS[key + '_mythic'] = {
    ...WEAPONS[key],
    id: key + '_mythic',
    name: '✦ MYTHIC ' + WEAPONS[key].name,
    isMythic: true,
    damage: Math.floor(WEAPONS[key].damage * 1.5),
    fireRate: Math.floor(WEAPONS[key].fireRate * 0.75),
    magSize: Math.floor(WEAPONS[key].magSize * 1.5),
    color: 0xffd700,
    bulletColor: 0xffd700,
    glowColor: 0xffd700
  };
});

const ALL_WEAPONS = { ...WEAPONS, ...MYTHIC_WEAPONS };
```

- [ ] **Step 2: Create soldiers.js**

```javascript
const SOLDIERS = [
  {
    id: 'ghost',
    name: 'Ghost',
    color: 0x4488ff,
    accentColor: 0x88ccff,
    health: 100,
    speed: 220,
    description: 'Balanced all-rounder',
    ability: 'Sprint +20% for 3s'
  },
  {
    id: 'reaper',
    name: 'Reaper',
    color: 0xff4444,
    accentColor: 0xff8888,
    health: 80,
    speed: 260,
    description: 'Fast & aggressive',
    ability: 'Double dash'
  },
  {
    id: 'tank',
    name: 'Tank',
    color: 0x44ff88,
    accentColor: 0x88ffaa,
    health: 140,
    speed: 170,
    description: 'Heavy and durable',
    ability: 'Armor shield 3s'
  },
  {
    id: 'spectre',
    name: 'Spectre',
    color: 0xaa44ff,
    accentColor: 0xcc88ff,
    health: 90,
    speed: 240,
    description: 'Stealth operative',
    ability: 'Cloak 2s'
  }
];
```

- [ ] **Step 3: Create mythicItems.js**

```javascript
const MYTHIC_SHOP_ITEMS = [
  { id: 'assault_mythic',     name: '✦ MYTHIC Assault Rifle',   cost: 1000, weaponKey: 'assault',     color: 0xffd700 },
  { id: 'smg_mythic',         name: '✦ MYTHIC SMG',              cost: 1000, weaponKey: 'smg',         color: 0xffd700 },
  { id: 'sniper_mythic',      name: '✦ MYTHIC Sniper Rifle',     cost: 1000, weaponKey: 'sniper',      color: 0xffd700 },
  { id: 'shotgun_mythic',     name: '✦ MYTHIC Shotgun',          cost: 1000, weaponKey: 'shotgun',     color: 0xffd700 },
  { id: 'marksman_mythic',    name: '✦ MYTHIC Marksman Pistol',  cost: 1000, weaponKey: 'marksman',    color: 0xffd700 },
  { id: 'flamethrower_mythic',name: '✦ MYTHIC Flamethrower',     cost: 1000, weaponKey: 'flamethrower',color: 0xffd700 }
];
```

---

## Task 3: Save System

**Files:**
- Create: `public/js/systems/SaveSystem.js`

- [ ] **Step 1: Create SaveSystem.js**

```javascript
const SaveSystem = (() => {
  const KEY = 'shootpoint_save';

  function getWeekNumber() {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  }

  function defaultSave() {
    return {
      coins: 0,
      totalWins: 0,
      weeklyPoints: 0,
      weekNumber: getWeekNumber(),
      unlockedMythics: [],
      selectedSoldier: 'ghost',
      version: 1
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      const data = JSON.parse(raw);
      // Reset weekly rank if new week
      if (data.weekNumber !== getWeekNumber()) {
        data.weeklyPoints = 0;
        data.weekNumber = getWeekNumber();
        save(data);
      }
      return data;
    } catch (e) {
      return defaultSave();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  function addCoins(amount) {
    const data = load();
    data.coins += amount;
    save(data);
    return data.coins;
  }

  function addWin() {
    const data = load();
    data.totalWins += 1;
    data.weeklyPoints += 100;
    // Bonus 1000 points every 10 wins
    if (data.totalWins % 10 === 0) {
      data.coins += 1000;
      data.weeklyPoints += 1000;
    } else {
      data.coins += 100;
    }
    save(data);
    return data;
  }

  function unlockMythic(itemId) {
    const data = load();
    if (!data.unlockedMythics.includes(itemId)) {
      if (data.coins >= 1000) {
        data.coins -= 1000;
        data.unlockedMythics.push(itemId);
        save(data);
        return true;
      }
      return false;
    }
    return true; // already owned
  }

  function hasMythic(itemId) {
    return load().unlockedMythics.includes(itemId);
  }

  function setSelectedSoldier(soldierId) {
    const data = load();
    data.selectedSoldier = soldierId;
    save(data);
  }

  function getRankTier(points) {
    if (points >= 5000) return { name: 'DIAMOND', color: 0x00ffff, next: null };
    if (points >= 3000) return { name: 'PLATINUM', color: 0xe5e4e2, next: 5000 };
    if (points >= 1500) return { name: 'GOLD', color: 0xffd700, next: 3000 };
    if (points >= 500)  return { name: 'SILVER', color: 0xc0c0c0, next: 1500 };
    return { name: 'BRONZE', color: 0xcd7f32, next: 500 };
  }

  return { load, save, addCoins, addWin, unlockMythic, hasMythic, setSelectedSoldier, getRankTier };
})();
```

---

## Task 4: Boot Scene + Game Config

**Files:**
- Create: `public/js/scenes/BootScene.js`
- Create: `public/js/main.js`

- [ ] **Step 1: Create BootScene.js**

```javascript
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // Generate all textures programmatically (no external assets required)
    this.generateTextures();
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Player base (24x24)
    g.clear();
    g.fillStyle(0x4488ff, 1);
    g.fillRect(0, 0, 24, 24);
    g.fillStyle(0x88ccff, 1);
    g.fillRect(8, 8, 8, 8);
    g.generateTexture('player_ghost', 24, 24);

    g.clear();
    g.fillStyle(0xff4444, 1);
    g.fillRect(0, 0, 24, 24);
    g.fillStyle(0xff8888, 1);
    g.fillRect(8, 8, 8, 8);
    g.generateTexture('player_reaper', 24, 24);

    g.clear();
    g.fillStyle(0x44ff88, 1);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0x88ffaa, 1);
    g.fillRect(8, 8, 12, 12);
    g.generateTexture('player_tank', 28, 28);

    g.clear();
    g.fillStyle(0xaa44ff, 1);
    g.fillRect(0, 0, 22, 22);
    g.fillStyle(0xcc88ff, 1);
    g.fillRect(7, 7, 8, 8);
    g.generateTexture('player_spectre', 22, 22);

    // Bot (enemy) 24x24
    g.clear();
    g.fillStyle(0xff3333, 1);
    g.fillRect(0, 0, 24, 24);
    g.fillStyle(0xff6666, 1);
    g.fillRect(8, 8, 8, 8);
    g.generateTexture('bot', 24, 24);

    // Gun barrel indicator 12x4
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 12, 4);
    g.generateTexture('barrel', 12, 4);

    // Bullet 6x3
    g.clear();
    g.fillStyle(0xffff44, 1);
    g.fillRect(0, 0, 6, 3);
    g.generateTexture('bullet', 6, 3);

    // Flame particle 8x8
    g.clear();
    g.fillStyle(0xff4400, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('flame', 8, 8);

    // Chest 28x28
    g.clear();
    g.fillStyle(0x8B4513, 1);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0xffd700, 1);
    g.fillRect(2, 10, 24, 8);
    g.fillRect(10, 2, 8, 24);
    g.generateTexture('chest', 28, 28);

    // Weapon pickup 20x10
    g.clear();
    g.fillStyle(0x44ff88, 1);
    g.fillRect(0, 0, 20, 10);
    g.generateTexture('pickup', 20, 10);

    // Grenade 12x12
    g.clear();
    g.fillStyle(0x228822, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('grenade', 12, 12);

    // Smoke bomb 12x12
    g.clear();
    g.fillStyle(0x888888, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('smokebomb', 12, 12);

    // Explosion circle 80x80
    g.clear();
    g.fillStyle(0xff4400, 0.8);
    g.fillCircle(40, 40, 40);
    g.fillStyle(0xffaa00, 0.9);
    g.fillCircle(40, 40, 25);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(40, 40, 10);
    g.generateTexture('explosion', 80, 80);

    // Zone damage overlay (1x1 tint)
    g.clear();
    g.fillStyle(0xff0000, 0.4);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('zone_damage', 1, 1);

    g.destroy();
  }

  create() {
    this.scene.start('MainMenuScene');
  }
}
```

- [ ] **Step 2: Create main.js**

```javascript
const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0d0d1a',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [
    BootScene,
    MainMenuScene,
    CharacterSelectScene,
    GameScene,
    GameOverScene,
    ShopScene,
    RanksScene
  ]
};

const game = new Phaser.Game(config);
```

---

## Task 5: Main Menu Scene

**Files:**
- Create: `public/js/scenes/MainMenuScene.js`

- [ ] **Step 1: Create MainMenuScene.js**

```javascript
class MainMenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MainMenuScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();
    const rank = SaveSystem.getRankTier(save.weeklyPoints);

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2a, 0x0d0d2a, 0x1a0d3a, 0x1a0d3a, 1);
    bg.fillRect(0, 0, W, H);

    // Animated grid lines
    for (let x = 0; x < W; x += 60) {
      const line = this.add.graphics();
      line.lineStyle(1, 0x4444aa, 0.3);
      line.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y < H; y += 60) {
      const line = this.add.graphics();
      line.lineStyle(1, 0x4444aa, 0.3);
      line.lineBetween(0, y, W, y);
    }

    // Title
    this.add.text(W / 2, 100, 'SHOOTPOINT', {
      fontSize: '72px', fontFamily: 'Impact, Arial Black',
      color: '#ff4444', stroke: '#ff0000', strokeThickness: 6,
      shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.add.text(W / 2, 165, 'BATTLE ROYALE', {
      fontSize: '24px', fontFamily: 'Courier New',
      color: '#88ccff', letterSpacing: 12
    }).setOrigin(0.5);

    // Weekly rank card
    this.drawRankCard(W / 2, 240, rank, save.weeklyPoints);

    // Coin display
    this.add.text(W / 2, 300, `⬡ ${save.coins} COINS`, {
      fontSize: '20px', fontFamily: 'Courier New', color: '#ffd700'
    }).setOrigin(0.5);

    // Buttons
    this.makeButton(W / 2, 390, 'PLAY', 0xff4444, () => this.scene.start('CharacterSelectScene'));
    this.makeButton(W / 2, 460, 'SHOP', 0xffd700, () => this.scene.start('ShopScene'));
    this.makeButton(W / 2, 530, 'WEEKLY RANKS', 0x44aaff, () => this.scene.start('RanksScene'));

    // Version / tip
    this.add.text(W / 2, H - 20, 'WASD move  |  Mouse aim  |  LMB shoot  |  1-4 weapon  |  E pickup  |  R reload', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#666688'
    }).setOrigin(0.5);
  }

  drawRankCard(x, y, rank, points) {
    const card = this.add.graphics();
    card.fillStyle(0x1a1a3a, 1);
    card.fillRoundedRect(x - 150, y - 30, 300, 55, 8);
    card.lineStyle(2, rank.color, 1);
    card.strokeRoundedRect(x - 150, y - 30, 300, 55, 8);

    this.add.text(x, y - 10, `WEEKLY RANK: ${rank.name}`, {
      fontSize: '18px', fontFamily: 'Impact', color: Phaser.Display.Color.IntegerToColor(rank.color).rgba
    }).setOrigin(0.5);

    this.add.text(x, y + 10, `${points} pts this week`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#aaaacc'
    }).setOrigin(0.5);
  }

  makeButton(x, y, label, color, callback) {
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);

    const txt = this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: 'Impact', color: colorHex,
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.35);
      bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);
      txt.setScale(1.05);
    });
    txt.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.15);
      bg.fillRoundedRect(x - 140, y - 24, 280, 48, 8);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(x - 140, y - 24, 280, 48, 8);
      txt.setScale(1);
    });
    txt.on('pointerup', callback);
  }
}
```

---

## Task 6: Character Select Scene

**Files:**
- Create: `public/js/scenes/CharacterSelectScene.js`

- [ ] **Step 1: Create CharacterSelectScene.js**

```javascript
class CharacterSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'CharacterSelectScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();
    this.selectedIdx = SOLDIERS.findIndex(s => s.id === save.selectedSoldier) || 0;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, 50, 'SELECT SOLDIER', {
      fontSize: '48px', fontFamily: 'Impact', color: '#ff8844',
      stroke: '#ff4400', strokeThickness: 4
    }).setOrigin(0.5);

    this.cards = [];
    SOLDIERS.forEach((sol, i) => {
      const cx = 160 + i * 250;
      const cy = H / 2;
      this.drawSoldierCard(cx, cy, sol, i);
    });

    this.highlightSelected();

    // Play button
    this.makePlayButton(W / 2, H - 80);

    // Back button
    const back = this.add.text(60, H - 80, '← BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#888899'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('MainMenuScene'));
  }

  drawSoldierCard(cx, cy, sol, idx) {
    const card = this.add.graphics();
    const colorHex = '#' + sol.color.toString(16).padStart(6, '0');

    card.fillStyle(0x1a1a3a, 1);
    card.fillRoundedRect(cx - 95, cy - 130, 190, 260, 10);
    card.lineStyle(2, sol.color, 0.6);
    card.strokeRoundedRect(cx - 95, cy - 130, 190, 260, 10);

    // Soldier preview
    const preview = this.add.graphics();
    preview.fillStyle(sol.color, 1);
    preview.fillRect(cx - 24, cy - 90, 48, 48);
    preview.fillStyle(sol.accentColor, 1);
    preview.fillRect(cx - 12, cy - 78, 24, 24);

    this.add.text(cx, cy - 20, sol.name, {
      fontSize: '20px', fontFamily: 'Impact', color: colorHex
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, sol.description, {
      fontSize: '12px', fontFamily: 'Courier New', color: '#aaaacc',
      wordWrap: { width: 170 }, align: 'center'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 55, `HP: ${sol.health}`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#44ff88'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 72, `SPD: ${sol.speed}`, {
      fontSize: '13px', fontFamily: 'Courier New', color: '#44aaff'
    }).setOrigin(0.5);

    this.add.text(cx, cy + 89, sol.ability, {
      fontSize: '11px', fontFamily: 'Courier New', color: '#ffaa44',
      wordWrap: { width: 170 }, align: 'center'
    }).setOrigin(0.5);

    // Invisible hit area for click
    const hitZone = this.add.rectangle(cx, cy - 10, 190, 260, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerup', () => {
      this.selectedIdx = idx;
      this.highlightSelected();
    });

    this.cards.push({ card, cx, cy, sol });
  }

  highlightSelected() {
    this.cards.forEach(({ card, cx, cy, sol }, i) => {
      card.clear();
      const selected = i === this.selectedIdx;
      card.fillStyle(selected ? 0x2a2a5a : 0x1a1a3a, 1);
      card.fillRoundedRect(cx - 95, cy - 130, 190, 260, 10);
      card.lineStyle(selected ? 3 : 2, sol.color, selected ? 1 : 0.5);
      card.strokeRoundedRect(cx - 95, cy - 130, 190, 260, 10);
      if (selected) {
        card.lineStyle(1, sol.color, 0.3);
        card.strokeRoundedRect(cx - 99, cy - 134, 198, 268, 12);
      }
    });
  }

  makePlayButton(x, y) {
    const bg = this.add.graphics();
    bg.fillStyle(0xff4444, 0.2);
    bg.fillRoundedRect(x - 150, y - 28, 300, 56, 10);
    bg.lineStyle(3, 0xff4444, 1);
    bg.strokeRoundedRect(x - 150, y - 28, 300, 56, 10);

    const txt = this.add.text(x, y, 'DEPLOY', {
      fontSize: '28px', fontFamily: 'Impact', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setColor('#ff8888'));
    txt.on('pointerout', () => txt.setColor('#ff4444'));
    txt.on('pointerup', () => {
      const sol = SOLDIERS[this.selectedIdx];
      SaveSystem.setSelectedSoldier(sol.id);
      this.scene.start('GameScene', { soldier: sol });
    });
  }
}
```

---

## Task 7: Game Scene – Player, Map & Camera

**Files:**
- Create: `public/js/scenes/GameScene.js`

- [ ] **Step 1: Create GameScene.js (initial structure with player + map)**

```javascript
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.soldierData = data.soldier || SOLDIERS[0];
    this.save = SaveSystem.load();
  }

  create() {
    this.MAP_W = 4000;
    this.MAP_H = 4000;

    this.physics.world.setBounds(0, 0, this.MAP_W, this.MAP_H);
    this.cameras.main.setBounds(0, 0, this.MAP_W, this.MAP_H);

    this.drawMap();
    this.spawnPlayer();
    this.setupInput();

    // Systems (initialized in later tasks)
    this.weaponSystem = new WeaponSystem(this);
    this.inventorySystem = new InventorySystem(this);
    this.botManager = new BotManager(this);
    this.chestSystem = new ChestSystem(this);
    this.zoneSystem = new ZoneSystem(this);
    this.scorestreakSystem = new ScorestreakSystem(this);
    this.uiSystem = new UISystem(this);
    this.minimapSystem = new MinimapSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Game state
    this.playerHealth = this.soldierData.health;
    this.playerMaxHealth = this.soldierData.health;
    this.playerDead = false;
    this.kills = 0;
    this.gameStartTime = this.time.now;

    // Initial weapon (assault rifle, or mythic if owned)
    const startWeaponKey = this.save.unlockedMythics.includes('assault_mythic')
      ? 'assault_mythic' : 'assault';
    this.inventorySystem.addWeapon(ALL_WEAPONS[startWeaponKey]);
    this.inventorySystem.addWeapon(ALL_WEAPONS['marksman']);

    this.events.emit('ui-update');
  }

  drawMap() {
    const W = this.MAP_W, H = this.MAP_H;
    // Base ground
    const ground = this.add.graphics();
    ground.fillStyle(0x1a2a1a, 1);
    ground.fillRect(0, 0, W, H);

    // Road grid
    const roads = this.add.graphics();
    roads.fillStyle(0x2a2a2a, 1);
    for (let x = 0; x < W; x += 400) roads.fillRect(x, 0, 60, H);
    for (let y = 0; y < H; y += 400) roads.fillRect(0, y, W, 60);

    // Road markings
    roads.fillStyle(0x444422, 1);
    for (let x = 29; x < W; x += 400) {
      for (let y = 0; y < H; y += 80) roads.fillRect(x, y, 2, 40);
    }
    for (let y = 29; y < H; y += 400) {
      for (let x = 0; x < W; x += 80) roads.fillRect(x, y, 40, 2);
    }

    // Buildings (brown rectangles in city blocks)
    const buildings = this.add.graphics();
    buildings.fillStyle(0x3a2a1a, 1);
    this.buildingRects = [];
    for (let bx = 0; bx < W; bx += 400) {
      for (let by = 0; by < H; by += 400) {
        const insets = [[70,70,120,90],[200,70,110,100],[70,190,90,110],[210,200,100,90]];
        insets.forEach(([ox,oy,bw,bh]) => {
          buildings.fillRect(bx+ox, by+oy, bw, bh);
          this.buildingRects.push(new Phaser.Geom.Rectangle(bx+ox, by+oy, bw, bh));
        });
      }
    }

    // Forest patches (green circles)
    const forests = this.add.graphics();
    forests.fillStyle(0x1a4a1a, 1);
    const rng = new Phaser.Math.RandomDataGenerator(['shootpoint']);
    for (let i = 0; i < 60; i++) {
      const fx = rng.integerInRange(100, W - 100);
      const fy = rng.integerInRange(100, H - 100);
      const fr = rng.integerInRange(40, 100);
      forests.fillCircle(fx, fy, fr);
    }

    // Map border
    const border = this.add.graphics();
    border.lineStyle(6, 0xff4444, 1);
    border.strokeRect(0, 0, W, H);
  }

  spawnPlayer() {
    const sol = this.soldierData;
    const texKey = `player_${sol.id}`;
    const validTex = this.textures.exists(texKey) ? texKey : 'player_ghost';

    this.player = this.physics.add.sprite(
      this.MAP_W / 2, this.MAP_H / 2, validTex
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Barrel indicator
    this.barrel = this.add.sprite(0, 0, 'barrel').setDepth(11).setOrigin(0, 0.5);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      reload: Phaser.Input.Keyboard.KeyCodes.R,
      pickup: Phaser.Input.Keyboard.KeyCodes.E,
      w1: Phaser.Input.Keyboard.KeyCodes.ONE,
      w2: Phaser.Input.Keyboard.KeyCodes.TWO,
      w3: Phaser.Input.Keyboard.KeyCodes.THREE,
      w4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      ability: Phaser.Input.Keyboard.KeyCodes.Q,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    // Weapon slots via keys
    ['w1','w2','w3','w4'].forEach((k,i) => {
      this.keys[k].on('down', () => this.inventorySystem.selectSlot(i));
    });

    // Reload
    this.keys.reload.on('down', () => this.weaponSystem.reload());

    // Pickup
    this.keys.pickup.on('down', () => this.tryPickup());

    // ESC – pause / back to menu
    this.keys.esc.on('down', () => this.scene.start('MainMenuScene'));
  }

  tryPickup() {
    const px = this.player.x, py = this.player.y;
    this.chestSystem.tryOpen(px, py);
    this.weaponSystem.tryPickupDrop(px, py);
  }

  update(time, delta) {
    if (this.playerDead) return;
    this.movePlayer(delta);
    this.aimPlayer();
    this.handleFiring();
    this.weaponSystem.updateBullets(delta);
    this.botManager.update(time, delta);
    this.zoneSystem.update(delta);
    this.uiSystem.update();
    this.minimapSystem.update();
    this.scorestreakSystem.update(time, delta);
  }

  movePlayer(delta) {
    const sol = this.soldierData;
    const speed = sol.speed;
    const vx = (this.keys.left.isDown ? -1 : this.keys.right.isDown ? 1 : 0);
    const vy = (this.keys.up.isDown ? -1 : this.keys.down.isDown ? 1 : 0);
    const len = Math.sqrt(vx * vx + vy * vy);
    this.player.setVelocity(
      len > 0 ? (vx / len) * speed : 0,
      len > 0 ? (vy / len) * speed : 0
    );
  }

  aimPlayer() {
    const ptr = this.input.activePointer;
    const wx = this.cameras.main.scrollX + ptr.x;
    const wy = this.cameras.main.scrollY + ptr.y;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, wx, wy);
    this.player.setRotation(angle);
    // Position barrel at player center, pointing toward mouse
    this.barrel.setPosition(this.player.x, this.player.y);
    this.barrel.setRotation(angle);
  }

  handleFiring() {
    if (this.input.activePointer.isDown && !this.scorestreakSystem.bombSelectMode) {
      this.weaponSystem.tryFire(this.player.x, this.player.y, this.player.rotation);
    }
  }

  takeDamage(amount) {
    if (this.playerDead) return;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.cameras.main.shake(150, 0.012);
    this.uiSystem.flashDamage();
    if (this.playerHealth <= 0) this.playerDie();
  }

  playerDie() {
    this.playerDead = true;
    this.player.setTint(0x880000);
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        won: false,
        kills: this.kills,
        soldier: this.soldierData
      });
    });
  }

  onBotKilled(bot) {
    this.kills++;
    this.scorestreakSystem.onKill();
    this.weaponSystem.dropWeapon(bot.x, bot.y, bot.weapon);
    this.uiSystem.showKillFeed(`ELIMINATED BOT`);
    this.botManager.checkWinCondition();
  }

  playerWin() {
    const newSave = SaveSystem.addWin();
    this.scene.start('GameOverScene', {
      won: true,
      kills: this.kills,
      soldier: this.soldierData,
      coinsEarned: 100,
      totalCoins: newSave.coins
    });
  }
}
```

---

## Task 8: Weapon System

**Files:**
- Create: `public/js/systems/WeaponSystem.js`

- [ ] **Step 1: Create WeaponSystem.js**

```javascript
class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.physics.add.group({ maxSize: 200, runChildUpdate: false });
    this.botBullets = scene.physics.add.group({ maxSize: 300, runChildUpdate: false });
    this.drops = scene.physics.add.staticGroup();
    this.lastFired = 0;
    this.reloading = false;
    this.currentAmmo = 0;
    this.currentMaxAmmo = 0;

    // Overlap: player bullets hit bots
    scene.physics.add.overlap(
      this.bullets,
      null, // set later when bots are created
      this.onBulletHitBot.bind(this),
      null, scene
    );
  }

  setEnemyGroup(group) {
    this.scene.physics.add.overlap(
      this.bullets, group,
      this.onBulletHitBot.bind(this),
      null, this.scene
    );
    this.scene.physics.add.overlap(
      this.botBullets, this.scene.player,
      this.onBotBulletHitPlayer.bind(this),
      null, this.scene
    );
  }

  tryFire(x, y, angle) {
    const inv = this.scene.inventorySystem;
    const weapon = inv.getCurrentWeapon();
    if (!weapon) return;
    if (this.reloading) return;

    const now = this.scene.time.now;
    if (now - this.lastFired < weapon.fireRate) return;
    if (this.currentAmmo <= 0) { this.reload(); return; }

    this.lastFired = now;
    this.currentAmmo--;

    if (weapon.isFlame) {
      this.fireFlame(x, y, angle, weapon);
    } else if (weapon.pellets) {
      for (let p = 0; p < weapon.pellets; p++) {
        const spread = (Math.random() - 0.5) * weapon.spread;
        this.spawnBullet(x, y, angle + spread, weapon, this.bullets);
      }
    } else {
      const spread = (Math.random() - 0.5) * weapon.spread;
      this.spawnBullet(x, y, angle + spread, weapon, this.bullets);
    }

    this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
  }

  spawnBullet(x, y, angle, weapon, group) {
    const bx = x + Math.cos(angle) * 20;
    const by = y + Math.sin(angle) * 20;

    let b = group.get(bx, by, 'bullet');
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setTint(weapon.bulletColor);
    b.setRotation(angle);

    const speed = weapon.bulletSpeed;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.lifespan = (weapon.range / speed) * 1000;
    b.damage = weapon.damage;
    b.isFlame = false;
    b.setDepth(8);
    b.body.setSize(6, 3);
    return b;
  }

  fireFlame(x, y, angle, weapon) {
    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const a = angle + spread;
      const b = this.scene.add.sprite(
        x + Math.cos(a) * 15,
        y + Math.sin(a) * 15,
        'flame'
      );
      b.setTint(weapon.bulletColor);
      b.setAlpha(0.8);
      b.setDepth(8);
      b.setScale(0.5 + Math.random() * 0.5);

      this.scene.tweens.add({
        targets: b,
        x: b.x + Math.cos(a) * weapon.range,
        y: b.y + Math.sin(a) * weapon.range,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 400,
        onComplete: () => b.destroy()
      });

      // Damage check via overlap during tween
      this.scene.time.delayedCall(50 + i * 50, () => {
        this.scene.botManager.bots.getChildren().forEach(bot => {
          if (!bot.active) return;
          const d = Phaser.Math.Distance.Between(b.x, b.y, bot.x, bot.y);
          if (d < 50) {
            bot.takeDamage(weapon.damage);
          }
        });
      });
    }
  }

  fireBotBullet(x, y, angle, weapon) {
    const spread = (Math.random() - 0.5) * (weapon.spread + 0.1);
    const b = this.spawnBullet(x, y, angle + spread, weapon, this.botBullets);
    if (b) b.damage = weapon.damage * 0.7; // bots do 70% damage
  }

  updateBullets(delta) {
    const deactivate = (b) => {
      if (!b.active) return;
      b.lifespan -= delta;
      if (b.lifespan <= 0 || b.x < 0 || b.x > this.scene.MAP_W || b.y < 0 || b.y > this.scene.MAP_H) {
        b.setActive(false).setVisible(false);
        b.setVelocity(0, 0);
      }
    };
    this.bullets.getChildren().forEach(deactivate);
    this.botBullets.getChildren().forEach(deactivate);
  }

  onBulletHitBot(bullet, bot) {
    if (!bullet.active || !bot.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.setVelocity(0, 0);
    bot.takeDamage(bullet.damage);
  }

  onBotBulletHitPlayer(player, bullet) {
    if (!bullet.active) return;
    bullet.setActive(false).setVisible(false);
    bullet.setVelocity(0, 0);
    this.scene.takeDamage(bullet.damage);
  }

  reload() {
    if (this.reloading) return;
    const weapon = this.scene.inventorySystem.getCurrentWeapon();
    if (!weapon) return;
    if (this.currentAmmo === weapon.magSize) return;
    this.reloading = true;
    this.scene.uiSystem.showReloading(true);
    this.scene.time.delayedCall(weapon.reloadTime, () => {
      this.reloading = false;
      this.currentAmmo = weapon.magSize;
      this.currentMaxAmmo = weapon.magSize;
      this.scene.uiSystem.showReloading(false);
      this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
    });
  }

  onWeaponChanged(weapon) {
    this.reloading = false;
    this.currentAmmo = weapon.magSize;
    this.currentMaxAmmo = weapon.magSize;
    this.scene.uiSystem.updateAmmo(this.currentAmmo, this.currentMaxAmmo);
  }

  dropWeapon(x, y, weapon) {
    if (!weapon) return;
    const drop = this.drops.create(x + Phaser.Math.Between(-20,20), y + Phaser.Math.Between(-20,20), 'pickup');
    drop.setTint(weapon.color);
    drop.weaponData = weapon;
    drop.setDepth(3);

    // Pulsing effect
    this.scene.tweens.add({
      targets: drop,
      alpha: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 600
    });

    // Auto-remove after 30 seconds
    this.scene.time.delayedCall(30000, () => {
      if (drop.active) drop.destroy();
    });
  }

  tryPickupDrop(px, py) {
    this.drops.getChildren().forEach(drop => {
      if (!drop.active) return;
      const d = Phaser.Math.Distance.Between(px, py, drop.x, drop.y);
      if (d < 60) {
        const added = this.scene.inventorySystem.addWeapon(drop.weaponData);
        if (added) {
          drop.destroy();
          this.scene.uiSystem.showKillFeed(`PICKED UP ${drop.weaponData.name}`);
        }
      }
    });
  }
}
```

---

## Task 9: Inventory System

**Files:**
- Create: `public/js/systems/InventorySystem.js`

- [ ] **Step 1: Create InventorySystem.js**

```javascript
class InventorySystem {
  constructor(scene) {
    this.scene = scene;
    this.slots = [null, null, null, null];
    this.activeSlot = 0;
  }

  addWeapon(weaponDef) {
    // Find empty slot
    const empty = this.slots.findIndex(s => s === null);
    if (empty === -1) {
      // Replace active slot
      this.slots[this.activeSlot] = { ...weaponDef };
      this.scene.weaponSystem.onWeaponChanged(this.slots[this.activeSlot]);
      this.scene.uiSystem.updateInventory(this.slots, this.activeSlot);
      return true;
    }
    this.slots[empty] = { ...weaponDef };
    if (empty === this.activeSlot || this.slots[this.activeSlot] === null) {
      this.activeSlot = empty;
      this.scene.weaponSystem.onWeaponChanged(this.slots[this.activeSlot]);
    }
    this.scene.uiSystem.updateInventory(this.slots, this.activeSlot);
    return true;
  }

  selectSlot(idx) {
    if (idx < 0 || idx > 3) return;
    if (this.slots[idx] === null) return;
    this.activeSlot = idx;
    this.scene.weaponSystem.onWeaponChanged(this.slots[this.activeSlot]);
    this.scene.uiSystem.updateInventory(this.slots, this.activeSlot);
  }

  getCurrentWeapon() {
    return this.slots[this.activeSlot] || null;
  }

  clear() {
    this.slots = [null, null, null, null];
    this.activeSlot = 0;
  }
}
```

---

## Task 10: Bot Manager (AI)

**Files:**
- Create: `public/js/systems/BotManager.js`

- [ ] **Step 1: Create BotManager.js**

```javascript
class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = scene.physics.add.group();
    this.BOT_COUNT = 19; // 20-player lobby including human
    this.spawnBots();
    scene.weaponSystem.setEnemyGroup(this.bots);
  }

  spawnBots() {
    const MAP_W = this.scene.MAP_W, MAP_H = this.scene.MAP_H;
    const weaponKeys = Object.keys(WEAPONS);

    for (let i = 0; i < this.BOT_COUNT; i++) {
      let bx, by;
      do {
        bx = Phaser.Math.Between(100, MAP_W - 100);
        by = Phaser.Math.Between(100, MAP_H - 100);
      } while (Phaser.Math.Distance.Between(bx, by, MAP_W/2, MAP_H/2) < 400);

      const bot = this.bots.create(bx, by, 'bot');
      bot.setCollideWorldBounds(true);
      bot.setDepth(10);
      bot.health = Phaser.Math.Between(60, 100);
      bot.maxHealth = bot.health;
      bot.state = 'PATROL';
      bot.targetX = bx;
      bot.targetY = by;
      bot.lastShot = 0;
      bot.patrolTimer = 0;
      bot.stateTimer = 0;
      const wKey = weaponKeys[Phaser.Math.Between(0, weaponKeys.length - 1)];
      bot.weapon = { ...WEAPONS[wKey] };

      // Health bar
      bot.healthBar = this.scene.add.graphics().setDepth(12);
      bot.nameTag = this.scene.add.text(bx, by - 20, `BOT_${String(i+1).padStart(2,'0')}`, {
        fontSize: '10px', fontFamily: 'Courier New', color: '#ff8888'
      }).setOrigin(0.5).setDepth(12);

      bot.takeDamage = (dmg) => this.botTakeDamage(bot, dmg);
    }
  }

  botTakeDamage(bot, dmg) {
    if (!bot.active) return;
    bot.health -= dmg;
    bot.state = 'CHASE';
    bot.stateTimer = 0;
    if (bot.health <= 0) this.killBot(bot);
  }

  killBot(bot) {
    bot.setActive(false).setVisible(false);
    bot.healthBar.setVisible(false);
    bot.nameTag.setVisible(false);
    bot.body.enable = false;
    this.scene.onBotKilled(bot);
    this.checkWinCondition();
  }

  checkWinCondition() {
    const alive = this.bots.getChildren().filter(b => b.active).length;
    if (alive === 0) {
      this.scene.playerWin();
    }
  }

  update(time, delta) {
    const player = this.scene.player;
    const dt = delta / 1000;

    this.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      this.updateBotAI(bot, player, time, dt);
      this.drawBotHealthBar(bot);
      bot.nameTag.setPosition(bot.x, bot.y - 22);
    });
  }

  updateBotAI(bot, player, time, dt) {
    const distToPlayer = Phaser.Math.Distance.Between(bot.x, bot.y, player.x, player.y);
    bot.stateTimer += dt;

    // State transitions
    if (distToPlayer < 500 && this.scene.playerHealth > 0) {
      bot.state = distToPlayer < 250 ? 'ATTACK' : 'CHASE';
    } else if (bot.stateTimer > 4) {
      bot.state = 'PATROL';
      bot.stateTimer = 0;
      bot.targetX = bot.x + Phaser.Math.Between(-300, 300);
      bot.targetY = bot.y + Phaser.Math.Between(-300, 300);
      bot.targetX = Phaser.Math.Clamp(bot.targetX, 50, this.scene.MAP_W - 50);
      bot.targetY = Phaser.Math.Clamp(bot.targetY, 50, this.scene.MAP_H - 50);
    }

    const SPEED = 120;

    if (bot.state === 'PATROL') {
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, bot.targetX, bot.targetY);
      const d = Phaser.Math.Distance.Between(bot.x, bot.y, bot.targetX, bot.targetY);
      if (d > 20) {
        bot.setVelocity(Math.cos(angle) * SPEED, Math.sin(angle) * SPEED);
      } else {
        bot.setVelocity(0, 0);
      }
    } else if (bot.state === 'CHASE') {
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, player.x, player.y);
      bot.setVelocity(Math.cos(angle) * SPEED * 1.2, Math.sin(angle) * SPEED * 1.2);
      bot.setRotation(angle);
    } else if (bot.state === 'ATTACK') {
      bot.setVelocity(0, 0);
      const angle = Phaser.Math.Angle.Between(bot.x, bot.y, player.x, player.y);
      bot.setRotation(angle);

      if (!this.scene.playerDead && time - bot.lastShot > bot.weapon.fireRate * 1.5) {
        bot.lastShot = time;
        this.scene.weaponSystem.fireBotBullet(bot.x, bot.y, angle, bot.weapon);
      }
    }

    // Zone damage
    if (this.scene.zoneSystem.isOutside(bot.x, bot.y)) {
      bot.health -= 3 * dt;
      if (bot.health <= 0) this.killBot(bot);
    }
  }

  drawBotHealthBar(bot) {
    const bw = 30, bh = 4;
    const bx = bot.x - bw / 2, by = bot.y - 18;
    const pct = bot.health / bot.maxHealth;
    bot.healthBar.clear();
    bot.healthBar.fillStyle(0x440000, 1);
    bot.healthBar.fillRect(bx, by, bw, bh);
    bot.healthBar.fillStyle(pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222, 1);
    bot.healthBar.fillRect(bx, by, bw * pct, bh);
  }
}
```

---

## Task 11: UI System (HUD)

**Files:**
- Create: `public/js/systems/UISystem.js`

- [ ] **Step 1: Create UISystem.js**

```javascript
class UISystem {
  constructor(scene) {
    this.scene = scene;
    this.uiCamera = scene.cameras.add(0, 0, 1280, 720).setScroll(0, 0).setName('ui');
    this.uiCamera.ignore(scene.children.list); // ignore world objects

    this.uiLayer = scene.add.container(0, 0).setDepth(100);
    this.uiCamera.ignore([]); // will be rebuilt

    this.createHUD();
    this.killMessages = [];
  }

  createHUD() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;

    // Health bar background
    this.healthBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthBg.fillStyle(0x000000, 0.7);
    this.healthBg.fillRoundedRect(20, H - 60, 220, 36, 6);

    this.healthBar = scene.add.graphics().setScrollFactor(0).setDepth(101);

    this.healthText = scene.add.text(30, H - 45, 'HP 100', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#44ff88'
    }).setScrollFactor(0).setDepth(102);

    // Ammo display
    this.ammoBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.ammoBg.fillStyle(0x000000, 0.7);
    this.ammoBg.fillRoundedRect(W - 180, H - 60, 160, 36, 6);

    this.ammoText = scene.add.text(W - 100, H - 44, '30/30', {
      fontSize: '20px', fontFamily: 'Impact', color: '#ffee44', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    this.reloadText = scene.add.text(W - 100, H - 90, 'RELOADING...', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#ff8844'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5).setVisible(false);

    // Weapon name
    this.weaponText = scene.add.text(W - 100, H - 108, '', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#aaaacc', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    // Inventory slots
    this.slotGraphics = [];
    this.slotTexts = [];
    for (let i = 0; i < 4; i++) {
      const sx = W - 360 + i * 82, sy = H - 60;
      const sg = scene.add.graphics().setScrollFactor(0).setDepth(100);
      sg.fillStyle(0x000000, 0.7);
      sg.fillRoundedRect(sx - 4, sy - 2, 74, 38, 5);
      this.slotGraphics.push(sg);

      const st = scene.add.text(sx + 33, sy + 17, `${i+1}: -`, {
        fontSize: '11px', fontFamily: 'Courier New', color: '#666688', align: 'center'
      }).setScrollFactor(0).setDepth(102).setOrigin(0.5);
      this.slotTexts.push(st);
    }

    // Kill feed area
    this.killFeedTexts = [];
    for (let i = 0; i < 4; i++) {
      const kt = scene.add.text(W - 20, 20 + i * 22, '', {
        fontSize: '13px', fontFamily: 'Courier New', color: '#ff8844', align: 'right'
      }).setScrollFactor(0).setDepth(102).setOrigin(1, 0);
      this.killFeedTexts.push(kt);
    }

    // Kills counter
    this.killsText = scene.add.text(20, 20, 'KILLS: 0', {
      fontSize: '18px', fontFamily: 'Impact', color: '#ff4444'
    }).setScrollFactor(0).setDepth(102);

    // Streak indicator
    this.streakText = scene.add.text(20, 46, '', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#ffaa00'
    }).setScrollFactor(0).setDepth(102);

    // Coins
    this.coinsText = scene.add.text(20, 68, '⬡ 0', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#ffd700'
    }).setScrollFactor(0).setDepth(102);

    // Alive counter
    this.aliveText = scene.add.text(W / 2, 20, '20 ALIVE', {
      fontSize: '16px', fontFamily: 'Impact', color: '#ffffff', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5, 0);

    // Damage flash overlay
    this.damageFlash = scene.add.graphics().setScrollFactor(0).setDepth(99);

    // Zone warning
    this.zoneText = scene.add.text(W / 2, H - 100, '', {
      fontSize: '16px', fontFamily: 'Impact', color: '#ff4444', align: 'center'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5);

    // Collect all scrollFactor(0) elements for uiCamera
    scene.cameras.main.ignore([
      this.healthBg, this.healthBar, this.healthText,
      this.ammoBg, this.ammoText, this.reloadText, this.weaponText,
      this.killsText, this.streakText, this.coinsText, this.aliveText,
      this.damageFlash, this.zoneText, ...this.slotGraphics, ...this.slotTexts,
      ...this.killFeedTexts
    ]);
  }

  update() {
    const scene = this.scene;
    const H = scene.scale.height;
    const pct = scene.playerHealth / scene.playerMaxHealth;

    // Redraw health bar
    this.healthBar.clear();
    this.healthBar.fillStyle(pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xff2222, 1);
    this.healthBar.fillRoundedRect(22, H - 58, 196 * pct, 32, 5);
    this.healthText.setText(`HP ${Math.ceil(scene.playerHealth)}`);

    // Kills
    this.killsText.setText(`KILLS: ${scene.kills}`);
    this.coinsText.setText(`⬡ ${SaveSystem.load().coins}`);

    // Alive count
    const alive = scene.botManager.bots.getChildren().filter(b => b.active).length + 1;
    this.aliveText.setText(`${alive} ALIVE`);

    // Streak
    const streak = scene.scorestreakSystem.currentStreak;
    this.streakText.setText(streak > 0 ? `STREAK: ${streak}` : '');
  }

  updateAmmo(current, max) {
    this.ammoText.setText(`${current}/${max}`);
    const weapon = this.scene.inventorySystem.getCurrentWeapon();
    if (weapon) this.weaponText.setText(weapon.name);
  }

  updateInventory(slots, activeSlot) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    slots.forEach((weapon, i) => {
      const sx = W - 360 + i * 82, sy = H - 60;
      this.slotGraphics[i].clear();
      const isActive = i === activeSlot;
      this.slotGraphics[i].fillStyle(isActive ? 0x1a1a4a : 0x000000, isActive ? 0.9 : 0.7);
      this.slotGraphics[i].fillRoundedRect(sx - 4, sy - 2, 74, 38, 5);
      this.slotGraphics[i].lineStyle(isActive ? 2 : 1, isActive ? 0x4488ff : 0x444444, 1);
      this.slotGraphics[i].strokeRoundedRect(sx - 4, sy - 2, 74, 38, 5);

      if (weapon) {
        const colorHex = '#' + weapon.color.toString(16).padStart(6, '0');
        this.slotTexts[i].setText(`${i+1}:${weapon.name.substring(0,6)}`).setColor(colorHex);
      } else {
        this.slotTexts[i].setText(`${i+1}: -`).setColor('#444466');
      }
    });
  }

  showReloading(show) {
    this.reloadText.setVisible(show);
  }

  showKillFeed(msg) {
    // Shift messages up
    for (let i = this.killFeedTexts.length - 1; i > 0; i--) {
      this.killFeedTexts[i].setText(this.killFeedTexts[i-1].text);
      this.killFeedTexts[i].setAlpha(this.killFeedTexts[i-1].alpha * 0.7);
    }
    this.killFeedTexts[0].setText(msg).setAlpha(1);
    this.scene.time.delayedCall(3000, () => {
      this.killFeedTexts[0].setAlpha(0);
    });
  }

  flashDamage() {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    this.damageFlash.clear();
    this.damageFlash.fillStyle(0xff0000, 0.35);
    this.damageFlash.fillRect(0, 0, W, H);
    this.scene.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 300,
      onComplete: () => this.damageFlash.clear()
    });
  }

  showZoneWarning(show) {
    this.zoneText.setText(show ? '⚠ OUTSIDE ZONE — TAKE DAMAGE' : '');
  }

  showBombMode(active) {
    const W = this.scene.scale.width;
    if (active) {
      if (!this.bombModeText) {
        this.bombModeText = this.scene.add.text(W/2, 60, '💥 PLANE BOMB READY — CLICK MAP TO DROP', {
          fontSize: '20px', fontFamily: 'Impact', color: '#ff4444',
          stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(110).setOrigin(0.5);
        this.scene.cameras.main.ignore([this.bombModeText]);
      }
      this.bombModeText.setVisible(true);
    } else if (this.bombModeText) {
      this.bombModeText.setVisible(false);
    }
  }
}
```

---

## Task 12: Minimap System

**Files:**
- Create: `public/js/systems/MinimapSystem.js`

- [ ] **Step 1: Create MinimapSystem.js**

```javascript
class MinimapSystem {
  constructor(scene) {
    this.scene = scene;
    this.SIZE = 160;
    this.SCALE = this.SIZE / scene.MAP_W;
    const W = scene.scale.width, H = scene.scale.height;
    const mx = W - this.SIZE - 15, my = H - this.SIZE - 75;

    // Background
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(103);
    this.bg.fillStyle(0x000000, 0.75);
    this.bg.fillRoundedRect(mx - 4, my - 4, this.SIZE + 8, this.SIZE + 8, 6);
    this.bg.lineStyle(2, 0x4488ff, 0.7);
    this.bg.strokeRoundedRect(mx - 4, my - 4, this.SIZE + 8, this.SIZE + 8, 6);

    this.dots = scene.add.graphics().setScrollFactor(0).setDepth(104);
    this.mx = mx;
    this.my = my;

    // Label
    scene.add.text(mx + this.SIZE / 2, my - 14, 'MAP', {
      fontSize: '11px', fontFamily: 'Courier New', color: '#4488ff'
    }).setScrollFactor(0).setDepth(104).setOrigin(0.5);

    // Ignore in main camera
    scene.cameras.main.ignore([this.bg, this.dots]);
  }

  worldToMini(wx, wy) {
    return {
      x: this.mx + wx * this.SCALE,
      y: this.my + wy * this.SCALE
    };
  }

  update() {
    const scene = this.scene;
    this.dots.clear();

    // Zone circle
    const zone = scene.zoneSystem;
    const zc = this.worldToMini(zone.cx, zone.cy);
    const zr = zone.radius * this.SCALE;
    this.dots.lineStyle(1, 0x4488ff, 0.8);
    this.dots.strokeCircle(zc.x, zc.y, zr);

    // Chests (yellow)
    scene.chestSystem.chests.getChildren().forEach(chest => {
      if (!chest.active || chest.opened) return;
      const p = this.worldToMini(chest.x, chest.y);
      this.dots.fillStyle(0xffd700, 1);
      this.dots.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    });

    // Bots (red)
    scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const p = this.worldToMini(bot.x, bot.y);
      this.dots.fillStyle(0xff3333, 1);
      this.dots.fillCircle(p.x, p.y, 2);
    });

    // Player (bright blue)
    const pp = this.worldToMini(scene.player.x, scene.player.y);
    this.dots.fillStyle(0x44aaff, 1);
    this.dots.fillCircle(pp.x, pp.y, 3.5);
    // Direction indicator
    const angle = scene.player.rotation;
    this.dots.lineStyle(1.5, 0xffffff, 1);
    this.dots.lineBetween(pp.x, pp.y, pp.x + Math.cos(angle) * 7, pp.y + Math.sin(angle) * 7);
  }
}
```

---

## Task 13: Scorestreak System (Plane Bomb)

**Files:**
- Create: `public/js/systems/ScorestreakSystem.js`

- [ ] **Step 1: Create ScorestreakSystem.js**

```javascript
class ScorestreakSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentStreak = 0;
    this.bombsAvailable = 0;
    this.bombSelectMode = false;
    this.planeCooldown = false;
  }

  onKill() {
    this.currentStreak++;
    if (this.currentStreak >= 5) {
      this.currentStreak = 0;
      this.bombsAvailable++;
      this.scene.uiSystem.showKillFeed('🔥 5 KILL STREAK! PLANE BOMB READY!');
      this.scene.uiSystem.showBombMode(true);
      this.enterBombSelectMode();
    }
  }

  onDeath() {
    this.currentStreak = 0;
  }

  enterBombSelectMode() {
    this.bombSelectMode = true;
    this.scene.input.once('pointerup', (pointer) => {
      if (!this.bombSelectMode) return;
      const wx = this.scene.cameras.main.scrollX + pointer.x;
      const wy = this.scene.cameras.main.scrollY + pointer.y;
      this.dropBomb(wx, wy);
    });
  }

  dropBomb(wx, wy) {
    this.bombSelectMode = false;
    this.bombsAvailable = Math.max(0, this.bombsAvailable - 1);
    this.scene.uiSystem.showBombMode(false);

    // Show targeting reticle
    const reticle = this.scene.add.graphics().setDepth(50);
    reticle.lineStyle(3, 0xff4444, 1);
    reticle.strokeCircle(wx, wy, 80);
    reticle.lineStyle(2, 0xff4444, 0.5);
    reticle.lineBetween(wx - 100, wy, wx + 100, wy);
    reticle.lineBetween(wx, wy - 100, wx, wy + 100);

    // Plane flies across
    const plane = this.scene.add.graphics().setDepth(50);
    plane.fillStyle(0xaaaaaa, 1);
    plane.fillTriangle(-20, 0, 20, 0, 0, -12);
    plane.x = -50;
    plane.y = wy - 80;

    this.scene.tweens.add({
      targets: plane,
      x: this.scene.MAP_W + 100,
      duration: 2000,
      onComplete: () => {
        plane.destroy();
        reticle.destroy();
        this.explodeBomb(wx, wy);
      }
    });

    // Blink reticle
    this.scene.tweens.add({
      targets: reticle,
      alpha: 0.3,
      yoyo: true,
      repeat: 6,
      duration: 280
    });
  }

  explodeBomb(cx, cy) {
    const RADIUS = 150;

    // Visual explosion
    const expl = this.scene.add.sprite(cx, cy, 'explosion').setDepth(51).setScale(0.5);
    this.scene.tweens.add({
      targets: expl,
      scaleX: 4, scaleY: 4,
      alpha: 0,
      duration: 800,
      onComplete: () => expl.destroy()
    });

    // Camera shake
    this.scene.cameras.main.shake(500, 0.03);

    // Damage all bots in radius
    this.scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const d = Phaser.Math.Distance.Between(cx, cy, bot.x, bot.y);
      if (d < RADIUS) {
        const dmg = 200 * (1 - d / RADIUS);
        bot.takeDamage(dmg);
      }
    });

    // Damage player if in blast
    const dp = Phaser.Math.Distance.Between(cx, cy, this.scene.player.x, this.scene.player.y);
    if (dp < RADIUS) {
      this.scene.takeDamage(60 * (1 - dp / RADIUS));
    }

    // Fetch optional commentary
    this.scene.fetchCommentary(this.scene.kills, 'plane bomb');
  }

  update(time, delta) {}
}
```

---

## Task 14: Chest System

**Files:**
- Create: `public/js/systems/ChestSystem.js`

- [ ] **Step 1: Create ChestSystem.js**

```javascript
class ChestSystem {
  constructor(scene) {
    this.scene = scene;
    this.chests = scene.physics.add.staticGroup();
    this.spawnChests(25);
  }

  spawnChests(count) {
    for (let i = 0; i < count; i++) {
      let cx, cy;
      do {
        cx = Phaser.Math.Between(80, this.scene.MAP_W - 80);
        cy = Phaser.Math.Between(80, this.scene.MAP_H - 80);
      } while (Phaser.Math.Distance.Between(cx, cy, this.scene.MAP_W/2, this.scene.MAP_H/2) < 200);

      const chest = this.chests.create(cx, cy, 'chest');
      chest.setDepth(5);
      chest.opened = false;

      // Glow pulse
      this.scene.tweens.add({
        targets: chest,
        tint: 0xffffff,
        duration: 800,
        yoyo: true,
        repeat: -1,
        onYoyo: () => chest.setTint(0xffd700),
        onRepeat: () => chest.setTint(0xffffff)
      });
    }
  }

  tryOpen(px, py) {
    this.chests.getChildren().forEach(chest => {
      if (!chest.active || chest.opened) return;
      const d = Phaser.Math.Distance.Between(px, py, chest.x, chest.y);
      if (d < 60) {
        this.openChest(chest);
      }
    });
  }

  openChest(chest) {
    chest.opened = true;
    chest.setTint(0x888888);

    const loot = this.rollLoot();
    loot.forEach((item, i) => {
      this.scene.time.delayedCall(i * 150, () => {
        this.spawnLootItem(chest.x + Phaser.Math.Between(-40, 40), chest.y + Phaser.Math.Between(-40, 40), item);
      });
    });

    // Open animation
    this.scene.tweens.add({
      targets: chest,
      scaleY: 0.1,
      alpha: 0.3,
      duration: 300
    });

    this.scene.uiSystem.showKillFeed('CHEST OPENED!');
  }

  rollLoot() {
    const items = [];
    const roll = Math.random();
    const weaponKeys = Object.keys(WEAPONS);

    if (roll < 0.5) {
      // Weapon
      const wKey = weaponKeys[Phaser.Math.Between(0, weaponKeys.length - 1)];
      items.push({ type: 'weapon', weapon: WEAPONS[wKey] });
    }
    if (roll < 0.7) items.push({ type: 'grenade' });
    if (roll < 0.3) items.push({ type: 'smokebomb' });
    if (Math.random() < 0.15) items.push({ type: 'special' });

    return items;
  }

  spawnLootItem(x, y, item) {
    let sprite;
    if (item.type === 'weapon') {
      sprite = this.scene.add.sprite(x, y, 'pickup').setTint(item.weapon.color).setDepth(6);
      sprite.weaponData = item.weapon;
    } else if (item.type === 'grenade') {
      sprite = this.scene.add.sprite(x, y, 'grenade').setDepth(6);
      sprite.itemType = 'grenade';
    } else if (item.type === 'smokebomb') {
      sprite = this.scene.add.sprite(x, y, 'smokebomb').setDepth(6);
      sprite.itemType = 'smokebomb';
    } else {
      // Special ability power-up (health pack)
      sprite = this.scene.add.sprite(x, y, 'explosion').setScale(0.3).setTint(0x44ff88).setDepth(6);
      sprite.itemType = 'healthpack';
    }

    // Bounce in
    this.scene.tweens.add({
      targets: sprite,
      y: y - 20,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut'
    });

    // Register as pickup
    this.scene.physics.add.existing(sprite, true);
    this.scene.weaponSystem.drops.add(sprite);
    if (sprite.weaponData) {
      // Already handled by WeaponSystem.tryPickupDrop
    } else {
      // Handle grenade/smoke/health via proximity E key
      sprite.on('pickup', () => {
        if (item.type === 'grenade') {
          this.useGrenade(this.scene.player.x, this.scene.player.y, this.scene.player.rotation);
        } else if (item.type === 'smokebomb') {
          this.useSmokeBomb(this.scene.player.x, this.scene.player.y);
        } else if (item.type === 'healthpack') {
          this.scene.playerHealth = Math.min(this.scene.playerMaxHealth, this.scene.playerHealth + 40);
          this.scene.uiSystem.showKillFeed('+40 HP RESTORED');
        }
        sprite.destroy();
      });
    }
  }

  useGrenade(x, y, angle) {
    const gx = x + Math.cos(angle) * 30;
    const gy = y + Math.sin(angle) * 30;
    const g = this.scene.add.sprite(gx, gy, 'grenade').setDepth(8);

    this.scene.tweens.add({
      targets: g,
      x: gx + Math.cos(angle) * 200,
      y: gy + Math.sin(angle) * 200,
      duration: 600,
      onComplete: () => {
        g.destroy();
        this.grenadeExplode(g.x, g.y);
      }
    });
  }

  grenadeExplode(cx, cy) {
    const r = 100;
    const expl = this.scene.add.sprite(cx, cy, 'explosion').setDepth(51).setScale(0.8);
    this.scene.tweens.add({ targets: expl, scaleX: 3, scaleY: 3, alpha: 0, duration: 500, onComplete: () => expl.destroy() });
    this.scene.cameras.main.shake(300, 0.015);
    this.scene.botManager.bots.getChildren().forEach(bot => {
      if (!bot.active) return;
      const d = Phaser.Math.Distance.Between(cx, cy, bot.x, bot.y);
      if (d < r) bot.takeDamage(80 * (1 - d / r));
    });
    const dp = Phaser.Math.Distance.Between(cx, cy, this.scene.player.x, this.scene.player.y);
    if (dp < r) this.scene.takeDamage(30 * (1 - dp / r));
    this.scene.uiSystem.showKillFeed('GRENADE!');
  }

  useSmokeBomb(x, y) {
    const smoke = this.scene.add.graphics().setDepth(20);
    smoke.fillStyle(0x888888, 0.5);
    smoke.fillCircle(x, y, 80);
    this.scene.tweens.add({
      targets: smoke,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 5000,
      onComplete: () => smoke.destroy()
    });
    this.scene.uiSystem.showKillFeed('SMOKE DEPLOYED!');
  }
}
```

---

## Task 15: Zone System (Battle Royale)

**Files:**
- Create: `public/js/systems/ZoneSystem.js`

- [ ] **Step 1: Create ZoneSystem.js**

```javascript
class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.cx = scene.MAP_W / 2;
    this.cy = scene.MAP_H / 2;
    this.radius = scene.MAP_W * 0.48;
    this.targetRadius = 200;
    this.shrinkDuration = 480000; // 8 minutes in ms
    this.elapsed = 0;
    this.damageTimer = 0;

    this.zoneGraphics = scene.add.graphics().setDepth(2);
    this.outsideOverlay = scene.add.graphics().setDepth(2);
  }

  isOutside(x, y) {
    const d = Phaser.Math.Distance.Between(x, y, this.cx, this.cy);
    return d > this.radius;
  }

  update(delta) {
    this.elapsed += delta;
    const t = Math.min(this.elapsed / this.shrinkDuration, 1);
    this.radius = Phaser.Math.Linear(this.scene.MAP_W * 0.48, this.targetRadius, t);

    this.drawZone();

    // Zone damage to player
    if (this.isOutside(this.scene.player.x, this.scene.player.y)) {
      this.damageTimer += delta;
      this.scene.uiSystem.showZoneWarning(true);
      if (this.damageTimer >= 500) {
        this.damageTimer = 0;
        this.scene.takeDamage(5);
      }
    } else {
      this.damageTimer = 0;
      this.scene.uiSystem.showZoneWarning(false);
    }
  }

  drawZone() {
    this.zoneGraphics.clear();
    // Safe zone circle (blue outline)
    this.zoneGraphics.lineStyle(4, 0x4488ff, 0.9);
    this.zoneGraphics.strokeCircle(this.cx, this.cy, this.radius);

    // Inner zone tint
    this.zoneGraphics.lineStyle(2, 0x88ccff, 0.3);
    this.zoneGraphics.strokeCircle(this.cx, this.cy, this.radius - 30);

    // Outside red overlay (rectangle minus circle approximation via Phaser alpha mask)
    this.outsideOverlay.clear();
    this.outsideOverlay.fillStyle(0xff0000, 0.12);
    this.outsideOverlay.fillRect(0, 0, this.scene.MAP_W, this.scene.MAP_H);
    // Clip inside zone (not natively supported easily, use alpha on outside instead)
  }
}
```

---

## Task 16: Game Over Scene

**Files:**
- Create: `public/js/scenes/GameOverScene.js`

- [ ] **Step 1: Create GameOverScene.js**

```javascript
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) {
    this.won = data.won || false;
    this.kills = data.kills || 0;
    this.soldier = data.soldier || SOLDIERS[0];
    this.coinsEarned = data.coinsEarned || 0;
    this.totalCoins = data.totalCoins || SaveSystem.load().coins;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();

    const bg = this.add.graphics();
    if (this.won) {
      bg.fillGradientStyle(0x0a2a0a, 0x0a2a0a, 0x1a4a1a, 0x1a4a1a, 1);
    } else {
      bg.fillGradientStyle(0x2a0a0a, 0x2a0a0a, 0x4a1a1a, 0x4a1a1a, 1);
    }
    bg.fillRect(0, 0, W, H);

    const title = this.won ? '⚡ VICTORY ROYALE ⚡' : '☠ ELIMINATED ☠';
    const titleColor = this.won ? '#44ff88' : '#ff4444';

    this.add.text(W / 2, 120, title, {
      fontSize: '56px', fontFamily: 'Impact',
      color: titleColor, stroke: '#000000', strokeThickness: 5,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 6, fill: true }
    }).setOrigin(0.5);

    // Stats card
    const cx = W / 2, cy = H / 2 - 20;
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.6);
    card.fillRoundedRect(cx - 220, cy - 100, 440, 200, 12);
    card.lineStyle(2, this.won ? 0x44ff88 : 0xff4444, 1);
    card.strokeRoundedRect(cx - 220, cy - 100, 440, 200, 12);

    const lines = [
      [`KILLS`, `${this.kills}`, '#ff4444'],
      [`SOLDIER`, this.soldier.name.toUpperCase(), '#' + this.soldier.color.toString(16).padStart(6,'0')],
      [this.won ? `COINS EARNED` : `COINS EARNED`, this.won ? `+100` : `+0`, '#ffd700'],
      [`TOTAL COINS`, `${this.totalCoins}`, '#ffd700'],
      [`TOTAL WINS`, `${save.totalWins}`, '#44aaff']
    ];

    lines.forEach(([label, value, vColor], i) => {
      this.add.text(cx - 180, cy - 70 + i * 34, label, {
        fontSize: '16px', fontFamily: 'Courier New', color: '#aaaacc'
      });
      this.add.text(cx + 180, cy - 70 + i * 34, value, {
        fontSize: '16px', fontFamily: 'Impact', color: vColor, align: 'right'
      }).setOrigin(1, 0);
    });

    // Rank info
    const rank = SaveSystem.getRankTier(save.weeklyPoints);
    this.add.text(W / 2, H / 2 + 130, `WEEKLY RANK: ${rank.name} — ${save.weeklyPoints} pts`, {
      fontSize: '18px', fontFamily: 'Impact',
      color: '#' + rank.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    // Buttons
    this.makeButton(W / 2 - 120, H - 90, 'PLAY AGAIN', 0x44ff88, () => {
      this.scene.start('CharacterSelectScene');
    });
    this.makeButton(W / 2 + 120, H - 90, 'MAIN MENU', 0x4488ff, () => {
      this.scene.start('MainMenuScene');
    });
  }

  makeButton(x, y, label, color, cb) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(x - 100, y - 22, 200, 44, 8);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(x - 100, y - 22, 200, 44, 8);

    const txt = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: 'Impact', color: hex
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover', () => txt.setScale(1.06));
    txt.on('pointerout', () => txt.setScale(1));
    txt.on('pointerup', cb);
  }
}
```

---

## Task 17: Shop Scene

**Files:**
- Create: `public/js/scenes/ShopScene.js`

- [ ] **Step 1: Create ShopScene.js**

```javascript
class ShopScene extends Phaser.Scene {
  constructor() { super({ key: 'ShopScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1a0a, 0x1a1a0a, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, 45, '✦ MYTHIC ARMORY ✦', {
      fontSize: '44px', fontFamily: 'Impact',
      color: '#ffd700', stroke: '#aa8800', strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 6, fill: true }
    }).setOrigin(0.5);

    this.save = SaveSystem.load();

    this.coinsText = this.add.text(W / 2, 90, `⬡ ${this.save.coins} COINS`, {
      fontSize: '22px', fontFamily: 'Courier New', color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(W / 2, 118, '1000 coins per mythic weapon — unlocked PERMANENTLY', {
      fontSize: '13px', fontFamily: 'Courier New', color: '#888899'
    }).setOrigin(0.5);

    const cols = 3, rows = 2;
    const cw = 360, ch = 200;
    const startX = W / 2 - (cols * cw) / 2 + cw / 2;
    const startY = 180;

    MYTHIC_SHOP_ITEMS.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * cw, cy = startY + row * ch;
      this.drawShopCard(cx, cy, item);
    });

    const back = this.add.text(60, H - 50, '← BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#888899'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout', () => back.setColor('#888899'));
    back.on('pointerup', () => this.scene.start('MainMenuScene'));
  }

  drawShopCard(cx, cy, item) {
    const owned = SaveSystem.hasMythic(item.id);
    const save = SaveSystem.load();
    const canAfford = save.coins >= item.cost;

    const card = this.add.graphics();
    card.fillStyle(owned ? 0x1a1a00 : 0x0a0a1a, 1);
    card.fillRoundedRect(cx - 155, cy - 85, 310, 170, 10);
    card.lineStyle(2, owned ? 0xffd700 : (canAfford ? 0x886600 : 0x444444), 1);
    card.strokeRoundedRect(cx - 155, cy - 85, 310, 170, 10);

    if (owned) {
      this.add.text(cx - 145, cy - 75, '✓ OWNED', {
        fontSize: '12px', fontFamily: 'Courier New', color: '#44ff88'
      });
    }

    // Weapon icon placeholder
    const ic = this.add.graphics();
    ic.fillStyle(0xffd700, 1);
    ic.fillRect(cx - 130, cy - 50, 40, 18);

    this.add.text(cx - 70, cy - 55, item.name, {
      fontSize: '16px', fontFamily: 'Impact', color: '#ffd700',
      wordWrap: { width: 220 }
    });

    // Stats preview
    const baseKey = item.weaponKey;
    const mythicDef = ALL_WEAPONS[item.id];
    const baseDef = WEAPONS[baseKey];
    if (mythicDef && baseDef) {
      this.add.text(cx - 70, cy - 20, `DMG: ${baseDef.damage} → ${mythicDef.damage}`, {
        fontSize: '12px', fontFamily: 'Courier New', color: '#aaffaa'
      });
      this.add.text(cx - 70, cy, `MAG: ${baseDef.magSize} → ${mythicDef.magSize}`, {
        fontSize: '12px', fontFamily: 'Courier New', color: '#aaaaff'
      });
    }

    if (!owned) {
      const btnColor = canAfford ? 0xffd700 : 0x555555;
      const btnHex = canAfford ? '#ffd700' : '#555555';
      const btnBg = this.add.graphics();
      btnBg.fillStyle(btnColor, 0.15);
      btnBg.fillRoundedRect(cx - 130, cy + 35, 260, 40, 7);
      btnBg.lineStyle(2, btnColor, 1);
      btnBg.strokeRoundedRect(cx - 130, cy + 35, 260, 40, 7);

      const btn = this.add.text(cx, cy + 55, `BUY — ${item.cost} COINS`, {
        fontSize: '16px', fontFamily: 'Impact', color: btnHex
      }).setOrigin(0.5);

      if (canAfford) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1));
        btn.on('pointerup', () => {
          const bought = SaveSystem.unlockMythic(item.id);
          if (bought) {
            this.scene.restart();
          }
        });
      }
    } else {
      this.add.text(cx, cy + 55, '✦ UNLOCKED — AVAILABLE IN GAME', {
        fontSize: '13px', fontFamily: 'Courier New', color: '#ffd700', align: 'center'
      }).setOrigin(0.5);
    }
  }
}
```

---

## Task 18: Ranks Scene

**Files:**
- Create: `public/js/scenes/RanksScene.js`

- [ ] **Step 1: Create RanksScene.js**

```javascript
class RanksScene extends Phaser.Scene {
  constructor() { super({ key: 'RanksScene' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const save = SaveSystem.load();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0e0e2a, 0x0e0e2a, 1);
    bg.fillRect(0, 0, W, H);

    this.add.text(W / 2, 45, '⚡ WEEKLY RANKINGS ⚡', {
      fontSize: '44px', fontFamily: 'Impact',
      color: '#44aaff', stroke: '#002266', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2, 95, 'Rankings reset every Monday. Win games to climb the ranks!', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#666688'
    }).setOrigin(0.5);

    // Rank tiers
    const tiers = [
      { name: 'DIAMOND', color: 0x00ffff, min: 5000, max: '∞' },
      { name: 'PLATINUM', color: 0xe5e4e2, min: 3000, max: 4999 },
      { name: 'GOLD', color: 0xffd700, min: 1500, max: 2999 },
      { name: 'SILVER', color: 0xc0c0c0, min: 500, max: 1499 },
      { name: 'BRONZE', color: 0xcd7f32, min: 0, max: 499 }
    ];

    const myRank = SaveSystem.getRankTier(save.weeklyPoints);
    const cx = W / 2;

    tiers.forEach((tier, i) => {
      const ty = 160 + i * 88;
      const isMyRank = tier.name === myRank.name;
      const colorHex = '#' + tier.color.toString(16).padStart(6, '0');

      const card = this.add.graphics();
      card.fillStyle(isMyRank ? tier.color : 0x111122, isMyRank ? 0.15 : 1);
      card.fillRoundedRect(cx - 320, ty, 640, 72, 10);
      card.lineStyle(isMyRank ? 3 : 1, tier.color, isMyRank ? 1 : 0.5);
      card.strokeRoundedRect(cx - 320, ty, 640, 72, 10);

      this.add.text(cx - 290, ty + 36, tier.name, {
        fontSize: '22px', fontFamily: 'Impact', color: colorHex
      }).setOrigin(0, 0.5);

      this.add.text(cx - 20, ty + 36, `${tier.min} – ${tier.max} pts`, {
        fontSize: '16px', fontFamily: 'Courier New', color: '#888899'
      }).setOrigin(0, 0.5);

      if (isMyRank) {
        this.add.text(cx + 260, ty + 20, '◄ YOU', {
          fontSize: '14px', fontFamily: 'Impact', color: colorHex
        }).setOrigin(1, 0);
        this.add.text(cx + 260, ty + 42, `${save.weeklyPoints} pts`, {
          fontSize: '13px', fontFamily: 'Courier New', color: colorHex
        }).setOrigin(1, 0);
      }
    });

    // Progress to next rank
    if (myRank.next) {
      const pct = save.weeklyPoints / myRank.next;
      const barW = 600;
      const barG = this.add.graphics();
      barG.fillStyle(0x222244, 1);
      barG.fillRoundedRect(cx - barW/2, H - 110, barW, 20, 5);
      barG.fillStyle(myRank.color, 1);
      barG.fillRoundedRect(cx - barW/2, H - 110, barW * pct, 20, 5);

      this.add.text(cx, H - 80, `${save.weeklyPoints} / ${myRank.next} pts to next rank`, {
        fontSize: '14px', fontFamily: 'Courier New', color: '#aaaacc'
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, H - 80, '⚡ MAX RANK ACHIEVED ⚡', {
        fontSize: '18px', fontFamily: 'Impact', color: '#00ffff'
      }).setOrigin(0.5);
    }

    const back = this.add.text(60, H - 40, '← BACK', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#888899'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout', () => back.setColor('#888899'));
    back.on('pointerup', () => this.scene.start('MainMenuScene'));
  }
}
```

---

## Task 19: API Integration (Commentary + Voice)

**Files:**
- Modify: `public/js/scenes/GameScene.js` — add `fetchCommentary` method

- [ ] **Step 1: Add fetchCommentary to GameScene**

Add this method inside the `GameScene` class, after the `playerWin()` method:

```javascript
  async fetchCommentary(killCount, weapon) {
    try {
      const resp = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killCount, weapon })
      });
      const data = await resp.json();
      if (data.text) {
        this.uiSystem.showKillFeed(`🎙 ${data.text}`);
        // Try voice
        this.playVoice(data.text);
      }
    } catch (e) { /* silently fail */ }
  }

  async playVoice(text) {
    try {
      const resp = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(() => {});
    } catch (e) { /* silently fail */ }
  }
```

---

## Task 20: Wiring + Final Polish

**Files:**
- Modify: `public/js/scenes/GameScene.js` — wire all systems together

- [ ] **Step 1: Verify all system initializations work at startup**

Run: `node server.js`
Open: `http://localhost:3000`
Expected: Main menu renders with rank card, buttons visible, grid background.

- [ ] **Step 2: Verify game scene flow**

Click PLAY → CharacterSelect → DEPLOY → Game starts.
Expected: Player visible at center of map, minimap visible, HUD visible.

- [ ] **Step 3: Verify bot spawning and AI**

Expected: 19 bots spawned with health bars, bots patrol and chase player within range.

- [ ] **Step 4: Verify weapons and firing**

Expected: LMB fires, ammo decrements, R reloads, 1-4 switches weapons, dropping enemy weapon pickups on kill.

- [ ] **Step 5: Verify shop buy flow**

Go to SHOP → buy mythic item if coins available → re-enter game → mythic weapon appears as option.

- [ ] **Step 6: Verify save persistence**

Win a game → check coins increased → refresh page → coins still there.

- [ ] **Step 7: Verify weekly rank reset**

(Simulate by manually setting `weekNumber` in localStorage to an old week) → reload page → points should reset to 0.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: initial Shootpoint battle royale game

Full-featured top-down battle royale with bots, 6 weapon types,
inventory, minimap, scorestreaks, mythic shop, ranks, save/reload.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
