# Fight Arrows — Game Design Document

## Overview
Side-scrolling archery battle. Two archers face off on a platform — fire arrows, deflect them off birds, first to 5 kills wins.

---

## Files
```
fight-arrows/
  index.html        — HTML shell, overlays (start, map select, game over), CSS
  game.js           — All game logic (Canvas 2D)
  FIGHT_ARROWS.md   — This file
```

---

## Game Modes

| Mode | Description |
|------|-------------|
| 1 Player | Player 1 vs Bot AI |
| 2 Player | Player 1 vs Player 2 |

---

## Controls

| Player | Action | Key |
|--------|--------|-----|
| P1 | Shoot arrow | W |
| P2 / Bot | Shoot arrow | ↑ (Up Arrow) |

---

## Scoring
- First to **5 kills** wins the round
- Score shown at top center of screen
- Win screen shows winner with replay option

---

## Arrows
- Unlimited arrows
- Fire from archer's bow at a slight upward angle
- Arrows travel in an arc (gravity applied)
- Arrow hits enemy → enemy dies → point scored
- Arrow hits bird → arrow **redirects toward enemy**
- Arrows despawn after 4 seconds or on hitting a wall

---

## Birds
- Spawn every **3 seconds** at random height on one side of the screen
- Fly horizontally across the screen
- Hit by arrow → bird disappears, arrow redirects toward the nearest enemy
- Visual: simple cartoon bird shape

---

## Maps (3)

| Map | Background | Ground | Details |
|-----|-----------|--------|---------|
| Snowy | Blue-grey sky, falling snowflakes | White snowy ground | Snow particles, mountains |
| Desert | Orange sky, sun | Sandy ground | Cacti, heat shimmer |
| Jungle | Deep green | Grass/earth ground | Trees, vines, leaves |

---

## Archers

| Property | Detail |
|----------|--------|
| Shape | Pixel-art stickman with bow |
| Health | 1 hit = death → respawn after 1.5s |
| Position | P1 on left, P2/Bot on right |
| Facing | Always faces the opponent |

---

## Bot AI (1P Mode)
- Shoots at player with ~1.2 second delay between shots
- Adds slight random vertical offset to simulate imperfect aim
- Harder difficulty as player score increases

---

## HUD

| Element | Location |
|---------|----------|
| P1 Score | Top left |
| P2/Bot Score | Top right |
| Score divider "FIGHT ARROWS" | Top center |
| Map name | Bottom left (small) |

---

## Screens

### Start Screen
- Title "FIGHT ARROWS" at top
- "1 PLAYER" button
- "2 PLAYER" button

### Map Select Screen
- 3 map options shown as colored cards
- Click to select, then Play

### Game Over Screen
- Winner announcement
- "Play Again" and "Home" buttons
