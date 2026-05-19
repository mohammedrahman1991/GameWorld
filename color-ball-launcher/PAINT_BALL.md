# Paint Ball — Game Design Document

## Concept
A bubble-shooter game where you fire colored balls from a launcher at the bottom.
Match 2+ of the same color to pop them. Clear the whole grid to advance levels.
50 levels, 12 colors, ~100 balls at max difficulty.

---

## Files
```
color-ball-launcher/
  index.html        — canvas shell (copy from template)
  game.js           — all game logic
  PAINT_BALL.md     — this file
```

---

## Grid Layout

```
[ ROW 0 — 17 balls, even row (no offset)   ] ← attached to ceiling
[ ROW 1 — 16 balls, odd row (+half offset) ]
[ ROW 2 — 17 balls  ]
[ ...                ]
[ ROW 8 — max 9 rows total                 ]

          ↑ balls fill from ROW 0 downward
```

| Constant     | Value | Notes                          |
|--------------|-------|--------------------------------|
| BALL_R       | 22 px | ball radius                    |
| BALL_DX      | 48 px | horizontal center-to-center    |
| BALL_DY      | 42 px | vertical center-to-center (hex)|
| COLS_EVEN    | 17    | balls per even row             |
| COLS_ODD     | 16    | balls per odd row (offset)     |
| MAX_ROWS     | 9     | grid rows allocated            |
| Level 50     | 7 rows | ≈ 119 balls (max fill)       |

**Level 50 ball count: 4×17 + 3×16 = 68+48 = 116 ≈ "100 balls"**

---

## 12-Color Palette

| #  | Name   | Hex       |
|----|--------|-----------|
| 0  | Red    | `#ff2244` |
| 1  | Orange | `#ff6600` |
| 2  | Yellow | `#ffcc00` |
| 3  | Lime   | `#88dd00` |
| 4  | Green  | `#00bb44` |
| 5  | Teal   | `#00ccaa` |
| 6  | Cyan   | `#00aaee` |
| 7  | Blue   | `#3355ff` |
| 8  | Indigo | `#7722ee` |
| 9  | Purple | `#cc22ee` |
| 10 | Pink   | `#ff3399` |
| 11 | White  | `#eeeeff` |

Colors per level: `min(ceil(2 + level × 0.2), 12)`
- Level 1: 3 colors
- Level 25: 7 colors
- Level 50: all 12 colors

---

## Matching Rule

1. Projectile snaps to nearest empty adjacent grid slot on collision
2. Flood-fill finds all connected same-colored balls (including the new one)
3. If **chain length ≥ 2** → all pop + score
4. After pop: any balls now **detached from row 0** fall away (bonus score)
5. If chain length = 1 → ball stays in grid (no match)

---

## Shooting Mechanic

- Launcher at center-bottom (`x=450, y=610`)
- Aim by moving mouse; click to fire
- Angle locked to upward arc (can't shoot downward)
- Ball bounces off left & right walls
- **Dotted aim guide** shows trajectory + 1 wall bounce
- Current ball shown at launcher; next ball shown to the right

---

## Shot Limit (per level)
`shotsLeft = total grid balls + 15`

Run out of shots with balls remaining → Game Over.

---

## Scoring

| Event                    | Points            |
|--------------------------|-------------------|
| Chain pop (each ball)    | 10 × level        |
| Detached fall (each)     | 5 × level         |
| Level complete bonus     | 500 × level       |

---

## Level Progression (1→50)

| Levels | Rows | Colors | Shots budget |
|--------|------|--------|--------------|
| 1–5    | 2    | 3      | ~50          |
| 6–10   | 3    | 3–5    | ~65          |
| 11–20  | 4    | 5–7    | ~80          |
| 21–30  | 5    | 7–9    | ~95          |
| 31–40  | 6    | 9–11   | ~115         |
| 41–50  | 7    | 11–12  | ~135         |

---

## Game States

```
title → playing → levelcomplete → playing (next level)
                ↘ gameover → retry or title
             (level 50 clear) → victory
```

---

## Background
- HSL gradient per level: hue shifts by 17° each level (360° over 21 levels)
- 3 soft radial glow orbs at different hues
- Ceiling line in level hue color
- Background cycles through every color of the rainbow across the 50 levels

---

## Controls
- **Mouse move** — aim
- **Click** — fire
- **Touch** — supported (mobile friendly)
