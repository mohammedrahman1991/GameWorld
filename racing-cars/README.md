# 🏎️ Racing Cars — Game Design Document

## Overview
A 3D browser racing game built with Three.js. Players can free-drive to collect
coins, buy new cars, and race against a bot or a friend. All progress (coins,
owned cars, selected car) is saved between sessions via `wb_save_racing-cars`.

---

## Screen Flow

```
Main Menu
├── Free Drive → [1 Player | 2 Player | Back]
├── Racing     → [1 Player (vs Bot) | 2 Player | Back]
├── More Cars  → car shop (buy with coins)
└── Garage     → view owned cars, select active car
```

---

## Main Menu Buttons

| Button       | Action                                      |
|--------------|---------------------------------------------|
| Free Drive   | Open free-drive mode select (1P / 2P)       |
| Racing       | Open race mode select (vs bot / 2P)         |
| More Cars    | Open car shop                               |
| Garage       | View + select from owned cars               |

---

## Gameplay Modes

### Free Drive (1 Player)
- Oval track, no timer, no laps
- Golden coins scattered around track — collect to earn 💰
- Boost key available (SPACE)
- Controls shown at bottom of screen

### Free Drive (2 Player)
- Split-screen (left / right)
- Each player collects coins independently
- P1: WASD + SPACE boost | P2: Arrow keys + ENTER boost

### Racing — 1 Player vs Bot
- 3 laps, timed
- Bot AI follows track waypoints
- Rubber-band AI (speeds up when far behind)
- Win/lose screen with time

### Racing — 2 Player
- Split-screen, 3 laps each
- Same controls as 2P Free Drive
- First to complete 3 laps wins

---

## Cars

| ID      | Name          | Price   | Speed | Accel | Handling | Boost |
|---------|---------------|---------|-------|-------|----------|-------|
| basic   | Street Racer  | Free    | 14    | 7     | 2.0      | 1.5×  |
| muscle  | Muscle Beast  | 500 💰  | 16    | 9     | 1.7      | 1.6×  |
| sports  | Sport Blaze   | 1 200 💰| 18    | 10    | 2.4      | 1.7×  |
| turbo   | Turbo X       | 2 500 💰| 20    | 11    | 2.2      | 1.8×  |
| stealth | Night Stalker | 4 000 💰| 22    | 10    | 2.6      | 2.0×  |
| legend  | Legend GT     | 8 000 💰| 25    | 14    | 2.8      | 2.2×  |

---

## Controls

### 1 Player
| Key          | Action            |
|--------------|-------------------|
| W / ↑        | Accelerate        |
| S / ↓        | Brake / Reverse   |
| A / ←        | Turn Left         |
| D / →        | Turn Right        |
| SPACE        | 🚀 Boost (2 sec)  |

### 2 Player (split-screen)
| Player | Move         | Boost  |
|--------|--------------|--------|
| P1     | WASD         | SPACE  |
| P2     | Arrow Keys   | ENTER  |

### Mobile
Virtual joystick (bottom-left) + Boost button (bottom-right)

---

## Track
- Shape: Oval (50×30 units), 80 waypoints, track width 14 units
- Surfaces: Dark asphalt, white edge lines, yellow centre dashes, red/white curbs
- Environment: Gradient sunset sky, green grass, trees, grandstands, fog
- Coins: 16 evenly spaced in Free Drive mode

---

## Save Data (`wb_save_racing-cars`)
```json
{
  "coins": 0,
  "ownedCars": ["basic"],
  "selectedCar": "basic",
  "bestLapTime": null
}
```

---

## Tech Stack
- Three.js r160 (CDN) — 3D rendering, lighting, shadows
- Custom sunset sky shader (SphereGeometry + ShaderMaterial)
- Arcade physics — no external physics engine
- Split-screen via `renderer.setViewport` + `renderer.setScissor`
- All in one `index.html` — no build step
