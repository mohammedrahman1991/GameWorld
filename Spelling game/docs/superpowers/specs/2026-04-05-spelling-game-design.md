# Spelling Game — Design Spec
_Date: 2026-04-05_

## Overview

A kid-friendly spelling game for ages 5–12. Space Adventure theme. Hangman-style letter-by-letter guessing with an ElevenLabs voice narrator, a cute alien mascot with hearts, a 30-second timer per word, and 10 rounds per session.

---

## Architecture

```
Spelling game/
├── server.js          ← Express server + ElevenLabs proxy
├── .env               ← ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, PORT
├── package.json
└── public/
    ├── index.html     ← full game UI (single page, screens shown/hidden via JS)
    ├── style.css      ← space theme: dark purple/blue, glowing letters, stars
    └── game.js        ← all game logic, state machine, word lists
```

**Server responsibilities:**
- Serve `public/` as static files
- `POST /api/speak` — accepts `{ text: string }`, calls ElevenLabs TTS API, returns audio as `audio/mpeg` stream. API key never exposed to client.

**Client responsibilities:**
- All game state (current round, score, hearts, timer) lives in `game.js`
- Fetches `/api/speak`, plays returned audio via `<audio>` element
- No external dependencies — vanilla JS only

---

## Screens

### 1. Home Screen
- Game title: "SPELL QUEST" (or similar)
- Twinkling stars background
- 3 glowing difficulty cards side by side

### 2. Difficulty Select
Three cards displayed on home screen:

| Card | Icon | Label | Ages | Hearts | Word length |
|------|------|-------|------|--------|-------------|
| Easy | 🌍 | EASY | 5–7 | 5 | 3–4 letters |
| Medium | 🌙 | MEDIUM | 8–10 | 4 | 5–6 letters |
| Hard | 🌌 | HARD | 11–12 | 3 | 7–10 letters |

Clicking a card starts the game at that difficulty.

### 3. Game Screen
Layout (top to bottom):
1. **Header bar** — Round counter (Round 1 of 10), difficulty badge, score
2. **Alien mascot** — centered, with heart row below it (filled/empty)
3. **Word tiles** — blank underscored boxes, one per letter. Correct guesses fill in.
4. **Timer bar** — horizontal progress bar, 30 seconds, depletes left to right. Turns red at 10s.
5. **Hint area** — hidden until timer hits 0. Shows first letter + 1-line text clue.
6. **On-screen keyboard** — A–Z buttons in QWERTY layout. Used letters turn gray (wrong) or green (correct).

### 4. Round Result (brief overlay)
- Win: celebration emoji + "Great job! ⭐" + auto-advance after 1.5s
- Fail (hearts gone mid-word): "Nice try! The word was [WORD]" + short pause + next round

### 5. Score Screen
- "Mission Complete!" heading
- "You spelled X out of 10 words!"
- Star rating: 3★ = 10/10, 2★ = 7–9, 1★ = 4–6, 0★ = 0–3
- Two buttons: "Play Again" (same difficulty) · "Change Level"

### 6. Game Over Screen (all hearts lost)
- "Your alien ran out of hearts! 💔"
- Shows current score
- "Try Again" button

---

## Game Flow

```
Home → Pick Difficulty → Round Start → [Voice: "Round N! Spell: WORD"] →
  Guessing Loop:
    - Correct letter → reveal tile, green flash on key
    - Wrong letter → lose heart, key grays out
    - All letters found → Round Win → next round
    - Timer = 0 → show hint, keep guessing
    - Hearts = 0 → Game Over screen
  After 10 rounds → Score Screen
```

---

## ElevenLabs Voice Lines

Called via `POST /api/speak` at these moments:

| Trigger | Text |
|---------|------|
| Round start | `"Round {N}! You have 30 seconds. Spell the word: {WORD}"` |
| Correct word | `"Correct! Great job!"` |
| Timer hits 0 | `"Nice try! Here's a hint..."` |
| Game over | `"Oh no! Your alien ran out of hearts!"` |
| Score screen | `"Mission complete! You spelled {X} out of 10 words!"` |

Voice: Rachel (voice ID from `.env`). Audio plays immediately on fetch response.

---

## Word Lists

30+ words per level, stored as arrays in `game.js`. Randomly shuffled at game start. 10 picked per session.

**Easy (3–4 letters):** cat, dog, sun, hat, run, big, cup, red, map, fly, ant, bus, egg, fan, fog, hop, ice, jam, keg, log, mud, net, oak, pig, rat, sky, top, van, wet, zoo

**Medium (5–6 letters):** rocket, jungle, flower, planet, brave, storm, smile, ocean, magic, tiger, comet, spark, lunar, flock, gleam, howl, pixie, scout, torch, vivid, blast, crisp, drift, ember, frost

**Hard (7–10 letters):** champion, adventure, universe, discovery, beautiful, celebrate, glittering, fantastic, hurricane, invisible, jellyfish, knowledge, laughter, muscular, navigate, opposite, purchase, question, together, umbrella

---

## Timer & Hint Logic

- Timer: 30 seconds, JavaScript `setInterval` ticking every 100ms for smooth bar animation
- At 0s: timer stops, hint area fades in. First letter of word is revealed in the tile row. Text clue appears below (stored alongside each word in the word list as a short string, e.g. `"It's an animal that says meow"`).
- After hint, kid continues guessing remaining letters. Wrong guesses still cost hearts.

---

## Visual Design

- **Background:** `#0a0618` dark near-black purple, fixed twinkling star field (CSS animation)
- **Cards/panels:** semi-transparent dark panels with colored glowing borders
- **Easy:** green glow (`#34d399`)
- **Medium:** yellow glow (`#fbbf24`)
- **Hard:** purple glow (`#a78bfa`)
- **Letter tiles:** rounded rectangles, dark fill, `#818cf8` border, white text when revealed
- **Keyboard keys:** rounded, `rgba(99,102,241,0.3)` fill, glow on hover
- **Wrong key:** red tint, disabled
- **Correct key:** green tint, disabled
- **Alien mascot:** large emoji `👾` with heart row `❤️` below
- **Font:** system sans-serif, bold, letter-spacing for the "space tech" feel

---

## Tech Stack

- **Server:** Node.js + Express + dotenv + axios
- **Client:** Vanilla HTML/CSS/JS — no build step, no frameworks
- **Audio:** `<audio>` element, `src` set to blob URL from `/api/speak` response
- **ElevenLabs API:** REST call from server using `axios`, streamed back to client
