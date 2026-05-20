# Moto Island — Game Design Document

## Concept
Top-down motorcycle racing game. Race 3 laps around an island oval track.
Beat 5 bots in 1-player, or race a friend in 2-player.

---

## Files
```
moto-island/
  index.html     — canvas shell
  game.js        — all game logic
  MOTO_ISLAND.md — this file
```

---

## Game States
```
title → countdown (3-2-1-GO) → racing → finish (YOU WIN / YOU LOSE)
```

---

## Modes
| Mode      | Players | Bots | Laps |
|-----------|---------|------|------|
| 1 Player  | 1       | 5    | 3    |
| 2 Players | 2       | 4    | 3    |

---

## Track Layout
- Top-down oval on a tropical island
- Blue ocean background with sparkles
- Sandy beach ring around the island
- Asphalt road (width 82px) around the oval center
- Green inner island with 6 palm trees + "MOTO ISLAND" text
- 6 outer palm trees around the beach
- Checkered start/finish line at the bottom of the oval
- Yellow dashed center line, white edge lines

### Track Constants
| Name    | Value | Description              |
|---------|-------|--------------------------|
| CX, CY  | 450, 310 | track center          |
| RX, RY  | 310, 180 | road center radii     |
| ROAD_W  | 82       | road width (px)       |
| NUM_WP  | 36       | waypoints for bots/laps |
| LAPS    | 3        | laps to win           |

---

## Physics
| Constant   | Value | Description        |
|------------|-------|--------------------|
| MAX_SPD    | 4.8   | max speed (px/frame)|
| ACCEL      | 0.14  | acceleration       |
| FRICTION   | 0.92  | coast deceleration |
| BRAKE      | 0.18  | brake deceleration |
| TURN       | 0.046 | turn rate (radians)|
| GRASS_SLOW | 0.52  | speed multiplier off-road |

---

## Controls
| Player | Up       | Down     | Left       | Right       |
|--------|----------|----------|------------|-------------|
| P1 (1P)| ↑        | ↓        | ←          | →           |
| P1 (2P)| W        | S        | A          | D           |
| P2 (2P)| ↑        | ↓        | ←          | →           |

---

## Lap Detection
- 36 waypoints around the oval
- Bike starts at WP0, `nextWP = 1`
- Each time bike enters 40px radius of nextWP → advance
- `laps = floor(totalWPs / 36)`
- Race finishes when `laps >= 3`

---

## Bots
- 5 bot speeds (varied): 3.0 – 3.8 px/frame
- Steer toward nextWP with turn rate 0.06 rad/frame
- Different speeds make some easy to beat, some hard

---

## Finish Screen
- **1P**: YOU WIN (1st place) or YOU LOSE (any other)
- **2P**: PLAYER 1 WINS / PLAYER 2 WINS
- Final standings (top 4) shown
- Buttons: TRY AGAIN · GO BACK
