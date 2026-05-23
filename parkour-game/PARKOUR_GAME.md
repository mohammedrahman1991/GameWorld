# Parkour 2.0 — Game Design Document

## Overview
Side-scrolling parkour runner. White ragdoll character stumbles through a mountain landscape.  
Run, jump (very high, defying gravity), slide under narrow ceilings, dodge spikes, ride rolling trucks, collect coins.

---

## Files
```
parkour-game/
  index.html        — HTML shell, CSS, HUD, buttons
  game.js           — All game logic (Canvas 2D, Web Audio)
  PARKOUR_GAME.md   — This file
```

---

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Jump | Space / ↑ / W | JUMP button |
| Slide | ↓ / S | SLIDE button |
| Move left | ← / A | D-pad ◀ |
| Move right | → / D | D-pad ▶ |
| Super Jump | Slide → Jump (within 300ms) | SLIDE then JUMP |

---

## Game Feel

| Feature | Detail |
|---------|--------|
| Jump height | Very high — defying gravity. Lower gravity on ascent (GRAV_UP=0.28), normal on descent (GRAV=0.64) |
| Hair flop | Hair strands spring UP dramatically on jump, gravity pulls down on land |
| Stumble run | Body tilts on leg phase, arms flail in air |
| Dust | Spawns on: jump, land, brake, crash, death |
| Brake sound | Screech + dust burst when pressing left after running right |
| Win notes | Ascending 3-note jingle plays on every jump |
| Whoosh | Low-frequency sweep on jump |
| Step sounds | Soft tap every 0.22s while running |
| Mouth open | Character opens mouth wide while airborne |

---

## Death System (Slow Motion)

1. **Hit spike / fall / lowbar** → `deathPhase=1`
2. **Phase 1 (1.8s)**: `timeScale` drops to 0.10, vignette expands from edges (dark borders grow), red tint
3. **Phase 2 (0.45s)**: Fade to black
4. **Phase 3**: Respawn at last checkpoint, fade in, `timeScale` returns to 1

---

## Obstacles

| Type | How to pass | Death on fail |
|------|-------------|---------------|
| Wooden wall | JUMP over | Crash (stumble back) |
| Metal low bar | SLIDE under | Crash |
| Spike strip | JUMP over | Slow-motion spike death |
| Narrow passage | SLIDE through | Slow-motion head hit |
| Spinner blade | JUMP past | Slow-motion death |
| Rolling wooden truck | Jump ON, ride, jump OFF | Fall to spikes below |
| Moving platform | Stand on it (it launches up) | Flung off = crash |
| Bomb | Walk into it to push | Explosion |

---

## Truck Mechanic
- Wooden crate on wheels rolls LEFT across a spike pit at ~55–90 px/s
- Player must: **jump onto truck top → ride → time jump OFF** before it exits the pit
- Arrow indicator shows above truck while player is riding
- Truck plays rolling sound as it approaches
- If player is still on truck when it rolls off-screen left: no explicit death (truck despawns)
- If player falls onto spikes directly: slow-motion spike death

---

## Checkpoints
- Spawn every ~1700 world units
- Red flag turns gold when reached
- On death: respawn at last reached checkpoint (world rewinds, nearby entities preserved)
- Sound: double-note jingle on touch

---

## Background Layers (Parallax)

| Layer | Scroll rate | Content |
|-------|-------------|---------|
| Sky | 0 | Blue gradient |
| Clouds | 0.032x | Puffy clouds + sun glow |
| Mountains | 0.055x | Snowy peaks (like screenshots) |
| Forest | 0.18x | Dark tree silhouette row |
| Props | 1x | Trees, lamps, fences, poles, bushes |
| Ground | 1x | Brown dirt with texture dots |

---

## HUD
- **Top-left**: 💰 coin count
- **Top-right**: Stick figure face · 3 heart dots (lives) · #level · ⏸ pause
- **Centre hint**: fades in "SLIDE ↓", "JUMP ON TRUCK!", "✓ CHECKPOINT"
- **Vignette overlay**: expands from edges on death, red tint pulse

---

## Audio (Web Audio API — no files)

| Event | Sound |
|-------|-------|
| Jump | Ascending whoosh + win notes (3-note jingle) |
| Super jump | Power-up chord + noise burst |
| Land | Soft thump |
| Slide | Low sawtooth sweep |
| Crash | Descending boing + noise + tumble |
| Spike death | Cartoon pain: descending wail + low rumble |
| Brake | Screech + dust |
| Coin | High ding-ding |
| Checkpoint | 2-note chime |
| Respawn | 3-note rising tones |
| Truck | Rumble tap every 0.16s |
| Loop enter | 2-note sweep |
| Win | 5-note fanfare |
| Music | Funky synth loop at 118 BPM (kick, snare, hi-hat, bass) |

---

## Level Structure
- Each level: ~10 000 world units, ends at loop-de-loop + goal post
- Speed starts at 5.5, ramps to max 15
- Obstacles spawn every 260–590 world units with random type distribution
- Coin arcs follow every obstacle cluster

---

## Character Design (matches Playhop original)
- White rounded stick figure with 4 hair strands
- Black dot eyes, white highlight dots
- Rounded torso (bezier curves), hand circles
- X-eyes + tear drop on crash
- Shadow/lighter right limbs for depth
- Stars orbit head during crash animation
