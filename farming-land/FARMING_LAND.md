# Farming Land — Game Design Document

## Concept
3D farming game built with Three.js. Walk your farmer around, plant seeds in
farm plots, wait for crops to grow, then harvest for coins. Spend coins on
better seeds from the Shop.

---

## Files
```
farming-land/
  index.html        — HTML shell + CSS UI overlay
  game.js           — Three.js 3D game logic
  FARMING_LAND.md   — this file
```

---

## Game Flow
```
Start (50 coins) → Open Shop → Buy Carrot Seeds →
Walk to Plot → Press E to Plant → Wait for Crop →
Press E to Harvest (+coins) → Buy Better Seeds → Repeat
```

---

## Controls
| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrow keys | D-pad buttons |
| Plant / Harvest | E | ACT button |
| Open / Close Shop | Q or SHOP button | SHOP button |
| Close Shop | Escape | ✕ button |

---

## Seed Types

| Seed | Cost | Grow Time | Harvest |
|------|------|-----------|---------|
| 🥕 Carrot Seeds | 50 | 8 s | 1,000 |
| 🥔 Potato Seeds | 150 | 15 s | 2,000 |
| 🌻 Sunflower Seeds | 300 | 25 s | 4,000 |
| ✨ Legendary Seeds | 500 | 40 s | 8,000 |
| 👑 OG Seeds | 2,000 | 90 s | 50,000 |

---

## Starting Conditions
- Coins: **50** (just enough for one Carrot Seed)
- Inventory: empty
- All 9 farm plots: empty

---

## Farm Layout
- 3 × 3 grid of soil plots inside a wooden fence
- Each plot has 4 states: `empty → planted → growing → ready`
- Walk within ~2.5 units of a plot and press E to interact
- Interact hint updates based on plot state:
  - Empty + has seeds → "Press E to Plant"
  - Empty + no seeds → "Press E to open Shop"
  - Growing → "Growing… ⏳"
  - Ready → "Press E to Harvest 🌾"

---

## Plant Visuals (3 growth stages)
| Stage | Progress | Appearance |
|-------|----------|-----------|
| 1 — Seedling | 0–30% | Small green stem |
| 2 — Growing | 30–70% | Taller stem + crop shape |
| 3 — Ready | 100% | Full plant, glowing crown, spinning |

Each seed type has a unique crown shape:
- Carrot → orange cone
- Potato → brown sphere
- Sunflower → yellow disk + brown center
- Legendary → glowing purple icosahedron
- OG → spinning golden octahedron

---

## 3D World
- Three.js WebGL renderer, antialias + shadow maps
- Sky: light blue fog + directional sun light
- Ground: large green plane with dirt path to farm
- Decorative trees ringing the area
- Red barn to the right
- Stone well to the left
- Wooden fence enclosing the farm
- Farm sign at the entrance

---

## Farmer Character
- Straw hat (yellow cylinder), skin head, white shirt
- Blue overalls, brown boots
- Legs and arms animate while walking
- Farmer rotates to face direction of movement

---

## Physics Constants
| Constant | Value |
|----------|-------|
| SPEED | 5 units/sec |
| Camera offset | (0, 14, 11) |
| Camera lerp | 0.08 |
| Plot interaction radius | 2.5 units |
