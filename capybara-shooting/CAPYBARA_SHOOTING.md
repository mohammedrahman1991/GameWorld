# Capybara Shooting

## Overview
2-player local multiplayer platformer shooter. Two capybaras battle it out on rooftop platforms
in a sepia post-apocalyptic city. Last capybara standing wins.

## Screens
1. **Title / Lobby** — Sepia city background, control panels (left P1, right P2), hat selection grids,
   red center pole, capybara booths at bottom, PLAY button
2. **Game** — Platform arena with same city backdrop, 2 capybaras shooting
3. **Game Over** — Winner display, play again / back to menu

## Controls
| Action | P1 Key | P2 Key |
|--------|--------|--------|
| JUMP   | W      | ↑      |
| DOWN   | S      | ↓      |
| LEFT   | A      | ←      |
| RIGHT  | D      | →      |
| USE    | E      | L      |
| SHOT   | R      | K      |

## Hat Stand (Title Screen)
Each player gets a 6×4 hat grid on the title screen.
- Click a hat slot to equip it for that player
- First slot = no hat
- Hats are cosmetic only
- Hat selection is remembered across rounds

## Hats Available
1. None (empty slot)
2. Cowboy Hat
3. Top Hat
4. Red Fedora
5. Blue Cap
6. Wizard Hat
7. Party Hat
8. Crown
9. Propeller Hat
10. Army Helmet
11. Chef Hat
12. Pirate Hat
13+ Locked (grey slots)

## Gameplay
- 5 HP per player (shown as colored squares)
- Shoot bullets — hits deal 1 HP damage
- Jump between platforms to dodge
- Short invincibility after being hit
- Auto-face toward opponent when not moving
- First to reduce opponent to 0 HP wins

## Arena Platforms
```
        [upper-left]           [upper-right]
   [left-mid]    [center-high]    [right-mid]
[far-left]                          [far-right]
[===================GROUND===================]
```

## File Structure
```
capybara-shooting/
  CAPYBARA_SHOOTING.md
  index.html
  game.js
```
