# GoofyHouse — Exterior Edit Mode Design Spec

**Date:** 2026-03-29
**Type:** Feature expansion — exterior environment
**Status:** Approved

---

## Overview

Adds an exterior edit mode triggered by `V` key that pulls the camera back to show the full house and yard. Players can place exterior objects (pine trees, flower beds, lampposts, mailbox), customize the rooftop style and color, and see a pre-built starter yard with grass and a path. The house preview models on the selection screen are updated to show 2-3 story height.

---

## 1. Camera & Mode System

### Edit Mode State
Add to Zustand store:
```js
editMode: 'interior',   // 'interior' | 'exterior'
roofStyle: 'flat',      // 'flat' | 'pitched' | 'gabled'
roofColor: '#555555',
exteriorItems: [],      // [{ id, type, position, rotation }]
addExteriorItem: (type, position, rotation) => ...,
removeExteriorItem: (id) => ...,
setRoofStyle: (style) => ...,
setRoofColor: (color) => ...,
setEditMode: (mode) => ...,
```

### V Key Behavior
- `V` now cycles: `interior third-person` → `exterior overhead` → `interior first-person` → back
- In `exterior` mode: camera moves to `[0, 30, 20]` looking at `[0, 0, 0]` (isometric overhead of whole house + yard)
- Interior character, furniture, and floor are hidden in exterior mode
- Exterior yard, house shell, rooftop, and placed exterior items are always rendered

### Scene Structure
- Single R3F canvas (Option 2 — same scene, camera shift)
- Interior geometry group and exterior geometry group both live in the scene
- `visible` prop toggled based on `editMode`:
  - `editMode === 'interior'` → interior group visible, exterior yard hidden
  - `editMode === 'exterior'` → exterior yard visible, interior group hidden
  - House shell (walls exterior) always visible

---

## 2. Starter Yard

Pre-placed when house is first selected, not editable (decorative only):

- **Ground plane:** 30×30 flat green surface surrounding the house
- **Path:** A 1-unit wide grey box strip from house front door to the yard edge (z: 5 → z: 14)
- **Grass patches:** 6 pre-placed dark green square patches scattered on the ground plane (not removable)
- **Fence:** Low box-geometry fence running along yard perimeter (optional decorative border)

The starter yard renders at `y = -0.05` (just below floor level) to avoid z-fighting with the house floor.

---

## 3. Exterior Inventory & Placement

### Exterior Inventory Panel
- Separate panel from interior inventory
- Only visible in `exterior` mode
- Shows 4 placeable exterior items + rooftop picker

### Placeable Exterior Items
| Item | Model Description |
|---|---|
| Pine Tree | Green cone (foliage) + brown cylinder (trunk), 3 size layers |
| Flower Bed | Flat brown rectangle + small colored spheres on top |
| Lamppost | Tall cylinder pole + box lamp head + point light |
| Mailbox | Box body on cylinder post, small flag detail |

### Exterior Placement
- Same ghost + grid snap system as interior furniture
- Placement surface: exterior ground plane (`y = 0` outside house bounds)
- Items cannot be placed inside the house footprint
- `exteriorItems` in store (separate from `placedItems` which is interior-only)
- Hover + click to pick up and reposition (same as interior items)

---

## 4. Rooftop Customization

### Roof Picker UI
- Shown at top of exterior inventory panel
- Style selector (3 buttons with labels):
  - **Flat** — box slab sitting on top of walls
  - **Pitched** — two angled panels meeting at a ridge
  - **Gabled** — pitched with triangular end faces
- Color picker: 8 swatches (Dark Grey, Red, Brown, Black, Green, Blue, Terracotta, White)
- Changes apply immediately to the live roof geometry

### Roof Component
- `Roof.jsx` — receives `style` and `color` props from store
- Renders different geometry based on style:
  - `flat`: single `BoxGeometry` slab
  - `pitched`: two rotated `BoxGeometry` panels meeting at ridge
  - `gabled`: pitched panels + two `BoxGeometry` triangular end caps
- Positioned at `y = 3` (top of house walls)
- Always visible (renders in both interior and exterior modes, from outside only)

---

## 5. House Selection Screen Update

All 3 house preview models updated to show 2-3 story height:

| House | Update |
|---|---|
| Modern | Body height doubled (2 floors), flat roof slab raised accordingly |
| Classic | Body height doubled, pitched roof raised, chimney taller |
| Cozy | Body height ×1.5 (shorter 2-floor look), roof raised |

Selection screen camera: `position: [0, 7, 16]` (pulled back from original `[0, 5, 12]`) to accommodate taller models.

---

## 6. Controls in Exterior Mode

| Key/Action | Behavior |
|---|---|
| `V` | Cycle edit modes (interior ↔ exterior ↔ first-person) |
| `E` | Open/close exterior inventory |
| Click item in inventory | Activate ghost placement on ground |
| `R` | Rotate held exterior item 90° |
| `Escape` | Cancel placement |
| Click placed item | Pick up to reposition |

WASD character movement disabled in exterior mode (character is hidden).

---

## Out of Scope
- Animated trees (wind sway)
- Weather effects
- Multiple yard presets
- Exterior lighting beyond lamppost item
- Garage or additional structures
