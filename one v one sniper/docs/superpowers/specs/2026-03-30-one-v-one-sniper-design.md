# 1v1 Sniper Duel — Design Spec
_2026-03-30_

## Overview

A browser-based 1v1 sniper duel game built with HTML5 Canvas and vanilla JavaScript. Two players share one keyboard on one screen. The screen is split vertically — P1 on the left, P2 on the right. Each player sees a first-person-style 2D side-scrolling view. First player to win 3 rounds (best of 5) wins the match.

## Architecture

Single `index.html` with all game logic in one `game.js` file. No dependencies, no build step — open in any browser. Canvas renders both player viewports side by side.

**File structure:**
```
index.html
game.js
```

**game.js sections:**
1. Constants & weapon definitions
2. Game state (screens, rounds, players)
3. Input handling
4. Physics & movement
5. Shooting & hit detection
6. Aim assist logic
7. Rendering (split-screen, HUD, scope overlay)
8. Screen flow (weapon select → battle → win → rematch)

## Game Screens

### 1. Weapon Select
- Both players see weapon options side by side (P1 left, P2 right)
- 4 weapons listed with stat bars (speed, damage, aim assist)
- P1 navigates with W/S, confirms with F
- P2 navigates with Up/Down arrows, confirms with L
- Both must confirm before match starts
- Weapon select shown fresh at the start of every round

### 2. Battle
- Vertical split: P1 left half, P2 right half
- Each half renders the shared level from that player's perspective (same world, each viewport follows its own player)
- Round tracker shown at top center of each viewport (filled squares = wins, e.g. ██░ vs █░░)
- HUD per player: health hearts, weapon name, ammo count
- Players can move and jump; one kill ends the round

### 3. Win Screen
- Displayed after a player reaches 3 round wins
- Shows winner name, weapon used, round stats
- Options: Rematch (Enter) → back to weapon select, or Main Menu (Esc)

## Level Design

- Single shared 2D level, platformer layout
- Multiple platform heights (3–4 levels of elevation)
- Cover objects (crates, walls) on platforms and ground
- Level is wider than each viewport — camera follows each player independently within their half
- Players start on opposite sides of the level

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move left/right | A / D | Left / Right arrow |
| Jump | W | Up arrow |
| Scope (hold) | F | L |
| Fire (while scoped) | F (release or re-press) | L (release or re-press) |
| Weapon select navigate | W / S | Up / Down arrow |
| Weapon select confirm | F | L |

## Scope Mechanic

- Hold shoot key → circular scope overlay appears, screen goes black around it, scene zooms in (~3×)
- Mil-dot reticle inside scope circle
- Press shoot key again while scoped → fires
- Releasing without firing cancels the scope
- Can't move while scoped (committed aim)

## Weapons

| Weapon | Damage | Reload | Ammo | Aim Assist | Snap Radius |
|--------|--------|--------|------|------------|-------------|
| Scout | 34 hp | 0.8s | 10 | High | 30px |
| Krieg | 55 hp | 1.5s | 6 | Medium | 18px |
| AWP | 85 hp | 3.0s | 4 | Low | 8px |
| Deadeye 💀 | 100 hp (one shot) | 5.0s | 2 | None | 0px |

- Players start each round with 100 HP
- One shot from Deadeye = instant kill regardless of HP
- Ammo is finite; if depleted, player must wait for a slow reload of a single shot

## Aim Assist

- Only active while scoped
- Crosshair snaps toward enemy center if enemy is within the weapon's snap radius
- Snap is a soft pull (lerp), not instant teleport — feels like magnetism, not lock-on
- Deadeye has zero assist — pure manual aim required

## Pixel Characters

- Each player is a small pixel-art soldier (~16×32px rendered at 2–3× scale)
- P1: green color scheme
- P2: blue color scheme
- Animations: idle, run, jump, scope (crouch/aim pose), death
- Characters are visible to the opponent in their viewport (enemy shown at actual size in world)

## Round Flow

1. Weapon Select screen — both players pick, confirm
2. Battle starts — both players spawn on opposite sides, full HP
3. One player lands a hit that reduces opponent to 0 HP → round over
4. Brief "P1/P2 wins round!" flash (1.5s)
5. Back to Weapon Select for next round
6. First to 3 round wins → Win Screen

## HUD Elements (per viewport)

- Top corner: player label (P1 / P2) + heart icons (HP indicator, 3 hearts at 100 HP, hearts drain with damage)
- Bottom left: weapon name + ammo count
- Top center (shared): round win tracker (filled squares)

## Error / Edge Cases

- If a player runs out of ammo with no shots fired that round, they get a single emergency slow reload (6s)
- Both players can't fire simultaneously in the same frame — hit detection resolves both shots if they cross
- If both players reach 0 HP in the same frame, the round is a draw and replayed
