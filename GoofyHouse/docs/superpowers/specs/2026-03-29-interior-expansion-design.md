# GoofyHouse — Interior Expansion Design Spec

**Date:** 2026-03-29
**Type:** Feature expansion — interior systems
**Status:** Approved

---

## Overview

Expands the GoofyHouse interior with 3 playable floors, a shopkeeper NPC on the 3rd floor, wall-mounted items (painting + clock), a paint-bucket floor covering tool, and a window system with placeable glass panes.

---

## 1. Multi-Floor System

### State
Add to Zustand store:
```js
currentFloor: 0,          // 0 = ground, 1 = 2nd, 2 = 3rd
setCurrentFloor: (n) => set({ currentFloor: n, characterPosition: [0, 0, 0] }),
floorTiles: {},           // { [floor]: { [x_z]: { material, color } } }
setFloorTile: (floor, x, z, material, color) => ...,
placedWindows: [],        // [{ wallId, houseType }] — which holes have glass
addWindow: (wallId, houseType) => ...,
removeWindow: (id) => ...,
```

`placedItems` gains a `floor` field: `{ id, type, position, rotation, floor, surface }`.

### Floors
- 3 floors: Ground (0), 2nd (1), 3rd (2)
- Only the active floor's interior geometry mounts in the scene at a time
- Character resets to `[0, 0, 0]` on floor change
- HUD shows `Floor 1 / 2 / 3`

### Staircase
- New placeable furniture item: `staircase`
- Placed on the floor like any other item
- When character's AABB overlaps the staircase: triggers floor transition
- Staircase facing direction determines up/down: facing `+Z` goes up, facing `-Z` goes down
- Two staircase items needed per floor (one up, one down)
- Floor 0 only has an "up" staircase; Floor 2 has a "down" staircase and the shop

---

## 2. 3rd Floor Shop

### Room Layout
- 3rd floor (`currentFloor === 2`) renders a pre-decorated shop room
- Shelves along back and side walls (decorative box geometry)
- Counter in the center-front of the room
- Shopkeeper NPC standing behind the counter

### Shopkeeper NPC
- Low-poly character (same style as player, different color: green shirt)
- Stationary — does not move
- Press `E` within 1.5 units → dialogue menu opens
- Dialogue menu (React overlay, centered):
  ```
  🛒 Shop
  ─────────────────
  [What do you sell?]   → shows 4 item buttons
  [Bye]                 → closes menu
  ```
- Item buttons in shop view:
  - 🧸 Toys
  - 🎒 Backpack
  - 🧹 Mop
  - 🧥 Jacket
- Clicking an item adds it to `heldItem` (player starts placing immediately), closes menu
- These 4 items are shop-exclusive — not in the base inventory panel

### Shop Item Models (procedural)
| Item | Shape |
|---|---|
| Toys | Small colorful box stack (3 colored cubes) |
| Backpack | Box body + two cylinder straps |
| Mop | Cylinder pole + flat disc head |
| Jacket | Box torso + two flat box arms |

---

## 3. Wall-Mounted Items

### Wall-Mounted Item Types
- **Painting** — existing item, moves to wall placement
- **Clock** — existing item, moves to wall placement

### Placement Logic
- Selecting Painting or Clock from inventory activates `wallPlacementMode`
- Raycaster targets wall mesh colliders instead of the floor plane
- Ghost item auto-snaps flush to wall surface at fixed height `y = 1.5`
- Wall normal determines item rotation (always faces into room)
- `placedItems` entry gets `surface: 'wall'` flag
- All other items remain floor-placed (`surface: 'floor'`)

### GhostItem update
- Check `WALL_MOUNTED_TYPES = ['painting', 'clock']`
- If type is in list → use wall raycasting
- If not → use floor raycasting (existing behavior)

---

## 4. Floor Coverings (Paint-Bucket Tool)

### UI
- New "Floor" tab added to InventoryPanel (alongside furniture list)
- Material picker: **Carpet / Tile / Wood / Concrete**
- Color swatches (6 per material):
  - Carpet: Red, Blue, Grey, Beige, Green, Dark Brown
  - Tile: White, Cream, Black, Terracotta, Blue, Grey
  - Wood: Light Oak, Dark Oak, Mahogany, Pine, Walnut, Ash
  - Concrete: Light Grey, Dark Grey, Charcoal, Sand, Off-White, Slate

### Behavior
- Selecting material + color sets `paintBucketMode: true` in store + stores `activeMaterial`, `activeColor`
- In paint mode: floor tiles (1×1 grid cells) highlight on hover
- Click → stores `{ material, color }` in `floorTiles[currentFloor][x_z]`
- Floor renders tiles from this map; unpainted tiles use house default color
- `Escape` exits paint mode
- Paint-bucket cursor shown as a small bucket icon overlay when active

---

## 5. Window System

### Window Holes
- Each house has **10 pre-defined window hole positions** in its walls
- Holes are 1×1 units, built by splitting wall geometry around the gap (multiple box segments per wall)
- Hole positions are defined per house style in a `WINDOW_HOLES` config:
  - Front wall: 3 holes
  - Back wall: 3 holes
  - Left wall: 2 holes
  - Right wall: 2 holes
- Holes appear on all floors (each floor's walls have the same 10 positions)

### Glass Item
- **Glass** added to base inventory panel
- Placement mode: ghost only snaps to window hole positions (not floor, not wall)
- Ghost turns green when over an empty hole, red when hole already filled
- Click → places a transparent blue pane (`opacity: 0.4, color: #7ec8e3`) filling the hole
- Click placed glass → removes it (same pick-up mechanic as furniture)
- `placedWindows` in store tracks which holes are filled per floor

### WINDOW_HOLES Config (per house type, same for all floors)
```js
// Position = center of hole in wall, normal = which wall
export const WINDOW_HOLES = {
  modern: [
    { id: 'f1', wall: 'front',  x: -2,   y: 1.5, z:  5 },
    { id: 'f2', wall: 'front',  x:  0,   y: 1.5, z:  5 },
    { id: 'f3', wall: 'front',  x:  2,   y: 1.5, z:  5 },
    { id: 'b1', wall: 'back',   x: -2,   y: 1.5, z: -5 },
    { id: 'b2', wall: 'back',   x:  0,   y: 1.5, z: -5 },
    { id: 'b3', wall: 'back',   x:  2,   y: 1.5, z: -5 },
    { id: 'l1', wall: 'left',   x: -5,   y: 1.5, z: -1.5 },
    { id: 'l2', wall: 'left',   x: -5,   y: 1.5, z:  1.5 },
    { id: 'r1', wall: 'right',  x:  5,   y: 1.5, z: -1.5 },
    { id: 'r2', wall: 'right',  x:  5,   y: 1.5, z:  1.5 },
  ],
  // classic and cozy follow same pattern with adjusted z bounds
}
```

---

## 6. House Selection Screen Update

- All 3 house preview models (Modern, Classic, Cozy) updated to show **2-3 story height**
- Modern: 2 stacked floors visible, flat roof on top
- Classic: 2 floors with pitched roof on top
- Cozy: 2 floors with rounded cottage roof
- Selection screen camera pulled back slightly to fit taller models

---

## New Inventory Items Summary

| Item | Source | Placement | Surface |
|---|---|---|---|
| Glass | Base inventory | Window holes only | Wall |
| Staircase | Base inventory | Floor grid | Floor |
| Toys | Shop (3rd floor) | Floor grid | Floor |
| Backpack | Shop (3rd floor) | Floor grid | Floor |
| Mop | Shop (3rd floor) | Floor grid | Floor |
| Jacket | Shop (3rd floor) | Floor grid | Floor |
| Painting | Base inventory | Wall snap | Wall |
| Clock | Base inventory | Wall snap | Wall |

---

## Out of Scope
- NPC dialogue beyond the simple menu
- Economy/currency system
- Saving floor tile data between sessions
- More than 3 floors
