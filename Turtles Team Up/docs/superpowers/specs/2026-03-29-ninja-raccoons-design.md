# Ninja Raccoons Team Up — Game Design Spec
_Date: 2026-03-29_

## Overview

A browser-based 1v1 Street Fighter-style fighting game featuring four ninja raccoons. Two players share a keyboard and fight each other. Each character has a unique personality, weapon, special move, and voice powered by ElevenLabs TTS.

---

## Tech Stack

- **Game engine:** Phaser.js 3 (CDN, no build step)
- **UI layer:** HTML/CSS overlaid on top of the canvas (HP bars, character select, menus)
- **Voices:** ElevenLabs Text-to-Speech API (REST, called client-side)
- **No backend required** — pure static web app, `index.html` + JS files

---

## Characters

### Playable

| Name   | Color  | Weapon         | Speed    | Special Move     | Special Description                        |
|--------|--------|----------------|----------|------------------|--------------------------------------------|
| Rico   | Blue   | Dual swords    | Medium   | Shadow Slash     | Dashes forward delivering a blade combo    |
| Razz   | Red    | Twin sai       | Fast     | Rage Rush        | Rapid jab flurry, fastest attack in game   |
| Munchy | Orange | Nunchucks      | Medium   | Pizza Time       | Throws a pizza slice projectile            |
| Dex    | Purple | Bo staff       | Slow     | Static Shock     | Staff ground slam that stuns opponent      |

### Munchy "Pizza Time" Random Trigger
Every 8–15 seconds during a match (random interval), Munchy's ElevenLabs voice fires "IT'S PIZZA TIME!" regardless of what's happening in the fight. This is always audible.

### NPCs

| Name          | Role         | Description                                                         |
|---------------|--------------|---------------------------------------------------------------------|
| Master Boomer | Kangaroo sensei | Appears on the intro/title screen and character select. Gives pre-fight wisdom lines. |
| Slicer        | Villain       | Blade-covered crime lord. Appears in win/loss screens with taunts. Future: playable boss. |

---

## Game Screens

### 1. Title Screen
- Game logo: "NINJA RACCOONS"
- Master Boomer sprite with a random wisdom quote
- "Press Any Key to Start"

### 2. Character Select Screen
- Both players select their raccoon (Player 1 left panel, Player 2 right panel)
- Show character name, color, weapon, special name
- Players can pick the same character (different color tint to distinguish)
- "FIGHT!" button once both players confirm

### 3. Fight Screen
- Phaser canvas: two raccoon sprites on a city rooftop background
- HP bars at top (Player 1 left, Player 2 right) — HTML overlay
- Round timer (60 seconds) — HTML overlay
- Character name labels under each HP bar
- Special move meter (fills as you deal/take damage)
- When special is ready: "SPECIAL READY" flash

### 4. Win/Loss Screen
- Winner raccoon does a victory pose
- Slicer appears in corner with a taunt if a round was close (< 20% HP difference)
- "Play Again" / "Change Characters" buttons

---

## Controls

### Player 1 (left side)
| Key | Action       |
|-----|--------------|
| A   | Move left    |
| D   | Move right   |
| W   | Jump         |
| S   | Block        |
| G   | Light attack |
| H   | Heavy attack |
| T   | Special move |

### Player 2 (right side)
| Key  | Action       |
|------|--------------|
| ←    | Move left    |
| →    | Move right   |
| ↑    | Jump         |
| ↓    | Block        |
| L    | Light attack |
| ;    | Heavy attack |
| '    | Special move |

---

## Combat Mechanics

- **HP:** Each player starts at 100 HP
- **Light attack:** 5 damage, fast
- **Heavy attack:** 12 damage, slower, knocks back
- **Block:** Reduces incoming damage by 70%
- **Special move:** 20–25 damage, unique per character, costs full special meter
- **Special meter:** Starts at 0, fills by 10% per hit dealt or received, maxes at 100%
- **Round end:** First to 0 HP loses. Best of 3 rounds. Win screen shown after the match winner is determined (2 round wins), not after each individual round.
- **Timeout:** If timer hits 0, player with more HP wins the round

---

## ElevenLabs Voice Integration

Each character has a dedicated ElevenLabs voice ID stored in a config object.

### Voice trigger events
| Event                        | Who speaks       | Line example                              |
|------------------------------|------------------|-------------------------------------------|
| Match start                  | Both characters  | Character-specific intro taunt            |
| Special move activated       | Attacker         | Special move call-out                     |
| Taking heavy damage          | Defender         | Pain/reaction line                        |
| Winning a round              | Winner           | Victory taunt                             |
| Munchy random timer (8–15s)  | Munchy only      | "IT'S PIZZA TIME!"                        |
| Slicer taunt (close match)   | Slicer           | "You call that fighting?"                  |

### Voice lines per character

**Rico (Blue)**
- Intro: "We fight as one."
- Special: "Shadow Slash!"
- Hit: "Tch."
- Win: "Discipline wins every time."

**Razz (Red)**
- Intro: "You wanna go?! COME ON!"
- Special: "RAGE RUSH!"
- Hit: "That's IT, you're DEAD!"
- Win: "Yeah! YEAH! THAT'S WHAT I'M TALKING ABOUT!"

**Munchy (Orange)**
- Intro: "Dude... can we fight after I finish this slice?"
- Special: "PIZZA TIIIIME!"
- Hit: "Ow... worth it."
- Win: "Victory tastes like pepperoni."
- Random: "IT'S PIZZA TIME!" (fires every 8–15s)

**Dex (Purple)**
- Intro: "Statistically, you never had a chance."
- Special: "Static Shock — initiated."
- Hit: "Fascinating. That hurt."
- Win: "As calculated."

**Master Boomer (title screen)**
- Random wisdom lines: "A raccoon who rushes in... gets hit first.", "Patience, young dumpster diver.", "The trash heap of life holds many treasures."

**Slicer (win screen taunt)**
- "You call that fighting?"
- "Pathetic. Even for raccoons."
- "Next time I won't hold back."

### API implementation
- Voice calls are async, non-blocking — fire and forget
- Cache audio blobs per line to avoid repeat API calls
- Store API key in `config.js` as `ELEVENLABS_API_KEY` — this is a static app with no build step, so `.env` is not used. Add `config.js` to `.gitignore` to avoid committing the key.

---

## File Structure

```
/
├── index.html              # Entry point, loads Phaser + game
├── .env                    # ElevenLabs API key (not committed)
├── config.js               # Character data, voice IDs, API key ref
├── game/
│   ├── scenes/
│   │   ├── TitleScene.js
│   │   ├── CharacterSelectScene.js
│   │   ├── FightScene.js
│   │   └── WinScene.js
│   ├── entities/
│   │   ├── Fighter.js      # Base fighter class
│   │   └── characters/
│   │       ├── Rico.js
│   │       ├── Razz.js
│   │       ├── Munchy.js
│   │       └── Dex.js
│   └── systems/
│       ├── VoiceSystem.js  # ElevenLabs integration
│       └── CombatSystem.js # Damage, block, special meter
├── ui/
│   ├── hud.html            # HP bar + timer overlay (injected into DOM)
│   └── hud.css
└── assets/
    ├── sprites/            # Character sprite sheets (placeholder PNGs to start)
    └── backgrounds/        # Fight stage backgrounds
```

---

## MVP Scope

Included:
- All 4 raccoons playable with distinct stats and specials
- 1v1 keyboard fighting with HP bars, rounds, timer
- Character select screen
- ElevenLabs voices for all trigger events
- Munchy random pizza timer
- Master Boomer on title screen
- Slicer win screen taunt

Not in MVP (future):
- Slicer as playable character
- Online multiplayer
- More stages
- Mobile/gamepad controls
