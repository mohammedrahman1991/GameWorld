# Find the Word — Design Document

## Concept
Educational word-definition matching game. A definition is shown; the player clicks the matching word from a set of shuffled tiles. Fun, fast-paced, neutral color palette.

## Screens
1. **Start** — title, "How to Play", difficulty selector (1–5), Play button
2. **Player Setup Overlay** — number of players (1–4), name inputs
3. **Game** — definition card, word tiles, timer bar + countdown, score
4. **Handoff Overlay** — "Pass to [player]" screen between players
5. **Results** — per-player round summary (correct / wrong / score)
6. **Leaderboard** — bar chart, 🥇🥈🥉 medals, Play Again / Home

## Difficulty Levels
| Level | Name    | Words shown | Timer | Points/correct |
|-------|---------|-------------|-------|----------------|
| 1     | Easy    | 6           | 30s   | 10             |
| 2     | Beginner| 7           | 30s   | 15             |
| 3     | Normal  | 8           | 28s   | 20             |
| 4     | Hard    | 8           | 25s   | 25             |
| 5     | Expert  | 10          | 22s   | 30             |

Each round: player matches all words shown (one definition at a time, tiles remain visible).

## Mechanics
- All word tiles for the round are shown upfront
- One definition displayed at a time (random order)
- Player clicks the matching tile → tile turns green/red → next definition
- Timer counts down for the entire round (not per word)
- No-repeat: `sessionUsed Set` tracks used words; cleared only on Home

## Word Pool
150 words across 5 difficulty bands (30 per level). Randomly selected each session — no repeats within a session.

## Color Scheme
- Background: `#0e1018` (dark navy)
- Card surface: `#1a1f2e`
- Accent / primary: `#818cf8` (soft indigo)
- Correct: `#4ade80` (green)
- Wrong: `#f87171` (red-pink)
- Score gold: `#fbbf24`
- Text: `#e2e8f0`

## Sounds (Web Audio API — no files needed)
- `playBell()` — round start (pure tone 880Hz)
- `playTick()` — each second when ≤10s remain
- `playCorrect()` — correct answer (quick ascending tone)
- `playWrong()` — wrong answer (short descending buzz)
- `playTimeUp()` — timer hits 0 (low descending sweep)

## Multiplayer
Identical to BrainCrate: `players[]`, `currentPlayerIdx`, handoff overlay between players, leaderboard with bar chart.

## Files
- `find-the-word/index.html` — all screens + CSS
- `find-the-word/game.js` — word bank, game logic, audio, multiplayer
- `find-the-word/FINDTHEWORD.md` — this file
