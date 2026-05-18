# Castle Man Battles — Game Design Document

## Overview
A 2D pixel-art multiplayer game with two modes: **Battle** (PvP) and **Zombie Defense**.

---

## Files
```
castle-man-battles/
  index.html          — page shell, canvas, UI chrome
  game.js             — all game logic, classes, loop
  CASTLE_MAN_BATTLES.md — this file
```

---

## Controls

| Action   | Player 1 (Blue) | Player 2 (Red) |
|----------|-----------------|----------------|
| Move     | A / D           | ← / →          |
| Jump     | W               | ↑              |
| Attack   | F               | /              |
| Block    | G               | .              |
| Pause    | ESC             | ESC            |

---

## Battle Mode

### Goal
Destroy the opponent's castle **or** have the highest score when the **15-minute timer** expires.

### Map Layout
```
[RED CASTLE]  ~~platforms~~  [MIDDLE SANDPIT]  ~~platforms~~  [BLUE CASTLE]
```
- Each castle has interior parkour platforms (3 levels)
- Center area has 3 floating platforms
- 6 chests scattered across the map

### Weapons
| Weapon   | Type      | Damage | Ammo | Cooldown |
|----------|-----------|--------|------|----------|
| Sword    | Melee     | 25     | ∞    | 500ms    |
| Pistol   | Ranged    | 20     | 30   | 600ms    |
| SMG      | Ranged    | 10     | 90   | 150ms    |
| Shotgun  | Ranged    | 40     | 24   | 900ms    |
| Launcher | Explosive | 80     | 5    | 1500ms   |

- Players **start with a sword**
- Weapons can damage **own castle blocks**
- Blocking reduces damage to **30%**

### Plane + Crate Drops
- A plane flies across every 30–50 seconds
- Drops a **parachute crate** mid-map
- Crate contains a random gun (SMG / Shotgun / Pistol / Launcher)

### Chests
- Walk into a chest to open it
- Contains a random weapon
- One-time use

### Scoring
- Kill opponent: **+100 pts**
- Castle block destroyed (opponent's): **+5 pts**

### Win Conditions
1. Opponent's castle fully destroyed → instant win
2. Timer reaches 0 → highest score wins
3. Tie → draw screen

---

## Zombie Mode

### Goal
Survive as long as possible. Defend your castle against zombie waves.

### Map Layout
```
[CASTLE — left side]  ~~open ground~~  [ZOMBIE SPAWN — right side]
```

### Zombie Behavior
- Walk toward the castle at constant speed
- Attack blocks and players on contact (15 dmg / 800ms)
- 3 spawn at game start; 3 more respawn every 3 seconds
- Killing a zombie drops a **random gun**

### Poison Ball Attack (every 30 seconds)
- 5-second **WARNING** banner flashes green on screen
- 3 poison balls are lobbed at the castle (25 dmg each, 20 dmg to players)

### Player Rules
- Start with a **sword**
- Die → respawn after 3 seconds with a **sword**
- Pick up gun by walking over a zombie drop

### 1 Player vs 2 Player
Selected on the zombie mode lobby screen before the game starts.

---

## UI Elements

### Top Bar (both modes)
- **Battle:** Timer (15:00 countdown) | Blue score | Red score
- **Zombie:** Survival timer | Zombies killed | Castle HP bar | Poison timer bar

### Bottom Bar
- Player 1 key legend (blue box, bottom-left)
- Player 2 key legend (red box, bottom-right)

### Pause Menu (ESC or ≡ button)
- Resume
- Restart
- Main Menu

### Game Over Screen
- Winner / "Game Over" message
- Final scores / survival time
- Play Again | Main Menu

---

## Pixel Art Palette
| Element        | Color     |
|----------------|-----------|
| Blue player    | `#4488ff` |
| Red player     | `#ff4444` |
| Zombie         | `#44aa44` |
| Castle stone   | `#778899` |
| Ground grass   | `#4a7a2a` |
| Sky (top)      | `#0d1b2a` |
| Chest          | `#8B4513` |
| Crate          | `#8B6914` |
| Poison ball    | `#44ff44` |
| Explosion      | `#ff6600` |
