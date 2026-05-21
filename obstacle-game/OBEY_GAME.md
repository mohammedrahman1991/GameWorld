# Obey Game — Game Design Document

## Concept
3D obstacle-course parkour game. Run, jump, and sprint through 6 sections of
increasing danger — dodge rotating lasers, survive lava fields, cross sky
bridges — to reach the Grand Finish Island.

---

## Files
```
obey-game/
  index.html     — HTML shell + HUD
  game.js        — Three.js 3D game
  OBEY_GAME.md   — this file
```

---

## Controls
| Action  | Key |
|---------|-----|
| Move    | WASD / Arrow keys |
| Jump    | Space |
| Sprint  | Shift (hold) |

---

## Course Sections (6 + Finish)

| # | Name | Theme | Hazard |
|---|------|-------|--------|
| 0 | Green Plains | Green, wide path | Gaps (fall = die) |
| 1 | Lava Fields | Orange glow | Lava floor + moving platforms |
| 2 | Laser Hall | Dark blue corridor | Rotating laser beams |
| 3 | Sky Bridges | Light blue void | Narrow platforms, big drops |
| 4 | Chaos Zone | Purple + lava | Lasers + lava + moving platforms |
| 5 | Final Sprint | Green rush | Speed run to finish |

Each section ends with a **Checkpoint** — a gold pillar with a spinning coin.
Touch the coin to save your spawn point.

---

## Physics
| Constant | Value |
|----------|-------|
| GRAVITY | 30 |
| JUMP | 13 |
| WALK | 8 units/s |
| SPRINT | 18 units/s |
| Player box | 0.8 × 1.8 × 0.8 |

---

## Hazards
- **Void** — fall below y=–10 → respawn at last checkpoint
- **Lava** — orange platform; land on it → respawn
- **Laser** — rotating beam at head height; intersect → respawn

---

## Grand Finish Island (100 × 80 units)
- **Ball Pit** — left side; 50 colorful bouncing spheres
- **Soccer Field** — right side; goals, scoreboard, ball
- **Chest** — center back; walks up → chest opens
  - Reward: 💰 50 coins + 💎 1 diamond
  - Option: **Stay Here** (keep exploring) or **Restart** (begin again)
- **Background song** — Web Audio chiptune loops throughout

---

## Respawn System
- Default spawn: (0, 2, 0)
- Checkpoints save new spawn position
- 1-second respawn delay with flash effect
