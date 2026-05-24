# BrainCrate — Game Design Document

## Overview
A timed memory training game. A crate opens revealing 10–30 everyday items.
The player has 30 seconds to memorize everything inside. The crate then slams
shut — and the player must recall as many items as possible by typing their names.

---

## Files
```
memory-box/
  index.html     — HTML shell, all screens, CSS
  game.js        — All game logic
  BRAINCRATE.md  — This file
```

---

## Game Name
**BrainCrate** — *"Open the crate. Memorize the contents. Recall them all."*

---

## Item Categories (70 items total)

| Category | Example items |
|----------|--------------|
| Electronics & Power | Battery, Flashlight, Light Bulb, Phone, Radio, Charger, Watch, Camera |
| Tools & Hardware | Wrench, Hammer, Screwdriver, Scissors, Ruler, Magnet, Bolt, Ladder |
| Household Essentials | Soap, Toothbrush, Candle, Key, Broom, Sponge, Bucket, Fire Extinguisher |
| Gas & Chemicals | Flask, Test Tube, Gas Canister, Spray Can, Lighter, Propane Bottle |
| Medical & Safety | Bandage, Pill, Thermometer, Stethoscope, Hard Hat, Safety Vest, Syringe |
| Stationery & Office | Pencil, Pen, Paper Clip, Thumbtack, Ruler, Notebook, Folder |
| Survival & Food | Canned Food, Chocolate Bar, Peanuts, Juice Box, Water Bottle, Candy |
| Gear & Clothing | Gloves, Scarf, Backpack, Cap, Boot, Suitcase |

---

## Levels (10 total)

| Level | Items | Memorize Time | Label |
|-------|-------|--------------|-------|
| 1 | 10 | 30s | Starter |
| 2 | 12 | 30s | Beginner |
| 3 | 14 | 28s | Easy |
| 4 | 16 | 26s | Normal |
| 5 | 18 | 25s | Normal |
| 6 | 20 | 24s | Normal |
| 7 | 22 | 22s | Hard |
| 8 | 25 | 20s | Hard |
| 9 | 28 | 20s | Expert |
| 10 | 30 | 18s | Master |

Recall phase timer: **90 seconds** (consistent across all levels)

---

## Game Flow

```
Start Screen → Memorize Phase → Box Close Animation → Recall Phase → Results
      ↑                                                                  |
      └──────────────────────── Retry / Next Level ────────────────────┘
```

### Phase 1: Memorize
- Crate "opens" with animation
- Items revealed with staggered fade-in
- Circular countdown ring timer (gold color, turns red < 10s)
- Items show emoji + name label

### Phase 2: Box Close
- Lid slams down with "CLOSED!" flash
- 1.5 second transition to recall screen

### Phase 3: Recall
- Input field — type item names, press Enter
- Suggestions appear as player types (spelling help, from full item pool)
- Correct items appear as green chips below input
- Progress: X / Y found counter
- 90-second countdown bar at top
- "I'm done" button to skip to results early

### Phase 4: Results
- Stars (⭐ ⭐⭐ ⭐⭐⭐) based on accuracy
- Score = found × 10 × level multiplier
- Green (found) / Red (missed) item review grid
- Next Level / Retry / Home buttons

---

## Scoring

| Condition | Stars |
|-----------|-------|
| ≥ 90% accuracy | ⭐⭐⭐ |
| ≥ 70% accuracy | ⭐⭐⭐ |
| ≥ 50% accuracy | ⭐⭐ |
| ≥ 30% accuracy | ⭐ |
| < 30% accuracy | (no stars) |

Score = `itemsFound × 10 × (1 + level × 0.1)`

---

## Fuzzy Matching Rules
Player input is matched against items using:
1. **Exact match** (case-insensitive)
2. **Starts-with match** (min 3 chars typed)
3. **Contains match** (min 4 chars, typed text found inside item name)
4. **First-word match** (first word of multi-word item name, min 4 chars)

---

## Visual Design

| Element | Color / Style |
|---------|--------------|
| Background | `#0d0d1a` dark purple |
| Crate | Brown wood gradient with plank lines |
| Timer ring | Gold → Red (urgent) |
| Correct | `#22c55e` green chips |
| Missed | `#ef4444` red in results |
| Score | `#f59e0b` amber/gold |

---

## Difficulty Quick Select

| Button | Levels |
|--------|--------|
| 🟢 Easy | Level 1–3 |
| 🟡 Medium | Level 4–6 |
| 🔴 Hard | Level 7–10 |
