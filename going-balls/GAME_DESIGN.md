# Going Balls — Game Design Document

## Overview
A perspective ball-rolling game where players steer a ball down a winding
path, collecting coins and smashing barrels across 30 levels. Earn coins
to unlock 20 unique ball skins in the shop.

---

## Screens & Flow

```
Title Screen
  ├── 1 Player  → Level Select / Start Level
  └── 2 Players → Split-screen race

Playing
  └── Ball falls off path → Game Over (restart level)
  └── Reaches trampoline → Level Complete

Level Complete
  ├── Main Menu
  ├── Shop
  └── Next Stage

Shop
  └── 20 balls, unlocked with coins
  └── Back button → returns to Level Complete or Title
```

---

## Controls

| Action        | 1 Player       | 2 Players P1 | 2 Players P2   |
|---------------|----------------|--------------|----------------|
| Steer Left    | ← or A         | A            | ←              |
| Steer Right   | → or D         | D            | →              |

---

## Level Design Rules

| Level Range | Path Width | Turns      | Barrels | Coins | Speed |
|-------------|-----------|------------|---------|-------|-------|
| 1–5         | Wide       | Gentle     | 3–5     | 8–10  | Slow  |
| 6–10        | Medium     | Moderate   | 6–8     | 10–12 | Medium|
| 11–20       | Narrow     | Frequent   | 9–12    | 12–15 | Fast  |
| 21–30       | Very Narrow| Sharp      | 13–18   | 15–20 | V.Fast|

Each level is procedurally generated using waypoints. Path length grows
slightly each level. A trampoline always appears at the end.

---

## Obstacles

### Barrels
- Brown wooden barrels placed across/near the path
- Ball can crash into them — barrel shatters, ball slows briefly
- Does NOT cause game over — only path edge does

### Path Edge
- Falling off either side = level restart (no lives system)

---

## Coins
- 8–20 coins per level (scales with level)
- Collected by rolling over them
- Persistent across sessions (saved to localStorage)
- Used to buy balls in the shop

---

## Trampoline
- Always at the end of the path
- Ball bounces up = level complete animation
- Unlocks next stage

---

## Ball Shop — 20 Skins

| # | Name        | Price |
|---|-------------|-------|
| 1 | Classic     | FREE  |
| 2 | Ocean Blue  | 50    |
| 3 | Emerald     | 50    |
| 4 | Sunshine    | 75    |
| 5 | Grape       | 100   |
| 6 | Hot Pink    | 100   |
| 7 | Ice         | 150   |
| 8 | Shadow      | 150   |
| 9 | Gold Rush   | 200   |
|10 | Rainbow     | 200   |
|11 | Fireball    | 250   |
|12 | Frost       | 250   |
|13 | Lava        | 300   |
|14 | Galaxy      | 300   |
|15 | Neon        | 300   |
|16 | Electric    | 350   |
|17 | Rose Gold   | 350   |
|18 | Inferno     | 400   |
|19 | Diamond     | 450   |
|20 | Crown       | 500   |

---

## Technical Notes
- Single HTML file, no external libraries
- Canvas 2D rendering with perspective projection
- localStorage for: coins, ownedBalls, selectedBall, highestLevel
- 30 procedurally generated levels (seed = level number)
- 2-player split-screen: canvas halved horizontally
