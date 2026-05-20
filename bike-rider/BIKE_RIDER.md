# Bike Rider — Game Design Document

## Concept
Side-scrolling motorcycle game. Ride across 5 maps (Easy → Extreme),
avoid laser gates, hit checkpoints, reach the finish line.
1-player or 2-player split-screen.

---

## Files
```
bike-rider/
  index.html     — canvas shell
  game.js        — all game logic
  BIKE_RIDER.md  — this file
```

---

## Game Flow
```
Title → Map Select → [PLAY] → Racing → Finish (WIN screen)
```

---

## Modes
| Mode      | Split | Bots |
|-----------|-------|------|
| 1 Player  | Full screen | None |
| 2 Players | Vertical split (left/right) | None — race each other |

---

## Controls
| Action    | Player 1    | Player 2   |
|-----------|-------------|------------|
| Move Right| D           | →          |
| Move Left | A           | ←          |
| Jump      | W / Space   | ↑          |

---

## 5 Maps

| # | Name          | Difficulty | Gaps | Lasers | Length |
|---|---------------|------------|------|--------|--------|
| 1 | Desert Run    | EASY       | 0    | 2      | 3400   |
| 2 | Green Hills   | MEDIUM     | 1    | 3      | 4200   |
| 3 | Rocky Canyon  | HARD       | 2    | 4      | 5000   |
| 4 | Mountain Peak | VERY HARD  | 3    | 5      | 5800   |
| 5 | Lava Extreme  | EXTREME    | 5    | 7      | 6500   |

---

## Terrain System
- Each map: array of `{x, y}` control points
- Linear interpolation between points gives smooth ground
- `tY(pts, gaps, x)` returns terrain height at world X
- **Gaps** = zones with no ground — fall in = die
- **Respawn** at last checkpoint (default: map start)

---

## Laser Gates
- Vertical red beam from top to bottom **with a gap** the player must ride through
- Gap oscillates **up and down** on moving lasers
- Hit outside the gap = die → respawn at last checkpoint
- Visual: glowing red beam, emitter boxes, safe gap slightly tinted green

---

## Checkpoints & Finish
- **Checkpoint**: two poles + banner — ride through to save respawn position
- Shows "CHECKPOINT!" notification when triggered
- **Finish line**: checkered poles + "FINISH" banner — triggers WIN screen

---

## Physics
| Constant    | Value | Description          |
|-------------|-------|----------------------|
| GRAVITY     | 0.45  | px/frame²            |
| JUMP_VEL    | -11   | upward impulse       |
| MAX_SPEED   | 5.0   | max forward px/frame |
| FRICTION_G  | 0.84  | ground coast friction|
| FRICTION_A  | 0.98  | air friction         |

- Bike angle matches terrain slope when on ground
- Falling into a gap or off screen → die
- Laser hit → die
- 1.5 second respawn delay with blinking effect
