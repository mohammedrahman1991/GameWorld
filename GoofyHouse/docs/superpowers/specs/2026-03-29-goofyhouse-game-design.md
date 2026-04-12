# GoofyHouse — Game Design Spec

**Date:** 2026-03-29
**Type:** Browser game (Sims-style)
**Status:** Approved

---

## Overview

GoofyHouse is a browser-based Sims-style game where the player selects a pre-built house from a 3D selection screen, then walks around and furnishes it using a drag-and-drop inventory system. The game runs entirely in the browser with no install required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App shell & UI | React (Vite) |
| 3D rendering | @react-three/fiber (R3F) |
| 3D helpers | @react-three/drei |
| Global state | Zustand |
| 3D models | Procedural geometry (Three.js primitives — no external model files) |

---

## Project Structure

```
src/
  screens/
    HouseSelect.jsx        # Front screen with 3 rotating houses
    GameScreen.jsx         # Main game scene
  components/
    houses/
      ModernHouse.jsx      # Flat roof, grey/white, large windows
      ClassicHouse.jsx     # Pitched roof, chimney, brick, porch
      CozyHouse.jsx        # Cottage, round windows, wooden, flower boxes
    character/
      Character.jsx        # Third-person low-poly humanoid
      FirstPersonHand.jsx  # Right hand visible in first-person mode
    inventory/
      InventoryPanel.jsx   # React UI overlay, slides in from right
      FurnitureItem.jsx    # Single inventory item (icon + name)
    furniture/
      Chair.jsx
      Light.jsx
      Clock.jsx
      Plant.jsx
      Fridge.jsx
      Fan.jsx
      Painting.jsx
  store/
    useGameStore.js        # Zustand: selected house, inventory, placed items, camera mode
  App.jsx
```

---

## Screen 1 — House Selection

**Camera:** Fixed isometric angle. No player control.

**Layout:** Three houses displayed side-by-side on pedestals, slowly auto-rotating.

**Houses:**
- **Modern** — flat roof, large windows, clean geometric shapes, grey/white palette
- **Classic** — pitched roof, chimney, warm brick colors, porch with columns
- **Cozy** — small cottage, round windows, wooden textures, flower boxes

**Interactions:**
- Hover → house lifts slightly + glow outline
- Click → zoom-in transition animation → loads GameScreen with selected house

---

## Screen 2 — Game Screen

### Layout
Full-screen R3F canvas. React UI panels (inventory, mode toggle button) overlaid on top using absolute positioning.

### Camera Modes (toggle with `V` key or UI button)

| Mode | Description |
|---|---|
| **Third-person (default)** | Isometric fixed angle, follows character from above-behind. Used for walking and placing furniture. |
| **First-person** | Camera at character head position. Right hand model in bottom-right. Used for immersive viewing. |

### Controls

| Key | Action |
|---|---|
| `W A S D` | Move character |
| `V` | Toggle camera mode (third ↔ first person) |
| `E` | Open / close inventory |
| `R` | Rotate held furniture item 90° |
| `Escape` | Cancel placement / drop item |

### The House
Pre-built rooms (walls, floors, ceilings) loaded based on selected house style. Starts empty of furniture — player fills it in. Built from Three.js geometry primitives.

### Lighting
Ambient light + directional sunlight. Shadows cast by furniture and character.

---

## Character

### Third-Person
- Low-poly humanoid built from boxes/cylinders (no external model)
- Idle: slight body bob animation
- Walking: arm and leg swing animation via R3F useFrame loop
- Rotates to face direction of travel
- Bounding box collision with walls and placed furniture

### First-Person Hand
- Appears when camera mode is first-person
- Simple blocky right arm/fist model, fixed to bottom-right of screen
- Slight bob animation when character is moving
- No interactive function — purely for immersion

---

## Inventory & Furniture Placement

### Inventory Panel (React UI)
- Slides in from the right edge when `E` is pressed
- Grid layout showing 7 furniture items with icon and name:
  - Chair, Light, Clock, Plant, Fridge, Fan, Painting
- Click an item → ghost preview attaches to cursor, inventory closes

### Placement Flow
1. Click item in inventory → translucent ghost version follows mouse over the floor
2. Ghost snaps to floor grid (like Sims)
   - **Green** — valid placement
   - **Red** — blocked (wall, another item)
3. `R` key → rotate ghost 90°
4. Click floor → item placed permanently, turns solid
5. `Escape` → cancel, item returns to inventory

### Moving Placed Items
1. Hover over placed item → highlight outline appears
2. Click and drag → item lifts back into ghost mode
3. Drop on new valid spot, or press `Escape` to return to original position

### Furniture Models
All built from Three.js primitives (BoxGeometry, CylinderGeometry, etc.). No external `.glb` or `.obj` files required.

| Item | Rough Shape Description |
|---|---|
| Chair | Box seat + 4 cylinder legs + box back |
| Light | Cylinder pole + cone shade |
| Clock | Thin cylinder face + box hands |
| Plant | Cylinder pot + sphere foliage |
| Fridge | Tall box with door line detail |
| Fan | Cylinder base + flat box blades (animated rotation) |
| Painting | Flat box frame + colored box canvas |

---

## State (Zustand Store)

```js
{
  selectedHouse: null | 'modern' | 'classic' | 'cozy',
  cameraMode: 'third' | 'first',
  inventoryOpen: boolean,
  placedItems: [{ id, type, position, rotation }],
  heldItem: null | { type },
}
```

---

## Out of Scope (not in this version)
- Saving/loading game state
- Multiple characters / NPCs
- Sound effects or music
- Mobile / touch support
- Removing placed items (only moving is supported)
