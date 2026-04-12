# Trutles 2.0 — Fighting Game Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

A web-based 2-player local fighting game built with Phaser.js. Two players share one keyboard and pick from a roster of 6 pixel art fighters — 4 chickens, a kangaroo sensei, and an armored villain. Simple 3-button controls, best-of-3 rounds, smooth scene transitions.

---

## Tech Stack

- **Framework:** Phaser 3 (loaded from CDN)
- **Delivery:** Single `index.html` file — no build step, no server required
- **Art:** Pixel art drawn procedurally with Phaser Graphics API (no image assets)
- **Audio:** None in v1 (can add later)

---

## Fighters

| Name | Color | Identity | Special trait |
|------|-------|----------|--------------|
| Cluck | 🔴 Red | Red comb + bandana | Brawler |
| Wing | 🔵 Blue | Blue comb + bandana | Speedy |
| Peck | 🟣 Purple | Purple comb + bandana | Tricky |
| Talons | 🟢 Green | Green comb + bandana | Heavy |
| Sensei | 🟠 Orange | Kangaroo in gi, cane | Cane strikes |
| Slicer | ⚫ Dark | Armored, red visor, blade | Blade slash |

All 6 fighters share the same stats and move speeds in v1 — the personality traits are visual only. Balance can be added later.

---

## Scenes

### 1. TitleScene
- Dark background, "TRUTLES 2.0" pixel logo
- Animated pixel chickens in background
- "PRESS ENTER TO PLAY" prompt (blinking)
- Transition: fade to black → CharacterSelectScene

### 2. CharacterSelectScene
- Split screen: P1 on left, P2 on right
- 6 fighter portraits in a row, cursor highlights current selection
- P1 uses `A`/`D` to browse, `F` to confirm
- P2 uses `←`/`→` to browse, `L` to confirm
- Both must confirm before match starts
- Transition: flash white → "FIGHT!" text → FightScene

### 3. FightScene
- **Layout:** Health bars top-left (P1) and top-right (P2), round timer center-top
- **Stage:** Single flat platform, looping pixel background
- **Round system:** Best of 3 · 99s timer · if timer runs out, higher HP wins
- **Announcements:** "ROUND 1", "FIGHT!", "KO!", "TIME!" rendered as large pixel text overlays
- **Win condition:** First to win 2 rounds wins the match
- Transition: freeze frame flash → WinScene

### 4. WinScene
- Winner's sprite displayed large, victory pose
- "PLAYER 1 WINS!" / "PLAYER 2 WINS!" pixel text
- Two options: "PLAY AGAIN" (→ CharacterSelectScene) · "QUIT" (→ TitleScene)
- P1 or P2 can press attack to select

---

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move Left | `A` | `←` |
| Move Right | `D` | `→` |
| Jump | `W` | `↑` |
| Attack | `F` | `L` |

**Attack mechanic:** Short hitbox extends in front of the fighter. If opponent is within range and not attacking simultaneously, they take damage. Jump + Attack = aerial strike (slightly longer hitbox, more damage).

**No blocking, no special moves in v1.**

---

## Fighter Pixel Art

Each fighter is drawn with Phaser Graphics calls (no PNGs):

- **Chickens (4):** ~16×20px sprite. Wheat-colored body, colored comb + bandana matching their color identity, orange beak and legs, black dot eyes.
- **Sensei:** ~16×20px. Brown kangaroo body, rounded ears, orange gi, black belt, brown cane in right hand.
- **Slicer:** ~16×20px. Dark grey armor, spiked helmet, red glowing eyes (visor slit), silver blade on right side.

Each fighter has 3 animation states drawn as separate pixel frames:
- **Idle:** subtle bob (2 frames)
- **Attack:** arm extends forward (1 frame, 200ms)
- **Hurt:** red flash tint (200ms)

---

## Transitions

| From → To | Effect |
|-----------|--------|
| Title → CharSelect | Fade to black (400ms) |
| CharSelect → Fight | White flash + "FIGHT!" overlay (600ms) |
| Round end → Next round | 1s pause + "ROUND X" banner |
| Fight → Win | Freeze frame + slow flash (800ms) |
| Win → CharSelect | Fade to black (400ms) |

---

## File Structure

```
index.html          ← entire game (Phaser CDN, all JS inline)
```

That's it.

---

## Out of Scope (v1)

- Sound effects / music (ElevenLabs key in `.env` could power announcer voice in v2)
- Stat differences between fighters
- Special moves
- Online multiplayer
- Mobile / touch controls
- Story mode / AI opponent
