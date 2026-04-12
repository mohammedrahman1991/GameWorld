# Interior Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 playable floors, a 3rd-floor shopkeeper NPC with 4 shop items, wall-mounted paintings and clocks, a paint-bucket floor covering tool, and a 10-hole window system with placeable glass panes.

**Architecture:** Extends the existing Zustand store with floor/paint/window/shop state. Each floor mounts its own interior geometry independently. Wall-mounted items use a separate wall-plane raycaster in GhostItem. Floor tiles are a grid of clickable 1×1 meshes. Window holes are built by splitting wall geometry around pre-defined gap positions.

**Tech Stack:** React 18, @react-three/fiber 8, @react-three/drei 9, three, zustand 4, Vitest

---

## File Map

```
src/
  store/
    useGameStore.js              MODIFY — add floor/paint/window/shop state
    useGameStore.test.js         MODIFY — add tests for new actions
  utils/
    windowHoles.js               CREATE — WINDOW_HOLES config per house type
    furnitureSizes.js            MODIFY — add staircase, glass, shop items
    wallConstants.js             CREATE — WALL_MOUNTED_TYPES array
  components/
    interiors/
      ModernInterior.jsx         MODIFY — walls built from segments with holes
      ClassicInterior.jsx        MODIFY — same
      CozyInterior.jsx           MODIFY — same
      FloorTiles.jsx             CREATE — paint-bucket tile grid per floor
      ShopRoom.jsx               CREATE — 3rd floor shop geometry
    furniture/
      GhostItem.jsx              MODIFY — wall raycasting for wall-mount types
      FurnitureMesh.jsx          MODIFY — add new item types
      Staircase.jsx              CREATE — staircase model
      GlassPane.jsx              CREATE — glass pane model
      Toys.jsx                   CREATE — toys model
      Backpack.jsx               CREATE — backpack model
      Mop.jsx                    CREATE — mop model
      Jacket.jsx                 CREATE — jacket model
    npc/
      Shopkeeper.jsx             CREATE — NPC + E-key proximity trigger
      ShopMenu.jsx               CREATE — dialogue overlay UI
    inventory/
      InventoryPanel.jsx         MODIFY — add Floor tab + Glass item
  screens/
    GameScreen.jsx               MODIFY — floor switching, paint mode, shop, V-key
  components/
    houses/
      ModernHouse.jsx            MODIFY — taller 2-3 story exterior
      ClassicHouse.jsx           MODIFY — taller
      CozyHouse.jsx              MODIFY — taller
```

---

### Task 1: Extend Zustand Store

**Files:**
- Modify: `src/store/useGameStore.js`
- Modify: `src/store/useGameStore.test.js`

- [ ] **Step 1: Add new store tests**

Add to `src/store/useGameStore.test.js` (append after existing tests):
```js
describe('setCurrentFloor', () => {
  it('sets floor and resets character position', () => {
    useGameStore.setState({ characterPosition: [3, 0, 3] })
    act(() => useGameStore.getState().setCurrentFloor(1))
    expect(useGameStore.getState().currentFloor).toBe(1)
    expect(useGameStore.getState().characterPosition).toEqual([0, 0, 0])
  })
})

describe('setFloorTile', () => {
  it('stores tile data keyed by floor_x_z', () => {
    act(() => useGameStore.getState().setFloorTile(0, 2, -3, 'carpet', '#ff0000'))
    expect(useGameStore.getState().floorTiles['0_2_-3']).toEqual({ material: 'carpet', color: '#ff0000' })
  })
})

describe('addWindow / removeWindow', () => {
  it('adds and removes window keys', () => {
    act(() => useGameStore.getState().addWindow('modern_f1_0'))
    expect(useGameStore.getState().placedWindows).toContain('modern_f1_0')
    act(() => useGameStore.getState().removeWindow('modern_f1_0'))
    expect(useGameStore.getState().placedWindows).not.toContain('modern_f1_0')
  })
})

describe('setShopOpen', () => {
  it('toggles shop', () => {
    act(() => useGameStore.getState().setShopOpen(true))
    expect(useGameStore.getState().shopOpen).toBe(true)
  })
})

describe('setActivePaint', () => {
  it('sets material, color, and activates paint mode', () => {
    act(() => useGameStore.getState().setActivePaint('tile', '#ffffff'))
    const s = useGameStore.getState()
    expect(s.activeMaterial).toBe('tile')
    expect(s.activeColor).toBe('#ffffff')
    expect(s.paintMode).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/store/useGameStore.test.js
```
Expected: FAIL — new actions not defined.

- [ ] **Step 3: Replace useGameStore.js with extended store**

Replace `src/store/useGameStore.js`:
```js
import { create } from 'zustand'

const useGameStore = create((set) => ({
  // ── Existing ────────────────────────────────────────────────────────────
  selectedHouse: null,
  cameraMode: 'third',          // 'third' | 'first'
  inventoryOpen: false,
  placedItems: [],              // [{ id, type, position, rotation, floor, surface }]
  heldItem: null,
  characterPosition: [0, 0, 0],

  // ── Multi-floor ─────────────────────────────────────────────────────────
  currentFloor: 0,              // 0 = ground, 1 = 2nd, 2 = 3rd
  floorTiles: {},               // { 'floor_x_z': { material, color } }
  placedWindows: [],            // ['modern_f1_0', ...] — filled hole keys
  shopOpen: false,

  // ── Paint bucket ────────────────────────────────────────────────────────
  paintMode: false,
  activeMaterial: 'tile',
  activeColor: '#ffffff',

  // ── Existing actions ────────────────────────────────────────────────────
  selectHouse: (house) => set({ selectedHouse: house }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  setHeldItem: (item) => set({ heldItem: item, inventoryOpen: false, paintMode: false }),
  placeItem: (type, position, rotation, floor, surface = 'floor') =>
    set((s) => ({
      placedItems: [
        ...s.placedItems,
        { id: Date.now() + Math.random(), type, position, rotation, floor: floor ?? s.currentFloor, surface },
      ],
      heldItem: null,
    })),
  moveItem: (id, position, rotation) =>
    set((s) => ({
      placedItems: s.placedItems.map((item) =>
        item.id === id ? { ...item, position, rotation } : item
      ),
    })),
  removeItem: (id) =>
    set((s) => ({ placedItems: s.placedItems.filter((item) => item.id !== id) })),
  cancelHeld: () => set({ heldItem: null }),
  setCharacterPosition: (pos) => set({ characterPosition: pos }),

  // ── New actions ──────────────────────────────────────────────────────────
  setCurrentFloor: (floor) => set({ currentFloor: floor, characterPosition: [0, 0, 0] }),
  setFloorTile: (floor, x, z, material, color) =>
    set((s) => ({
      floorTiles: { ...s.floorTiles, [`${floor}_${x}_${z}`]: { material, color } },
    })),
  addWindow: (key) =>
    set((s) => ({ placedWindows: [...s.placedWindows, key] })),
  removeWindow: (key) =>
    set((s) => ({ placedWindows: s.placedWindows.filter((k) => k !== key) })),
  setShopOpen: (open) => set({ shopOpen: open }),
  setActivePaint: (material, color) =>
    set({ activeMaterial: material, activeColor: color, paintMode: true }),
  exitPaintMode: () => set({ paintMode: false }),
}))

export default useGameStore
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/store/useGameStore.test.js
```
Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: extend store with floor, paint, window, and shop state"
```

---

### Task 2: Furniture Sizes + Wall Constants

**Files:**
- Modify: `src/utils/furnitureSizes.js`
- Create: `src/utils/wallConstants.js`

- [ ] **Step 1: Add new items to furnitureSizes**

Replace `src/utils/furnitureSizes.js`:
```js
export const FURNITURE_SIZES = {
  chair:     { w: 1,   d: 1   },
  light:     { w: 0.5, d: 0.5 },
  clock:     { w: 0.6, d: 0.2 },
  plant:     { w: 0.7, d: 0.7 },
  fridge:    { w: 1,   d: 0.8 },
  fan:       { w: 0.8, d: 0.8 },
  painting:  { w: 1,   d: 0.1 },
  staircase: { w: 1.5, d: 2   },
  glass:     { w: 1,   d: 0.1 },
  toys:      { w: 0.8, d: 0.8 },
  backpack:  { w: 0.5, d: 0.3 },
  mop:       { w: 0.3, d: 0.3 },
  jacket:    { w: 0.7, d: 0.2 },
}

export const HOUSE_BOUNDS = {
  modern:  { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 },
  classic: { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 },
  cozy:    { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 },
}
```

- [ ] **Step 2: Create wallConstants.js**

Create `src/utils/wallConstants.js`:
```js
// Items that mount on walls instead of the floor
export const WALL_MOUNTED_TYPES = ['painting', 'clock']

// Items that snap to window holes instead of floor or wall
export const WINDOW_SNAP_TYPES = ['glass']
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/
git commit -m "feat: add new item sizes and wall/window type constants"
```

---

### Task 3: Window Holes Config

**Files:**
- Create: `src/utils/windowHoles.js`
- Create: `src/utils/windowHoles.test.js`

- [ ] **Step 1: Write tests**

Create `src/utils/windowHoles.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { WINDOW_HOLES, getWindowKey, getHoleById } from './windowHoles'

describe('WINDOW_HOLES', () => {
  it('has 10 holes per house type', () => {
    expect(WINDOW_HOLES.modern).toHaveLength(10)
    expect(WINDOW_HOLES.classic).toHaveLength(10)
    expect(WINDOW_HOLES.cozy).toHaveLength(10)
  })

  it('each hole has required fields', () => {
    WINDOW_HOLES.modern.forEach((hole) => {
      expect(hole).toHaveProperty('id')
      expect(hole).toHaveProperty('wall')
      expect(hole).toHaveProperty('position')
      expect(hole.position).toHaveLength(3)
    })
  })
})

describe('getWindowKey', () => {
  it('generates unique key from house, hole id, and floor', () => {
    expect(getWindowKey('modern', 'f1', 0)).toBe('modern_f1_0')
    expect(getWindowKey('classic', 'b2', 1)).toBe('classic_b2_1')
  })
})

describe('getHoleById', () => {
  it('finds hole by id and house type', () => {
    const hole = getHoleById('modern', 'f1')
    expect(hole).toBeDefined()
    expect(hole.id).toBe('f1')
  })

  it('returns undefined for unknown id', () => {
    expect(getHoleById('modern', 'zzz')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/utils/windowHoles.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create windowHoles.js**

Create `src/utils/windowHoles.js`:
```js
// Pre-defined window hole positions per house type.
// position: [x, y, z] center of hole. wall: which wall the hole is in.
export const WINDOW_HOLES = {
  modern: [
    { id: 'f1', wall: 'front', position: [-2,   1.5,  5.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.5,  5.05] },
    { id: 'f3', wall: 'front', position: [ 2,   1.5,  5.05] },
    { id: 'b1', wall: 'back',  position: [-2,   1.5, -5.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.5, -5.05] },
    { id: 'b3', wall: 'back',  position: [ 2,   1.5, -5.05] },
    { id: 'l1', wall: 'left',  position: [-5.05, 1.5, -1.5] },
    { id: 'l2', wall: 'left',  position: [-5.05, 1.5,  1.5] },
    { id: 'r1', wall: 'right', position: [ 5.05, 1.5, -1.5] },
    { id: 'r2', wall: 'right', position: [ 5.05, 1.5,  1.5] },
  ],
  classic: [
    { id: 'f1', wall: 'front', position: [-2,   1.5,  5.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.5,  5.05] },
    { id: 'f3', wall: 'front', position: [ 2,   1.5,  5.05] },
    { id: 'b1', wall: 'back',  position: [-2,   1.5, -5.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.5, -5.05] },
    { id: 'b3', wall: 'back',  position: [ 2,   1.5, -5.05] },
    { id: 'l1', wall: 'left',  position: [-5.05, 1.5, -1.5] },
    { id: 'l2', wall: 'left',  position: [-5.05, 1.5,  1.5] },
    { id: 'r1', wall: 'right', position: [ 5.05, 1.5, -1.5] },
    { id: 'r2', wall: 'right', position: [ 5.05, 1.5,  1.5] },
  ],
  cozy: [
    { id: 'f1', wall: 'front', position: [-1.5, 1.4,  4.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.4,  4.05] },
    { id: 'f3', wall: 'front', position: [ 1.5, 1.4,  4.05] },
    { id: 'b1', wall: 'back',  position: [-1.5, 1.4, -4.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.4, -4.05] },
    { id: 'b3', wall: 'back',  position: [ 1.5, 1.4, -4.05] },
    { id: 'l1', wall: 'left',  position: [-4.05, 1.4, -1  ] },
    { id: 'l2', wall: 'left',  position: [-4.05, 1.4,  1  ] },
    { id: 'r1', wall: 'right', position: [ 4.05, 1.4, -1  ] },
    { id: 'r2', wall: 'right', position: [ 4.05, 1.4,  1  ] },
  ],
}

// Wall normal vectors (inward-facing, for rotation calc)
export const WALL_NORMALS = {
  front: [0, 0, -1],
  back:  [0, 0,  1],
  left:  [1, 0,  0],
  right: [-1, 0, 0],
}

// Rotation (Y axis) for glass pane to face into room per wall
export const WALL_ROTATIONS = {
  front: 0,
  back:  Math.PI,
  left:  Math.PI / 2,
  right: -Math.PI / 2,
}

export function getWindowKey(houseType, holeId, floor) {
  return `${houseType}_${holeId}_${floor}`
}

export function getHoleById(houseType, holeId) {
  return (WINDOW_HOLES[houseType] || []).find((h) => h.id === holeId)
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/utils/windowHoles.test.js
```
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/windowHoles.js src/utils/windowHoles.test.js
git commit -m "feat: add window holes config with 10 positions per house type"
```

---

### Task 4: Update House Interiors with Windowed Walls

**Files:**
- Modify: `src/components/interiors/ModernInterior.jsx`
- Modify: `src/components/interiors/ClassicInterior.jsx`
- Modify: `src/components/interiors/CozyInterior.jsx`

Each wall is now built from segments that leave 1×1 gaps at the window hole positions. The floor and ceiling stay the same.

- [ ] **Step 1: Replace ModernInterior.jsx**

Replace `src/components/interiors/ModernInterior.jsx`:
```jsx
// Wall segments arranged around 10 window holes.
// Each wall = top strip + bottom strip + side segments between holes.
// Holes are at x: -2, 0, 2 (front/back) and z: -1.5, 1.5 (left/right), all at y=1.5.

const MAT = '#e8e8e8'
const LEFT_MAT = '#e0e0e0'

export default function ModernInterior() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f5f5f5" side={2} />
      </mesh>

      {/* ── Front wall (z=5) — holes at x=-2, 0, 2 ── */}
      {/* Top strip above holes */}
      <mesh position={[0, 2.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Bottom strip below holes */}
      <mesh position={[0, 0.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left segment x=-5 to x=-2.5 */}
      <mesh position={[-3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Between hole f1 and f2: x=-1.5 to x=-0.5 */}
      <mesh position={[-1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Between hole f2 and f3: x=0.5 to x=1.5 */}
      <mesh position={[1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Right segment x=2.5 to x=5 */}
      <mesh position={[3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>

      {/* ── Back wall (z=-5) — holes at x=-2, 0, 2 ── */}
      <mesh position={[0, 2.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>

      {/* ── Left wall (x=-5) — holes at z=-1.5, z=1.5 ── */}
      <mesh position={[-5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[-5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Front segment z=2.5 to z=5 */}
      <mesh position={[-5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Between holes z=-0.5 to z=0.5 */}
      <mesh position={[-5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Back segment z=-5 to z=-2.5 */}
      <mesh position={[-5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>

      {/* ── Right wall (x=5) — holes at z=-1.5, z=1.5 ── */}
      <mesh position={[5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
    </group>
  )
}
```

- [ ] **Step 2: Replace ClassicInterior.jsx**

Replace `src/components/interiors/ClassicInterior.jsx`:
```jsx
const MAT = '#e8d8c0'
const SIDE_MAT = '#ddd0b8'

export default function ClassicInterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#a0622a" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f5e8d0" side={2} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 2.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Back wall */}
      <mesh position={[0, 2.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left wall */}
      <mesh position={[-5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      {/* Right wall */}
      <mesh position={[5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
    </group>
  )
}
```

- [ ] **Step 3: Replace CozyInterior.jsx**

Replace `src/components/interiors/CozyInterior.jsx`:
```jsx
const MAT = '#d4b896'
const SIDE_MAT = '#c8aa88'

export default function CozyInterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#c8a060" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#f0e8d8" side={2} />
      </mesh>
      {/* Front wall (z=4), holes at x=-1.5, 0, 1.5 */}
      <mesh position={[0, 2.3, 4]}><boxGeometry args={[8, 0.8, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.7, 4]}><boxGeometry args={[8, 0.8+0.6, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.25, 1.4, 4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-0.75, 1.4, 4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0.75, 1.4, 4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.25, 1.4, 4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Back wall (z=-4) */}
      <mesh position={[0, 2.3, -4]}><boxGeometry args={[8, 0.8, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.7, -4]}><boxGeometry args={[8, 1.4, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.25, 1.4, -4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-0.75, 1.4, -4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0.75, 1.4, -4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.25, 1.4, -4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left wall (x=-4), holes at z=-1, 1 */}
      <mesh position={[-4, 2.3, 0]}><boxGeometry args={[0.1, 0.8, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, 3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, -3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      {/* Right wall (x=4) */}
      <mesh position={[4, 2.3, 0]}><boxGeometry args={[0.1, 0.8, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, 3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, -3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
    </group>
  )
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```
Select any house. Expected: walls have visible gaps at window positions. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/interiors/
git commit -m "feat: rebuild house walls with 10 window openings per room"
```

---

### Task 5: Floor Tile Grid (Paint-Bucket)

**Files:**
- Create: `src/components/interiors/FloorTiles.jsx`

- [ ] **Step 1: Create FloorTiles.jsx**

Create `src/components/interiors/FloorTiles.jsx`:
```jsx
import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const MATERIAL_COLORS = {
  tile:     { base: '#e0e0e0' },
  carpet:   { base: '#c0a080' },
  wood:     { base: '#a0622a' },
  concrete: { base: '#999999' },
}

// Renders a 10x10 grid of 1x1 floor tiles for a given floor index.
// houseType affects grid size: modern/classic=10x10, cozy=8x8
export default function FloorTiles({ houseType, floorIndex }) {
  const floorTiles = useGameStore((s) => s.floorTiles)
  const paintMode = useGameStore((s) => s.paintMode)
  const activeMaterial = useGameStore((s) => s.activeMaterial)
  const activeColor = useGameStore((s) => s.activeColor)
  const setFloorTile = useGameStore((s) => s.setFloorTile)

  const [hoveredKey, setHoveredKey] = useState(null)

  const size = houseType === 'cozy' ? 8 : 10
  const half = size / 2
  const tiles = []

  for (let xi = 0; xi < size; xi++) {
    for (let zi = 0; zi < size; zi++) {
      const x = xi - half + 0.5
      const z = zi - half + 0.5
      const key = `${floorIndex}_${Math.round(x)}_${Math.round(z)}`
      const tileData = floorTiles[key]
      const isHovered = hoveredKey === key

      const color = tileData
        ? tileData.color
        : MATERIAL_COLORS[activeMaterial]?.base || '#e0e0e0'

      tiles.push(
        <mesh
          key={key}
          position={[x, 0.001, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerOver={() => paintMode && setHoveredKey(key)}
          onPointerOut={() => setHoveredKey(null)}
          onClick={() => {
            if (!paintMode) return
            setFloorTile(floorIndex, Math.round(x), Math.round(z), activeMaterial, activeColor)
          }}
        >
          <planeGeometry args={[0.98, 0.98]} />
          <meshStandardMaterial
            color={tileData ? tileData.color : (houseType === 'modern' ? '#d0d0d0' : houseType === 'classic' ? '#a0622a' : '#c8a060')}
            emissive={isHovered && paintMode ? activeColor : '#000000'}
            emissiveIntensity={isHovered && paintMode ? 0.4 : 0}
          />
        </mesh>
      )
    }
  }

  return <group>{tiles}</group>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/interiors/FloorTiles.jsx
git commit -m "feat: add paint-bucket floor tile grid component"
```

---

### Task 6: Wall Placement Mode in GhostItem

**Files:**
- Modify: `src/components/furniture/GhostItem.jsx`

- [ ] **Step 1: Replace GhostItem.jsx with wall-aware version**

Replace `src/components/furniture/GhostItem.jsx`:
```jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { snapPosition } from '../../utils/grid'
import { isBlocked, isInsideBounds } from '../../utils/collision'
import { FURNITURE_SIZES, HOUSE_BOUNDS } from '../../utils/furnitureSizes'
import { WALL_MOUNTED_TYPES, WINDOW_SNAP_TYPES } from '../../utils/wallConstants'
import { WINDOW_HOLES, getWindowKey, WALL_ROTATIONS } from '../../utils/windowHoles'
import useGameStore from '../../store/useGameStore'
import FurnitureMesh from './FurnitureMesh'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// Wall planes (inward-facing normals, at house wall positions)
const WALL_PLANES = [
  { plane: new THREE.Plane(new THREE.Vector3(0, 0, -1),  5), wall: 'front' },
  { plane: new THREE.Plane(new THREE.Vector3(0, 0,  1),  5), wall: 'back'  },
  { plane: new THREE.Plane(new THREE.Vector3(1, 0,  0),  5), wall: 'left'  },
  { plane: new THREE.Plane(new THREE.Vector3(-1, 0, 0),  5), wall: 'right' },
]

export default function GhostItem({ type, houseType }) {
  const { camera, gl } = useThree()
  const posRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const validRef = useRef(true)
  const closestHoleRef = useRef(null)
  const [displayPos, setDisplayPos] = useState([0, 0, 0])
  const [displayRot, setDisplayRot] = useState(0)
  const [valid, setValid] = useState(true)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const placeItem = useGameStore((s) => s.placeItem)
  const addWindow = useGameStore((s) => s.addWindow)
  const currentFloor = useGameStore((s) => s.currentFloor)

  const isWallMounted = WALL_MOUNTED_TYPES.includes(type)
  const isWindowSnap = WINDOW_SNAP_TYPES.includes(type)

  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onKeyDown = (e) => {
      if ((e.key === 'r' || e.key === 'R') && !isWallMounted && !isWindowSnap) {
        rotationRef.current += Math.PI / 2
        setDisplayRot(rotationRef.current)
      }
    }

    const onClick = () => {
      if (!validRef.current) return
      if (isWindowSnap && closestHoleRef.current) {
        const { hole } = closestHoleRef.current
        const key = getWindowKey(houseType, hole.id, currentFloor)
        addWindow(key)
        useGameStore.getState().cancelHeld()
        return
      }
      const surface = isWallMounted ? 'wall' : 'floor'
      placeItem(type, [...posRef.current], rotationRef.current, currentFloor, surface)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    gl.domElement.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [gl, type, houseType, isWallMounted, isWindowSnap, placeItem, addWindow, currentFloor])

  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const ray = raycaster.current.ray
    const hit = new THREE.Vector3()

    if (isWindowSnap) {
      // Snap to nearest window hole
      const holes = WINDOW_HOLES[houseType] || []
      const placedWindows = useGameStore.getState().placedWindows
      let closest = null
      let closestDist = Infinity

      holes.forEach((hole) => {
        const key = getWindowKey(houseType, hole.id, currentFloor)
        if (placedWindows.includes(key)) return
        const hp = new THREE.Vector3(...hole.position)
        const dist = ray.distanceToPoint(hp)
        if (dist < closestDist) {
          closestDist = dist
          closest = { hole, dist }
        }
      })

      if (closest && closest.dist < 3) {
        const h = closest.hole
        posRef.current = [...h.position]
        rotationRef.current = WALL_ROTATIONS[h.wall] || 0
        closestHoleRef.current = closest
        validRef.current = true
        setDisplayPos([...h.position])
        setDisplayRot(WALL_ROTATIONS[h.wall] || 0)
        setValid(true)
      } else {
        closestHoleRef.current = null
        validRef.current = false
        setValid(false)
      }
      return
    }

    if (isWallMounted) {
      // Find nearest wall plane intersection
      let best = null
      let bestDist = Infinity
      WALL_PLANES.forEach(({ plane, wall }) => {
        const intersect = ray.intersectPlane(plane, hit.clone())
        if (intersect) {
          const d = camera.position.distanceTo(intersect)
          if (d < bestDist) { bestDist = d; best = { pos: intersect.clone(), wall } }
        }
      })
      if (best) {
        const p = [best.pos.x, 1.5, best.pos.z]
        posRef.current = p
        rotationRef.current = WALL_ROTATIONS[best.wall] || 0
        validRef.current = true
        setDisplayPos(p)
        setDisplayRot(WALL_ROTATIONS[best.wall] || 0)
        setValid(true)
      }
      return
    }

    // Floor placement (default)
    const intersects = ray.intersectPlane(floorPlane, hit)
    if (!intersects) return
    const snapped = snapPosition(hit.x, hit.z)
    posRef.current = snapped
    const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }
    const placedItems = useGameStore.getState().placedItems.filter(i => i.floor === currentFloor)
    const blocked = isBlocked(snapped[0], snapped[2], size, placedItems, FURNITURE_SIZES)
    const inside = isInsideBounds(snapped[0], snapped[2], bounds)
    const isValid = inside && !blocked
    validRef.current = isValid
    setValid(isValid)
    setDisplayPos(snapped)
  })

  const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }

  return (
    <group position={displayPos} rotation={[0, displayRot, 0]}>
      <mesh>
        <boxGeometry args={[size.w, isWallMounted || isWindowSnap ? 1 : 1, size.d]} />
        <meshStandardMaterial color={valid ? '#00ff88' : '#ff3333'} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <FurnitureMesh type={type} position={displayPos} />
    </group>
  )
}
```

- [ ] **Step 2: Verify in browser**

Select Painting from inventory. Expected: ghost snaps to nearest wall surface as mouse moves near walls. Select Clock: same behavior.

- [ ] **Step 3: Commit**

```bash
git add src/components/furniture/GhostItem.jsx
git commit -m "feat: add wall and window-snap placement modes to GhostItem"
```

---

### Task 7: Glass Pane + Window PlacedItem

**Files:**
- Create: `src/components/furniture/GlassPane.jsx`
- Create: `src/components/furniture/WindowPane.jsx`

- [ ] **Step 1: Create GlassPane model**

Create `src/components/furniture/GlassPane.jsx`:
```jsx
export default function GlassPane() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 0.04]} />
      <meshStandardMaterial color="#7ec8e3" transparent opacity={0.45} />
    </mesh>
  )
}
```

- [ ] **Step 2: Create WindowPane (placed glass in a hole)**

Create `src/components/furniture/WindowPane.jsx`:
```jsx
import { useState } from 'react'
import { WINDOW_HOLES, getWindowKey, WALL_ROTATIONS } from '../../utils/windowHoles'
import useGameStore from '../../store/useGameStore'

// Renders all placed glass panes for the current house + floor
export default function WindowPanes({ houseType, currentFloor }) {
  const placedWindows = useGameStore((s) => s.placedWindows)
  const removeWindow = useGameStore((s) => s.removeWindow)
  const heldItem = useGameStore((s) => s.heldItem)
  const holes = WINDOW_HOLES[houseType] || []

  return (
    <>
      {holes.map((hole) => {
        const key = getWindowKey(houseType, hole.id, currentFloor)
        if (!placedWindows.includes(key)) return null

        return (
          <WindowPaneItem
            key={key}
            hole={hole}
            windowKey={key}
            removeWindow={removeWindow}
            heldItem={heldItem}
          />
        )
      })}
    </>
  )
}

function WindowPaneItem({ hole, windowKey, removeWindow, heldItem }) {
  const [hovered, setHovered] = useState(false)
  const setHeldItem = useGameStore((s) => s.setHeldItem)

  const handleClick = (e) => {
    if (heldItem) return
    e.stopPropagation()
    removeWindow(windowKey)
    setHeldItem({ type: 'glass' })
  }

  return (
    <mesh
      position={hole.position}
      rotation={[0, WALL_ROTATIONS[hole.wall] || 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <boxGeometry args={[1, 1, 0.04]} />
      <meshStandardMaterial
        color={hovered && !heldItem ? '#aaddff' : '#7ec8e3'}
        transparent
        opacity={0.5}
      />
    </mesh>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/furniture/GlassPane.jsx src/components/furniture/WindowPane.jsx
git commit -m "feat: add glass pane model and window placement renderer"
```

---

### Task 8: Staircase + Shop Item Models

**Files:**
- Create: `src/components/furniture/Staircase.jsx`
- Create: `src/components/furniture/Toys.jsx`
- Create: `src/components/furniture/Backpack.jsx`
- Create: `src/components/furniture/Mop.jsx`
- Create: `src/components/furniture/Jacket.jsx`

- [ ] **Step 1: Create Staircase.jsx**

Create `src/components/furniture/Staircase.jsx`:
```jsx
// Staircase: series of steps going up in Z direction
export default function Staircase() {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, i * 0.25 + 0.125, i * 0.5 - 0.75]} castShadow>
          <boxGeometry args={[1.5, 0.25, 0.5]} />
          <meshStandardMaterial color="#c8a060" />
        </mesh>
      ))}
      {/* Handrail left */}
      <mesh position={[-0.68, 0.6, 0]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 2.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Handrail right */}
      <mesh position={[0.68, 0.6, 0]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 2.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Create Toys.jsx**

Create `src/components/furniture/Toys.jsx`:
```jsx
export default function Toys() {
  return (
    <group>
      {/* Stacked colorful blocks */}
      <mesh position={[-0.15, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      <mesh position={[0.15, 0.15, 0.1]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#44aaff" />
      </mesh>
      <mesh position={[0, 0.35, -0.1]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#ffdd44" />
      </mesh>
      {/* Small ball */}
      <mesh position={[0.2, 0.12, -0.2]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ff88cc" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Create Backpack.jsx**

Create `src/components/furniture/Backpack.jsx`:
```jsx
export default function Backpack() {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.45, 0.55, 0.2]} />
        <meshStandardMaterial color="#3a5a8a" />
      </mesh>
      {/* Front pocket */}
      <mesh position={[0, 0.22, 0.11]}>
        <boxGeometry args={[0.38, 0.3, 0.04]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
      {/* Left strap */}
      <mesh position={[-0.14, 0.38, -0.07]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
      {/* Right strap */}
      <mesh position={[0.14, 0.38, -0.07]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Create Mop.jsx**

Create `src/components/furniture/Mop.jsx`:
```jsx
export default function Mop() {
  return (
    <group>
      {/* Handle */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
        <meshStandardMaterial color="#c8a060" />
      </mesh>
      {/* Mop head */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.15, 12]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Mop strands */}
      {[-0.1, 0, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.14, 0.3]} />
          <meshStandardMaterial color="#dddddd" />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 5: Create Jacket.jsx**

Create `src/components/furniture/Jacket.jsx`:
```jsx
export default function Jacket() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.15]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Left sleeve */}
      <mesh position={[-0.42, 0.45, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.14]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Right sleeve */}
      <mesh position={[0.42, 0.45, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.14]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.18]} />
        <meshStandardMaterial color="#a93226" />
      </mesh>
      {/* Zipper line */}
      <mesh position={[0, 0.45, 0.08]}>
        <boxGeometry args={[0.04, 0.65, 0.01]} />
        <meshStandardMaterial color="#silver" color="#888" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 6: Update FurnitureMesh.jsx**

Replace `src/components/furniture/FurnitureMesh.jsx`:
```jsx
import Chair from './Chair'
import FurnitureLight from './FurnitureLight'
import WallClock from './WallClock'
import Plant from './Plant'
import Fridge from './Fridge'
import Fan from './Fan'
import Painting from './Painting'
import GlassPane from './GlassPane'
import Staircase from './Staircase'
import Toys from './Toys'
import Backpack from './Backpack'
import Mop from './Mop'
import Jacket from './Jacket'

export default function FurnitureMesh({ type, position }) {
  switch (type) {
    case 'chair':     return <Chair />
    case 'light':     return <FurnitureLight />
    case 'clock':     return <WallClock />
    case 'plant':     return <Plant />
    case 'fridge':    return <Fridge />
    case 'fan':       return <Fan />
    case 'painting':  return <Painting position={position} />
    case 'glass':     return <GlassPane />
    case 'staircase': return <Staircase />
    case 'toys':      return <Toys />
    case 'backpack':  return <Backpack />
    case 'mop':       return <Mop />
    case 'jacket':    return <Jacket />
    default:          return null
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/furniture/
git commit -m "feat: add staircase and shop item models (toys, backpack, mop, jacket)"
```

---

### Task 9: Shop Room + Shopkeeper NPC

**Files:**
- Create: `src/components/interiors/ShopRoom.jsx`
- Create: `src/components/npc/Shopkeeper.jsx`
- Create: `src/components/npc/ShopMenu.jsx`

- [ ] **Step 1: Create ShopRoom.jsx**

Create `src/components/interiors/ShopRoom.jsx`:
```jsx
// Pre-decorated 3rd floor shop room — shelves, counter, displayed items
export default function ShopRoom() {
  return (
    <group>
      {/* Back shelf unit */}
      <mesh position={[0, 1.0, -4.5]} castShadow>
        <boxGeometry args={[8, 2, 0.4]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      {/* Shelf planks */}
      {[0.4, 1.0, 1.6].map((y, i) => (
        <mesh key={i} position={[0, y, -4.25]}>
          <boxGeometry args={[7.8, 0.06, 0.35]} />
          <meshStandardMaterial color="#a07820" />
        </mesh>
      ))}
      {/* Left shelf unit */}
      <mesh position={[-4.5, 1.0, 0]} castShadow>
        <boxGeometry args={[0.4, 2, 7]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      {/* Counter */}
      <mesh position={[0, 0.55, 1.5]} castShadow>
        <boxGeometry args={[3, 1.1, 0.8]} />
        <meshStandardMaterial color="#5c3010" />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 1.11, 1.5]}>
        <boxGeometry args={[3.1, 0.06, 0.9]} />
        <meshStandardMaterial color="#7a4020" />
      </mesh>
      {/* Sign above counter */}
      <mesh position={[0, 2.4, -0.5]}>
        <boxGeometry args={[2.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#f5e08a" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Create Shopkeeper.jsx**

Create `src/components/npc/Shopkeeper.jsx`:
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import useGameStore from '../../store/useGameStore'

const INTERACT_DISTANCE = 2.0

export default function Shopkeeper() {
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const shopOpen = useGameStore((s) => s.shopOpen)

  // Check E key proximity — checked via store character position
  useFrame(() => {
    const [cx, , cz] = useGameStore.getState().characterPosition
    const dx = cx - 0
    const dz = cz - 0.5   // shopkeeper is at [0, 0, 0.5] behind counter
    const dist = Math.sqrt(dx * dx + dz * dz)
    // Proximity indicator handled in GameScreen via keydown
    // Store proximity for GameScreen to read
    useGameStore.getState()._shopkeeperNearby = dist < INTERACT_DISTANCE
  })

  return (
    <group position={[0, 0, 0.5]}>
      {/* Torso — green shirt */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.3]} />
        <meshStandardMaterial color="#2d8a30" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.32, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#2d8a30" />
      </mesh>
      <mesh position={[0.32, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#2d8a30" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
      <mesh position={[0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
      {/* Interaction indicator */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#ffdd44" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Create ShopMenu.jsx**

Create `src/components/npc/ShopMenu.jsx`:
```jsx
import useGameStore from '../../store/useGameStore'

const SHOP_ITEMS = [
  { type: 'toys',     label: 'Toys',     emoji: '🧸', price: 'Free' },
  { type: 'backpack', label: 'Backpack', emoji: '🎒', price: 'Free' },
  { type: 'mop',      label: 'Mop',      emoji: '🧹', price: 'Free' },
  { type: 'jacket',   label: 'Jacket',   emoji: '🧥', price: 'Free' },
]

export default function ShopMenu() {
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const [view, setView] = window.__shopView = window.__shopView || [null, () => {}]

  // Use local React state via a trick since this is a simple overlay
  return (
    <ShopMenuInner setShopOpen={setShopOpen} setHeldItem={setHeldItem} />
  )
}

function ShopMenuInner({ setShopOpen, setHeldItem }) {
  const { useState } = window.React || require('react')
  // We import useState properly:
  return <ShopDialog setShopOpen={setShopOpen} setHeldItem={setHeldItem} />
}

// Clean implementation
import { useState } from 'react'

function ShopDialog({ setShopOpen, setHeldItem }) {
  const [showItems, setShowItems] = useState(false)

  const buy = (type) => {
    setHeldItem({ type })
    setShopOpen(false)
  }

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 15, 10, 0.95)',
      border: '2px solid #8b6914',
      borderRadius: 10, padding: 24, minWidth: 280,
      fontFamily: 'sans-serif', color: '#fff',
      zIndex: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        🛒 Shop
      </div>

      {!showItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setShowItems(true)} style={btnStyle('#3a5a2a', '#4a7a3a')}>
            What do you sell?
          </button>
          <button onClick={() => setShopOpen(false)} style={btnStyle('#3a2a20', '#5a3a28')}>
            Bye
          </button>
        </div>
      ) : (
        <div>
          <div style={{ color: '#aaa', marginBottom: 12, fontSize: 13 }}>Pick an item to place:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SHOP_ITEMS.map(({ type, label, emoji }) => (
              <button key={type} onClick={() => buy(type)} style={btnStyle('#2a3a5a', '#3a4a7a')}>
                <span style={{ fontSize: 20, marginRight: 10 }}>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowItems(false)} style={{ ...btnStyle('#333', '#444'), marginTop: 12 }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

const btnStyle = (bg, hover) => ({
  background: bg,
  border: '1px solid #666',
  borderRadius: 6,
  color: '#fff',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
})
```

- [ ] **Step 4: Fix ShopMenu.jsx (clean up the messy draft above)**

The ShopMenu above has a structural issue from drafting — replace it with this clean version:

Replace `src/components/npc/ShopMenu.jsx`:
```jsx
import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const SHOP_ITEMS = [
  { type: 'toys',     label: 'Toys',     emoji: '🧸' },
  { type: 'backpack', label: 'Backpack', emoji: '🎒' },
  { type: 'mop',      label: 'Mop',      emoji: '🧹' },
  { type: 'jacket',   label: 'Jacket',   emoji: '🧥' },
]

const btnStyle = {
  background: '#2a3a5a',
  border: '1px solid #555',
  borderRadius: 6,
  color: '#fff',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  gap: 10,
}

export default function ShopMenu() {
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const [showItems, setShowItems] = useState(false)

  const buy = (type) => {
    setHeldItem({ type })
    setShopOpen(false)
    setShowItems(false)
  }

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 15, 10, 0.95)',
      border: '2px solid #8b6914', borderRadius: 10,
      padding: 24, minWidth: 280,
      fontFamily: 'sans-serif', color: '#fff', zIndex: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        🛒 Shop
      </div>

      {!showItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={btnStyle} onClick={() => setShowItems(true)}>
            What do you sell?
          </button>
          <button style={{ ...btnStyle, background: '#3a2a20' }} onClick={() => setShopOpen(false)}>
            Bye
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>Pick an item to place:</div>
          {SHOP_ITEMS.map(({ type, label, emoji }) => (
            <button key={type} style={btnStyle} onClick={() => buy(type)}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              {label}
            </button>
          ))}
          <button style={{ ...btnStyle, background: '#333', marginTop: 8 }} onClick={() => setShowItems(false)}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/interiors/ShopRoom.jsx src/components/npc/
git commit -m "feat: add shop room, shopkeeper NPC, and dialogue menu"
```

---

### Task 10: Inventory Panel — Add Floor Tab + New Items

**Files:**
- Modify: `src/components/inventory/InventoryPanel.jsx`

- [ ] **Step 1: Replace InventoryPanel.jsx**

Replace `src/components/inventory/InventoryPanel.jsx`:
```jsx
import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const FLOOR_ITEMS = [
  { type: 'chair',     label: 'Chair',     emoji: '🪑' },
  { type: 'light',     label: 'Lamp',      emoji: '💡' },
  { type: 'clock',     label: 'Clock',     emoji: '🕐' },
  { type: 'plant',     label: 'Plant',     emoji: '🌿' },
  { type: 'fridge',    label: 'Fridge',    emoji: '🧊' },
  { type: 'fan',       label: 'Fan',       emoji: '🌀' },
  { type: 'painting',  label: 'Painting',  emoji: '🖼️' },
  { type: 'glass',     label: 'Glass',     emoji: '🪟' },
  { type: 'staircase', label: 'Staircase', emoji: '🪜' },
]

const MATERIALS = ['tile', 'carpet', 'wood', 'concrete']
const COLORS = {
  tile:     ['#f0f0f0', '#fffde0', '#111111', '#c87941', '#4488cc', '#aaaaaa'],
  carpet:   ['#cc2222', '#2255cc', '#999999', '#d4a870', '#33aa44', '#442222'],
  wood:     ['#d4a870', '#7a4020', '#a0622a', '#e8d090', '#5c3010', '#c8b090'],
  concrete: ['#bbbbbb', '#888888', '#444444', '#d4c090', '#f0eeee', '#708090'],
}

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: '#2a2a3a', border: '1px solid #555',
  borderRadius: 6, padding: '8px 12px',
  color: '#fff', fontSize: 13, cursor: 'pointer', width: '100%',
}

export default function InventoryPanel() {
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const setActivePaint = useGameStore((s) => s.setActivePaint)
  const exitPaintMode = useGameStore((s) => s.exitPaintMode)
  const paintMode = useGameStore((s) => s.paintMode)
  const activeMaterial = useGameStore((s) => s.activeMaterial)
  const activeColor = useGameStore((s) => s.activeColor)
  const [tab, setTab] = useState('items')
  const [selectedMaterial, setSelectedMaterial] = useState('tile')

  const tabBtn = (id, label) => (
    <button
      onClick={() => { setTab(id); if (id === 'items') exitPaintMode() }}
      style={{
        flex: 1, padding: '6px 0', fontSize: 12, cursor: 'pointer',
        background: tab === id ? '#3a3a6a' : '#1a1a2a',
        color: '#fff', border: 'none', borderBottom: tab === id ? '2px solid #8888ff' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 210, height: '100%',
      background: 'rgba(20, 20, 30, 0.92)',
      borderLeft: '1px solid #444',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {tabBtn('items', 'Items')}
        {tabBtn('floor', 'Floor')}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tab === 'items' && (
          <>
            <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
              Click to place · R=rotate · Esc=cancel
            </div>
            {FLOOR_ITEMS.map(({ type, label, emoji }) => (
              <button key={type} style={btnStyle}
                onClick={() => setHeldItem({ type })}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a5a' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a3a' }}
              >
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </>
        )}

        {tab === 'floor' && (
          <>
            <div style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
              {paintMode ? '🖌 Paint mode — click floor tiles' : 'Pick material + color'}
            </div>

            {/* Material picker */}
            <div style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>Material</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
              {MATERIALS.map((m) => (
                <button key={m} onClick={() => { setSelectedMaterial(m) }}
                  style={{
                    ...btnStyle,
                    justifyContent: 'center',
                    background: selectedMaterial === m ? '#3a5a8a' : '#2a2a3a',
                    border: selectedMaterial === m ? '1px solid #6688cc' : '1px solid #555',
                    fontSize: 12, padding: '6px',
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Color swatches */}
            <div style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>Color</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
              {(COLORS[selectedMaterial] || []).map((color) => (
                <div
                  key={color}
                  onClick={() => setActivePaint(selectedMaterial, color)}
                  title={color}
                  style={{
                    width: '100%', aspectRatio: '1',
                    background: color,
                    borderRadius: 3, cursor: 'pointer',
                    border: activeColor === color && activeMaterial === selectedMaterial
                      ? '2px solid #fff' : '2px solid transparent',
                  }}
                />
              ))}
            </div>

            {paintMode && (
              <button
                onClick={exitPaintMode}
                style={{ ...btnStyle, marginTop: 12, justifyContent: 'center', background: '#5a2a2a' }}
              >
                ✕ Exit Paint Mode
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/inventory/InventoryPanel.jsx
git commit -m "feat: add floor paint-bucket tab and new items to inventory"
```

---

### Task 11: Update GameScreen — Floor System + Shop

**Files:**
- Modify: `src/screens/GameScreen.jsx`

- [ ] **Step 1: Replace GameScreen.jsx**

Replace `src/screens/GameScreen.jsx`:
```jsx
import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import useGameStore from '../store/useGameStore'
import HouseInterior from '../components/interiors/HouseInterior'
import ShopRoom from '../components/interiors/ShopRoom'
import FloorTiles from '../components/interiors/FloorTiles'
import Character from '../components/character/Character'
import FirstPersonHand from '../components/character/FirstPersonHand'
import useCharacterMovement from '../components/character/useCharacterMovement'
import IsometricCamera from '../components/camera/IsometricCamera'
import InventoryPanel from '../components/inventory/InventoryPanel'
import PlacedItem from '../components/furniture/PlacedItem'
import GhostItem from '../components/furniture/GhostItem'
import WindowPanes from '../components/furniture/WindowPane'
import Shopkeeper from '../components/npc/Shopkeeper'
import ShopMenu from '../components/npc/ShopMenu'

function Scene({ houseType }) {
  const positionRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const walkTimeRef = useRef(0)

  const cameraMode = useGameStore((s) => s.cameraMode)
  const heldItem = useGameStore((s) => s.heldItem)
  const placedItems = useGameStore((s) => s.placedItems)
  const characterPosition = useGameStore((s) => s.characterPosition)
  const currentFloor = useGameStore((s) => s.currentFloor)

  const isMovingRef = useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType)

  // Items visible on current floor only
  const floorItems = placedItems.filter((i) => (i.floor ?? 0) === currentFloor)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 12, 8]} intensity={1.0} castShadow />

      <IsometricCamera target={characterPosition} mode={cameraMode} rotationRef={rotationRef} />

      <HouseInterior type={houseType} />
      <FloorTiles houseType={houseType} floorIndex={currentFloor} />
      <WindowPanes houseType={houseType} currentFloor={currentFloor} />

      {/* 3rd floor shop room */}
      {currentFloor === 2 && (
        <>
          <ShopRoom />
          <Shopkeeper />
        </>
      )}

      {cameraMode === 'third' && (
        <Character positionRef={positionRef} rotationRef={rotationRef} walkTimeRef={walkTimeRef} />
      )}
      {cameraMode === 'first' && <FirstPersonHand isMovingRef={isMovingRef} />}

      {floorItems.map((item) => (
        <PlacedItem key={item.id} {...item} />
      ))}

      {heldItem && <GhostItem type={heldItem.type} houseType={houseType} />}
    </>
  )
}

export default function GameScreen() {
  const selectedHouse = useGameStore((s) => s.selectedHouse)
  const inventoryOpen = useGameStore((s) => s.inventoryOpen)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const currentFloor = useGameStore((s) => s.currentFloor)
  const shopOpen = useGameStore((s) => s.shopOpen)
  const heldItem = useGameStore((s) => s.heldItem)
  const paintMode = useGameStore((s) => s.paintMode)

  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const cancelHeld = useGameStore((s) => s.cancelHeld)
  const setCurrentFloor = useGameStore((s) => s.setCurrentFloor)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const exitPaintMode = useGameStore((s) => s.exitPaintMode)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        setCameraMode(cameraMode === 'third' ? 'first' : 'third')
      }
      if (e.key === 'e' || e.key === 'E') {
        if (shopOpen) { setShopOpen(false); return }
        if (useGameStore.getState()._shopkeeperNearby && currentFloor === 2) {
          setShopOpen(true); return
        }
        if (!heldItem && !paintMode) toggleInventory()
      }
      if (e.key === 'Escape') {
        cancelHeld()
        exitPaintMode()
        setShopOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cameraMode, setCameraMode, toggleInventory, cancelHeld, heldItem, shopOpen, currentFloor, paintMode, setShopOpen, exitPaintMode])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ fov: 50, position: [12, 12, 12] }}>
        <Scene houseType={selectedHouse} />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        color: '#fff', fontFamily: 'sans-serif', fontSize: 12,
        textShadow: '0 1px 4px #000', pointerEvents: 'none',
        lineHeight: 1.8, background: 'rgba(0,0,0,0.35)',
        padding: '8px 12px', borderRadius: 6,
      }}>
        <div>WASD — Move &nbsp;|&nbsp; E — Inventory/Shop &nbsp;|&nbsp; V — Camera</div>
        <div>R — Rotate &nbsp;|&nbsp; Esc — Cancel &nbsp;|&nbsp; Floor: {currentFloor + 1}/3</div>
        {paintMode && <div style={{ color: '#aaffaa' }}>🖌 Paint mode — click floor tiles</div>}
      </div>

      {/* Floor switcher buttons */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8,
      }}>
        {[0, 1, 2].map((f) => (
          <button
            key={f}
            onClick={() => setCurrentFloor(f)}
            style={{
              background: currentFloor === f ? '#5a5aaa' : '#2a2a4a',
              color: '#fff', border: '1px solid #666',
              borderRadius: 6, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13,
            }}
          >
            Floor {f + 1}
          </button>
        ))}
      </div>

      {/* Inventory toggle */}
      {!heldItem && !shopOpen && !paintMode && (
        <button
          onClick={toggleInventory}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: inventoryOpen ? '#444' : '#222',
            color: '#fff', border: '1px solid #666',
            padding: '8px 16px', borderRadius: 6,
            fontFamily: 'sans-serif', cursor: 'pointer', fontSize: 14,
          }}
        >
          {inventoryOpen ? 'Close [E]' : 'Inventory [E]'}
        </button>
      )}

      {/* Placement hint */}
      {heldItem && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          color: '#fff', fontFamily: 'sans-serif', fontSize: 14,
          background: 'rgba(0,0,0,0.6)', padding: '8px 16px',
          borderRadius: 6, pointerEvents: 'none',
        }}>
          Placing: <strong>{heldItem.type}</strong> · R rotate · Esc cancel
        </div>
      )}

      {inventoryOpen && !heldItem && !shopOpen && <InventoryPanel />}
      {shopOpen && <ShopMenu />}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

1. Select a house. Expected: Floor 1/2/3 buttons at bottom center. Clicking switches floors (interior remounts).
2. Press `E` → inventory opens with Items + Floor tabs.
3. Floor tab → select Tile + white swatch → cursor hover highlights tiles → click to paint.
4. Switch to floor 3 → shop room visible with shopkeeper.
5. Walk near shopkeeper, press `E` → shop menu opens.
6. Click "What do you sell?" → 4 items shown. Click one → starts placement.

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameScreen.jsx
git commit -m "feat: integrate floors, paint mode, shop, and window panes into game screen"
```

---

### Task 12: Update House Selection Models (Taller)

**Files:**
- Modify: `src/components/houses/ModernHouse.jsx`
- Modify: `src/components/houses/ClassicHouse.jsx`
- Modify: `src/components/houses/CozyHouse.jsx`
- Modify: `src/screens/HouseSelect.jsx`

- [ ] **Step 1: Update ModernHouse.jsx**

Replace `src/components/houses/ModernHouse.jsx`:
```jsx
export default function ModernHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#e0e0e0' : '#cccccc'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#d8d8d8' : '#c0c0c0'} />
      </mesh>
      {/* 3rd floor (smaller) */}
      <mesh position={[0.1, 3.5, 0]} castShadow>
        <boxGeometry args={[1.6, 1, 1.6]} />
        <meshStandardMaterial color={hovered ? '#d0d0d0' : '#b8b8b8'} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0.1, 4.08, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 1.8]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Windows floor 1 */}
      <mesh position={[0, 0.8, 1.01]}>
        <boxGeometry args={[1.2, 0.7, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Windows floor 2 */}
      <mesh position={[0, 2.3, 1.01]}>
        <boxGeometry args={[1.0, 0.6, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.35, 1.01]}>
        <boxGeometry args={[0.45, 0.7, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {hovered && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[2.1, 4.1, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 2: Update ClassicHouse.jsx**

Replace `src/components/houses/ClassicHouse.jsx`:
```jsx
export default function ClassicHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#d4906a' : '#c07850'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#cc8860' : '#b87048'} />
      </mesh>
      {/* Pitched roof */}
      <mesh position={[0, 3.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.5, 1.5, 2.2]} />
        <meshStandardMaterial color="#7a3f20" />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.6, 4.0, -0.4]} castShadow>
        <boxGeometry args={[0.3, 1.0, 0.3]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Porch columns */}
      <mesh position={[-0.5, 0.4, 1.1]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
        <meshStandardMaterial color="#f0e0d0" />
      </mesh>
      <mesh position={[0.5, 0.4, 1.1]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
        <meshStandardMaterial color="#f0e0d0" />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.9, 1.01]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 2.4, 1.01]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 1.01]}>
        <boxGeometry args={[0.4, 0.6, 0.02]} />
        <meshStandardMaterial color="#5c2e00" />
      </mesh>
      {hovered && (
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[2.1, 3.7, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 3: Update CozyHouse.jsx**

Replace `src/components/houses/CozyHouse.jsx`:
```jsx
export default function CozyHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.8, 1.3, 1.8]} />
        <meshStandardMaterial color={hovered ? '#c8a882' : '#b5895a'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[1.8, 1.3, 1.8]} />
        <meshStandardMaterial color={hovered ? '#c0a070' : '#a87848'} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.1, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.3, 1.3, 2.0]} />
        <meshStandardMaterial color="#5c4020" />
      </mesh>
      {/* Round windows floor 1 */}
      <mesh position={[-0.4, 0.8, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.4, 0.8, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Round windows floor 2 */}
      <mesh position={[0, 2.1, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 0.91]}>
        <boxGeometry args={[0.38, 0.6, 0.02]} />
        <meshStandardMaterial color="#3d1f00" />
      </mesh>
      {/* Flower box */}
      <mesh position={[0, 0.5, 1.0]}>
        <boxGeometry args={[0.8, 0.12, 0.15]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.62, 1.0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={['#ff6688', '#ffdd44', '#ff4466'][i]} />
        </mesh>
      ))}
      {hovered && (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1.9, 3.1, 1.9]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 4: Update HouseSelect camera**

In `src/screens/HouseSelect.jsx`, change camera position from `[0, 5, 12]` to `[0, 7, 16]`:
```jsx
// Find this line:
camera={{ position: [0, 5, 12], fov: 50 }}
// Replace with:
camera={{ position: [0, 7, 16], fov: 50 }}
```

- [ ] **Step 5: Verify in browser**

Go to `http://localhost:5173`. Expected: 3 houses on selection screen now look taller (2-3 stories each) with windows on multiple floors.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/houses/ src/screens/HouseSelect.jsx
git commit -m "feat: update house models to show 2-3 story height"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| 3 floors with floor switching | Task 1, 11 |
| Staircase furniture item | Task 8 |
| 3rd floor shop room | Task 9 |
| Shopkeeper NPC + E interaction | Task 9 |
| Dialogue menu (What do you sell / Bye) | Task 9 |
| Shop items: Toys, Backpack, Mop, Jacket | Task 8 |
| Wall-mounted paintings | Task 6 |
| Wall-mounted clock | Task 6 |
| Floor coverings paint-bucket | Task 5, 10 |
| 10 window holes per house | Task 3, 4 |
| Glass item snaps to holes | Task 6, 7 |
| House selection models show 2-3 stories | Task 12 |
| `placedItems` scoped per floor | Task 1, 11 |

All requirements covered. No gaps.

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `WALL_MOUNTED_TYPES`, `WINDOW_SNAP_TYPES` defined in Task 2 and used in Task 6. `getWindowKey`, `WALL_ROTATIONS` defined in Task 3 and used in Tasks 6, 7. `currentFloor` from store used consistently throughout Tasks 6, 7, 11. `surface` param added to `placeItem` in Task 1 matches usage in Task 6.
