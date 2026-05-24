# Blob Eating — Game Design Document

## Overview
Agar.io-style blob-eating game. Your blob grows by eating food pellets and devouring other blobs.
1,000 bots compete in a 9,000 × 9,000 world. Play solo or with a friend.

---

## Files
```
blob-game/
  index.html      — HTML shell, overlays (start, skin select, game over), CSS
  game.js         — All game logic (Canvas 2D)
  BLOB_GAME.md    — This file
```

---

## Game Modes

| Mode | Description |
|------|-------------|
| 1 Player | Mouse controls your blob. Camera follows you. |
| 2 Player | P1 = mouse, P2 = Arrow keys. Camera centers between both. |

---

## Controls

| Player | Action | Input |
|--------|--------|-------|
| P1 | Move | Mouse cursor — blob chases cursor |
| P2 | Move | ↑ ↓ ← → Arrow keys |

---

## Blob Properties

| Property | Detail |
|----------|--------|
| Shape | Perfect circle with shine highlight + drop shadow |
| Size | `radius = sqrt(number) × 2.4` — grows as number increases |
| Number | Starts at 100, max 1 Trillion (1,000,000,000,000) |
| Display | Number shown on blob body — formats as K / M / B / T |
| Name | Shown above blob when large enough to read |
| Face | Drawn inside blob — 8 face styles (happy, cool, angry, etc.) |
| Crown | Largest blob in the game wears a gold king crown |

---

## Eating Rules

| Situation | Result |
|-----------|--------|
| Your blob overlaps a food pellet | Eat it — gain +10 to your number |
| Your blob is 12%+ larger than another blob | Eat them — gain 75% of their number |
| Another blob is 12%+ larger than you | They eat you — you die |

---

## Skins

### Colors (12)
Red · Orange · Gold · Green · Cyan · Blue · Purple · Pink · Coral · Mint · Rose · Sky

### Faces (8)
| ID | Name | Description |
|----|------|-------------|
| 0 | Happy | Dot eyes, arc smile |
| 1 | Cool | Rectangular sunglasses, smirk |
| 2 | Angry | Angled eyebrows, frown |
| 3 | Surprised | Wide eyes, O mouth |
| 4 | Wink | One closed eye, smile |
| 5 | Sad | Dot eyes, arc frown, teardrop |
| 6 | Goofy | Squiggly eyes, single buck tooth |
| 7 | Sleepy | Half-closed eyes, Zzz floating |

---

## Food Pellets

- 6,000 pellets scattered across the world at all times
- Each pellet = random bright color, worth +10 to number
- Respawns 2–3.5 seconds after being eaten
- Rendered as small glowing circles with shine dot

---

## Bots (1,000)

| Behavior | Detail |
|----------|--------|
| Chase food | Move toward nearest food pellet |
| Chase prey | Pursue blobs up to 85% of their own size |
| Flee predators | Run away from blobs 115%+ of their size |
| Wander | Random direction drift when nothing nearby |
| Respawn | Reappear after 3–6 seconds at random world location |
| Speed | `max(40, 230 / sqrt(radius))` px/s — big blobs move slower |

Bots are updated in batches of 60/frame for performance.

---

## HUD

| Element | Location | Content |
|---------|----------|---------|
| Kill counter (P1) | Top-left | ☠ Kills: N |
| Kill counter (P2) | Top-left below P1 | ☠ P2 Kills: N (2P only) |
| Leaderboard | Top-right | Top 10 blobs by number, you highlighted green |
| Score display | Bottom-center | 💰 formatted number |

---

## Screens

### Start Screen
- Title "🫧 BLOB EATING" with subtitle
- "1 PLAYER" button (green)
- "2 PLAYER" button (blue)

### Skin Select Screen
- Live preview blob (canvas) with chosen color + face
- Left/right arrow buttons to cycle color (shows color name)
- Left/right arrow buttons to cycle face (shows face name)
- 2P mode shows two columns side by side
- "PLAY!" button launches game

### Game Over Screen
- Shows score (number reached) and kills
- "Play Again" and "🏠 Home" buttons

---

## World

- Size: 9,000 × 9,000 world units
- Background: Dark `#0d1117` with subtle dot grid lines
- Red border rectangle marks the world edge
- Camera: smooth lerp follows player, zoom out as blob grows

---

## Camera Zoom

`zoom = max(0.12, min(1.3, 130 / sqrt(number)))`

Starts at ~1.0 zoom (intimate view), zooms out as you grow huge.

---

## Number Formatting

| Range | Display |
|-------|---------|
| < 1,000 | Raw number (e.g. 523) |
| 1K – 999K | "1.5K" |
| 1M – 999M | "1.5M" |
| 1B – 999B | "1.5B" |
| 1T | "1.0T" (max) |
