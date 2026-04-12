# Noah's House — Game Design Spec
**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Noah's House is a 1v1 browser-based basketball game. Steph Curry (Golden State Warriors) faces off against Anthony Edwards (Minnesota Timberwolves) on a custom beach court. The game runs in the browser, served by a Node.js/Express server on port 3021.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Game engine | Phaser.js 3 (2D game framework) |
| Server | Node.js + Express, port 3021 |
| Rendering | Phaser isometric plugin (3/4 perspective) |
| Art style | Cartoon / illustrated (bold outlines, vibrant colors) |
| Commentary | ElevenLabs API (voice ID from .env) |
| Environment | Browser — served as static assets via Express |

---

## Players & Stats

### Steph Curry #30 — Golden State Warriors (2K22 ratings)
| Stat | Rating | Effect in game |
|---|---|---|
| Three-point shooting | 99 | Shot meter green zone is wider from 3PT range; ball arc turns gold |
| Ball handling / dribble | 96 | Dribble moves execute faster; crossover animation plays on T key |
| Speed | 88 | Standard movement speed |
| Mid-range shooting | 92 | High accuracy inside the arc |
| Defense / steal | 77 | Average steal chance |

### Anthony Edwards #5 — Minnesota Timberwolves (2K26 ratings)
| Stat | Rating | Effect in game |
|---|---|---|
| Driving layup / dunk | 95 | Contact layup animation; dunk animation near rim |
| Athleticism / speed | 92 | Faster base movement than Curry |
| Mid-range shooting | 88 | Reliable mid-range |
| Three-point shooting | 82 | Slightly narrower green zone than Curry |
| Defense / steal | 85 | Higher steal chance; block animation at rim |

---

## Controls

### Player 1 — Steph Curry
| Key | Action |
|---|---|
| W / A / S / D | Move (up / left / down / right) |
| G | Shoot (hold to charge shot meter, release in green zone) |
| F | Pass / chest pass |
| T | Dribble move / crossover |
| R | Pump fake |

### Player 2 — Anthony Edwards
| Key | Action |
|---|---|
| ↑ / ← / ↓ / → | Move |
| / | Shoot (hold to charge shot meter) |
| . | Pass / chest pass |
| , | Dribble move |
| M | Pump fake |

Both sets of controls are permanently visible in the bottom HUD bar during gameplay.

---

## Game Mechanics

### Shot Meter
- Vertical bar appears when shoot key is held
- Three zones: red (too early), yellow (okay), green (perfect)
- Release in green = high accuracy; release in red = likely miss
- Curry's green zone is wider from beyond the arc
- Shot arc turns gold when Curry shoots from 3PT range

### Scoring
- **2 points**: ball goes in from inside the 3PT arc
- **3 points**: ball goes in from outside the 3PT arc
- **Dunk**: Edwards drives into the dunk zone (within ~1 tile of rim) + presses shoot = dunk animation, scores 2
- **Layup**: any player near the rim at low speed = layup animation, scores 2
- **Swish bonus**: perfect green zone release = net ripple animation + commentary
- Free throws: not included (keep it fast-paced)

### Possession & Game Flow
- First to 21 points wins (street ball rules)
- Tip-off decides first possession
- Ball resets to center after each score
- Shot clock: 24 seconds per possession

### Dribble Moves
- T / , key triggers a crossover/dribble move animation
- Curry's dribble is faster and has a hesitation animation
- Edwards has a Euro-step animation when driving to the hoop

### Defense
- Pressing shoot key when near the ball carrier = steal attempt (based on steal stat)
- Pressing shoot at rim when opponent shoots = block attempt (based on block stat)

---

## Court & Scene

### Beach Court — "Steph Curry Court"
- **Background**: Ocean horizon, blue sky, bright sun (top 45%), golden sand (bottom 55%)
- **Court surface**: Isometric hardwood-style court with painted lines (center line, 3PT arc, key)
- **Court markings**: Custom "NOAH'S HOUSE" logo at center

### Hoops (both ends of the court)
- Each hoop consists of: a vertical backboard, a pole/stanchion, an orange rim, and a white net
- The rim is at a fixed height above the court — rendered in the isometric perspective
- Net animates (ripple/swish) when a shot goes in
- **3PT arc** painted on the court floor around each hoop — crossing this line determines 2 vs 3 points
- When a player is inside the arc → shot scores 2 points
- When a player is outside the arc → shot scores 3 points; Curry's ball arc turns gold
- **Dunk zone**: within ~1 tile of the rim — if Edwards drives into the dunk zone with the ball, pressing shoot triggers a dunk animation instead of a jump shot. Curry can do a layup in this zone but not a dunk.

### Graffiti Walls
- Left wall: "NOAH", "🏀 HOUSE 🏀", "#SPLASH", "WARRIORS" — in bold spray-paint style
- Right wall: "STEPH", "CURRY", "BEACH COURT", "MVP" — multicolor tags
- Walls use cartoon graffiti font, 3-4 colors per wall

### Fans
- 3–5 fan sprites per sideline (left and right)
- Fans animate (jump, wave arms) when a score happens
- Mix of Warriors (#1d428a) and Timberwolves (#c8102e) colors in the crowd

---

## UI Screens

### 1. Title Screen
- Game title: "NOAH'S HOUSE" in graffiti font
- Beach background
- Two options: "PLAY" and "CONTROLS"
- Press ENTER or click to start

### 2. Game Screen
- Top HUD: Curry score (left) | Timer + shot clock (center) | Ant score (right)
- Game world: full isometric beach court
- Bottom HUD: P1 controls (left) | P2 controls (right) — always visible
- Shot meter: appears beside the shooting player when shoot key is held

### 3. Score Celebration
- On each basket: brief screen flash in scorer's team color
- Animated "+2" or "+3" floats up from the hoop
- ElevenLabs commentary fires (e.g., "Curry from deep! That's money!")

### 4. Game Over Screen
- Winner announcement: "CURRY WINS!" or "ANT-MAN WINS!"
- Final score displayed
- "PLAY AGAIN" button

---

## Commentary (ElevenLabs)

Triggered on game events, using the ElevenLabs voice ID from `.env`:

| Event | Sample line |
|---|---|
| Curry makes a 3 | "Splash! Steph Curry from way downtown!" |
| Curry makes a 2 | "Curry with the mid-range — automatic!" |
| Edwards dunks | "ANT-MAN throws it DOWN!" |
| Edwards makes a 3 | "Edwards from three — he's got range!" |
| Steal | "Picked his pocket!" |
| Block | "Rejection! Get that outta here!" |
| Miss | "No good — but the crowd is loving this!" |

---

## Project Structure

```
Noah's Game/
├── .env                        # API keys, PORT=3021
├── package.json
├── server.js                   # Express server, serves /public on port 3021
├── public/
│   ├── index.html              # Entry point
│   ├── assets/
│   │   ├── sprites/            # Player sprites (Curry, Edwards, ball, fans)
│   │   ├── tilemaps/           # Isometric court tilemap
│   │   └── audio/              # Crowd noise, buzzer SFX
│   └── js/
│       ├── main.js             # Phaser game config
│       ├── scenes/
│       │   ├── TitleScene.js   # Title screen
│       │   ├── GameScene.js    # Main game loop
│       │   └── GameOverScene.js
│       ├── entities/
│       │   ├── Player.js       # Base player class
│       │   ├── Curry.js        # Curry-specific stats & animations
│       │   └── Edwards.js      # Edwards-specific stats & animations
│       ├── systems/
│       │   ├── ShotMeter.js    # Shot meter logic
│       │   ├── Physics.js      # Ball arc, collision
│       │   └── Commentary.js   # ElevenLabs integration
│       └── ui/
│           ├── HUD.js          # Score, timer, controls bar
│           └── ScorePop.js     # Floating +2/+3 animation
└── docs/
    └── superpowers/specs/
        └── 2026-03-28-noahs-house-design.md
```

---

## Out of Scope
- Multiplayer over the internet (local only)
- More than 2 players
- Player customization
- Sound effects beyond commentary
