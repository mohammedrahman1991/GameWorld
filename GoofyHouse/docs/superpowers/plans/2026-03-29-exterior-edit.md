# Exterior Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an exterior edit mode triggered by V-key cycling that shows the full house + yard from overhead, lets players place exterior items (pine tree, flower bed, lamppost, mailbox) on the ground, and customize the roof style and color.

**Architecture:** Single R3F scene with two visibility groups — interior group and exterior group — toggled based on `editMode` in the Zustand store. Camera mode cycles through three states: `third` (interior third-person), `exterior` (overhead looking at house + yard), and `first` (interior first-person). The exterior group contains a pre-built starter yard, a Roof component, and dynamically placed exterior items. All exterior placement uses the same ghost+grid-snap approach as interior furniture, with placement validated to be outside the house footprint.

**Tech Stack:** React 18, @react-three/fiber v8, @react-three/drei v9, Zustand v4, Three.js procedural geometry, Vitest + @testing-library/react

---

## File Map

### New files
- `src/components/exterior/StarterYard.jsx` — 30×30 ground plane, path strip, 6 grass patches, perimeter fence (decorative, non-editable)
- `src/components/exterior/Roof.jsx` — flat/pitched/gabled geometry + color driven by store state
- `src/components/exterior/ExteriorItemMesh.jsx` — renders PineTree / FlowerBed / Lamppost / Mailbox by type
- `src/components/exterior/ExteriorGhostItem.jsx` — ghost preview + grid snap on exterior ground plane, blocked if inside house footprint
- `src/components/exterior/PlacedExteriorItem.jsx` — renders one placed exterior item with hover highlight + click to pick up
- `src/components/inventory/ExteriorInventoryPanel.jsx` — roof picker (style + color) + 4 placeable exterior item buttons

### Modified files
- `src/store/useGameStore.js` — add `editMode`, `roofStyle`, `roofColor`, `exteriorItems` + 5 actions
- `src/store/useGameStore.test.js` — add tests for new state + actions
- `src/components/camera/IsometricCamera.jsx` — add `exterior` camera position branch
- `src/screens/GameScreen.jsx` — V-key cycle through 3 modes, E-key routing, render exterior group, visibility toggling

---

## Task 1: Extend Zustand Store

**Files:**
- Modify: `src/store/useGameStore.js`
- Modify: `src/store/useGameStore.test.js`

- [ ] **Step 1: Write failing tests for new store state and actions**

```js
// src/store/useGameStore.test.js — append these describe blocks

describe('editMode', () => {
  it('defaults to interior', () => {
    expect(useGameStore.getState().editMode).toBe('interior')
  })

  it('setEditMode updates editMode', () => {
    act(() => useGameStore.getState().setEditMode('exterior'))
    expect(useGameStore.getState().editMode).toBe('exterior')
  })
})

describe('roofStyle', () => {
  it('defaults to flat', () => {
    expect(useGameStore.getState().roofStyle).toBe('flat')
  })

  it('setRoofStyle updates roofStyle', () => {
    act(() => useGameStore.getState().setRoofStyle('pitched'))
    expect(useGameStore.getState().roofStyle).toBe('pitched')
  })
})

describe('roofColor', () => {
  it('defaults to #555555', () => {
    expect(useGameStore.getState().roofColor).toBe('#555555')
  })

  it('setRoofColor updates roofColor', () => {
    act(() => useGameStore.getState().setRoofColor('#ff0000'))
    expect(useGameStore.getState().roofColor).toBe('#ff0000')
  })
})

describe('exteriorItems', () => {
  it('defaults to empty array', () => {
    expect(useGameStore.getState().exteriorItems).toEqual([])
  })

  it('addExteriorItem appends item and clears heldItem', () => {
    useGameStore.setState({ heldItem: { type: 'pinetree' } })
    act(() => useGameStore.getState().addExteriorItem('pinetree', [3, 0, 8], 0))
    const state = useGameStore.getState()
    expect(state.exteriorItems).toHaveLength(1)
    expect(state.exteriorItems[0]).toMatchObject({ type: 'pinetree', position: [3, 0, 8], rotation: 0 })
    expect(state.heldItem).toBeNull()
  })

  it('removeExteriorItem removes by id', () => {
    useGameStore.setState({
      exteriorItems: [{ id: 101, type: 'mailbox', position: [5, 0, 5], rotation: 0 }]
    })
    act(() => useGameStore.getState().removeExteriorItem(101))
    expect(useGameStore.getState().exteriorItems).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/mohammedrahman/Desktop/Games/GoofyHouse
npx vitest run src/store/useGameStore.test.js
```

Expected: FAIL — `editMode is not a function` / `roofStyle is not defined` etc.

- [ ] **Step 3: Update the store**

Replace the entire contents of `src/store/useGameStore.js`:

```js
import { create } from 'zustand'

const useGameStore = create((set) => ({
  selectedHouse: null,        // 'modern' | 'classic' | 'cozy' | null
  cameraMode: 'third',        // 'third' | 'first'
  editMode: 'interior',       // 'interior' | 'exterior'
  inventoryOpen: false,
  exteriorInventoryOpen: false,
  placedItems: [],            // [{ id, type, position:[x,y,z], rotation }]
  exteriorItems: [],          // [{ id, type, position:[x,y,z], rotation }]
  heldItem: null,             // { type } | null
  characterPosition: [0, 0, 0],
  roofStyle: 'flat',          // 'flat' | 'pitched' | 'gabled'
  roofColor: '#555555',

  selectHouse: (house) => set({ selectedHouse: house }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setEditMode: (mode) => set({ editMode: mode }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  toggleExteriorInventory: () => set((s) => ({ exteriorInventoryOpen: !s.exteriorInventoryOpen })),
  setHeldItem: (item) => set({ heldItem: item, inventoryOpen: false, exteriorInventoryOpen: false }),
  placeItem: (type, position, rotation) =>
    set((s) => ({
      placedItems: [...s.placedItems, { id: Date.now() + Math.random(), type, position, rotation }],
      heldItem: null,
    })),
  addExteriorItem: (type, position, rotation) =>
    set((s) => ({
      exteriorItems: [...s.exteriorItems, { id: Date.now() + Math.random(), type, position, rotation }],
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
  removeExteriorItem: (id) =>
    set((s) => ({ exteriorItems: s.exteriorItems.filter((item) => item.id !== id) })),
  cancelHeld: () => set({ heldItem: null }),
  setCharacterPosition: (pos) => set({ characterPosition: pos }),
  setRoofStyle: (style) => set({ roofStyle: style }),
  setRoofColor: (color) => set({ roofColor: color }),
}))

export default useGameStore
```

- [ ] **Step 4: Update beforeEach reset in test file to include new fields**

In `src/store/useGameStore.test.js`, replace the `beforeEach` block:

```js
beforeEach(() => {
  useGameStore.setState({
    selectedHouse: null,
    cameraMode: 'third',
    editMode: 'interior',
    inventoryOpen: false,
    exteriorInventoryOpen: false,
    placedItems: [],
    exteriorItems: [],
    heldItem: null,
    characterPosition: [0, 0, 0],
    roofStyle: 'flat',
    roofColor: '#555555',
  })
})
```

- [ ] **Step 5: Run tests to confirm they all pass**

```bash
npx vitest run src/store/useGameStore.test.js
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/useGameStore.js src/store/useGameStore.test.js
git commit -m "feat: add exterior edit mode state to store (editMode, roofStyle, roofColor, exteriorItems)"
```

---

## Task 2: Extend Camera for Exterior Overhead Mode

**Files:**
- Modify: `src/components/camera/IsometricCamera.jsx`

- [ ] **Step 1: Update IsometricCamera to handle exterior mode**

Replace the entire contents of `src/components/camera/IsometricCamera.jsx`:

```jsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const ISO_OFFSET = new THREE.Vector3(12, 12, 12)
const EXTERIOR_POS = new THREE.Vector3(0, 30, 20)
const EXTERIOR_TARGET = new THREE.Vector3(0, 0, 0)

// Handles all three camera modes:
// 'third'    — isometric follow cam behind character
// 'exterior' — fixed overhead for yard editing
// 'first'    — first-person at character head height
export default function IsometricCamera({ target, mode, rotationRef }) {
  const { camera } = useThree()
  const smoothTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const t = new THREE.Vector3(...target)

    if (mode === 'exterior') {
      camera.position.lerp(EXTERIOR_POS, 0.06)
      camera.lookAt(EXTERIOR_TARGET)
      return
    }

    if (mode === 'third') {
      smoothTarget.current.lerp(t, 0.08)
      const newPos = smoothTarget.current.clone().add(ISO_OFFSET)
      camera.position.copy(newPos)
      camera.lookAt(smoothTarget.current)
    } else {
      // First-person: position camera at head height, look in direction character faces
      smoothTarget.current.lerp(t, 0.2)
      camera.position.set(
        smoothTarget.current.x,
        smoothTarget.current.y + 1.55,
        smoothTarget.current.z
      )
      const yaw = rotationRef?.current ?? 0
      camera.rotation.set(0, yaw + Math.PI, 0)
    }
  })

  return null
}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: All tests PASS (camera has no unit tests, but store tests should still pass).

- [ ] **Step 3: Commit**

```bash
git add src/components/camera/IsometricCamera.jsx
git commit -m "feat: add exterior overhead camera mode"
```

---

## Task 3: V-Key Cycling and GameScreen Visibility Wiring

**Files:**
- Modify: `src/screens/GameScreen.jsx`

The V key now cycles: `interior third-person` → `exterior overhead` → `interior first-person` → back to `interior third-person`.

- [ ] **Step 1: Update GameScreen with the 3-way V-key cycle and editMode-based visibility**

Replace the entire contents of `src/screens/GameScreen.jsx`:

```jsx
import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import useGameStore from '../store/useGameStore'
import HouseInterior from '../components/interiors/HouseInterior'
import Character from '../components/character/Character'
import FirstPersonHand from '../components/character/FirstPersonHand'
import useCharacterMovement from '../components/character/useCharacterMovement'
import IsometricCamera from '../components/camera/IsometricCamera'
import InventoryPanel from '../components/inventory/InventoryPanel'
import PlacedItem from '../components/furniture/PlacedItem'
import GhostItem from '../components/furniture/GhostItem'

// Inner R3F scene — all 3D content lives here
function Scene({ houseType }) {
  const positionRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const walkTimeRef = useRef(0)

  const cameraMode = useGameStore((s) => s.cameraMode)
  const editMode = useGameStore((s) => s.editMode)
  const heldItem = useGameStore((s) => s.heldItem)
  const placedItems = useGameStore((s) => s.placedItems)
  const characterPosition = useGameStore((s) => s.characterPosition)

  const isMovingRef = useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType)

  const isInterior = editMode === 'interior'

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 12, 8]} intensity={1.0} castShadow />

      <IsometricCamera
        target={characterPosition}
        mode={editMode === 'exterior' ? 'exterior' : cameraMode}
        rotationRef={rotationRef}
      />

      {/* Interior group — hidden in exterior mode */}
      <group visible={isInterior}>
        <HouseInterior type={houseType} />

        {cameraMode === 'third' && (
          <Character
            positionRef={positionRef}
            rotationRef={rotationRef}
            walkTimeRef={walkTimeRef}
          />
        )}

        {cameraMode === 'first' && (
          <FirstPersonHand isMovingRef={isMovingRef} />
        )}

        {placedItems.map((item) => (
          <PlacedItem key={item.id} {...item} />
        ))}

        {heldItem && isInterior && (
          <GhostItem type={heldItem.type} houseType={houseType} />
        )}
      </group>

      {/* Exterior group — placeholder for Tasks 4-8, always rendered */}
      <group visible={!isInterior}>
        {/* StarterYard, Roof, PlacedExteriorItems, ExteriorGhostItem added in later tasks */}
      </group>
    </>
  )
}

export default function GameScreen() {
  const selectedHouse = useGameStore((s) => s.selectedHouse)
  const inventoryOpen = useGameStore((s) => s.inventoryOpen)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const editMode = useGameStore((s) => s.editMode)
  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const setEditMode = useGameStore((s) => s.setEditMode)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const toggleExteriorInventory = useGameStore((s) => s.toggleExteriorInventory)
  const cancelHeld = useGameStore((s) => s.cancelHeld)
  const heldItem = useGameStore((s) => s.heldItem)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        // Cycle: interior/third → exterior → interior/first → interior/third
        if (editMode === 'interior' && cameraMode === 'third') {
          setEditMode('exterior')
        } else if (editMode === 'exterior') {
          setEditMode('interior')
          setCameraMode('first')
        } else {
          // interior + first → back to third
          setCameraMode('third')
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        if (!heldItem) {
          if (editMode === 'exterior') {
            toggleExteriorInventory()
          } else {
            toggleInventory()
          }
        }
      }
      if (e.key === 'Escape') {
        cancelHeld()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cameraMode, editMode, setCameraMode, setEditMode, toggleInventory, toggleExteriorInventory, cancelHeld, heldItem])

  const modeLabel =
    editMode === 'exterior' ? 'Exterior' :
    cameraMode === 'third' ? '3rd Person' : '1st Person'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ fov: 50, position: [12, 12, 12] }}>
        <Scene houseType={selectedHouse} />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        color: '#fff', fontFamily: 'sans-serif', fontSize: 13,
        textShadow: '0 1px 4px #000', pointerEvents: 'none',
        lineHeight: 1.8, background: 'rgba(0,0,0,0.35)',
        padding: '8px 12px', borderRadius: 6,
      }}>
        {editMode === 'interior' && <div>WASD — Move</div>}
        <div>E — {editMode === 'exterior' ? 'Exterior Inventory' : 'Inventory'}</div>
        <div>V — Mode ({modeLabel})</div>
        {editMode === 'interior' && <div>R — Rotate item &nbsp; Esc — Cancel</div>}
      </div>

      {/* Interior inventory */}
      {editMode === 'interior' && !heldItem && (
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

      {/* Cancel placement hint */}
      {heldItem && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          color: '#fff', fontFamily: 'sans-serif', fontSize: 14,
          background: 'rgba(0,0,0,0.6)', padding: '8px 16px',
          borderRadius: 6, pointerEvents: 'none',
        }}>
          Placing: <strong>{heldItem.type}</strong> &nbsp;· R to rotate · Esc to cancel
        </div>
      )}

      {inventoryOpen && editMode === 'interior' && !heldItem && <InventoryPanel />}
    </div>
  )
}
```

- [ ] **Step 2: Run the dev server to smoke-test V-key cycling**

```bash
npm run dev
```

Open `http://localhost:5173`. Press V three times — mode label should cycle: `3rd Person → Exterior → 1st Person → 3rd Person`. The scene should go dark/empty in exterior mode (no geometry yet — expected). Press E in exterior mode to confirm no interior inventory opens.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameScreen.jsx
git commit -m "feat: V-key cycles interior/exterior/first-person modes, E-key routes to exterior inventory"
```

---

## Task 4: Starter Yard

**Files:**
- Create: `src/components/exterior/StarterYard.jsx`

- [ ] **Step 1: Create the StarterYard component**

Create `src/components/exterior/StarterYard.jsx`:

```jsx
// Pre-built decorative yard. Not editable by the player.
// Ground at y = -0.05, path from door (z=5) to yard edge (z=14).
// 6 grass patches scattered on ground. Low fence around perimeter.

const GRASS_PATCHES = [
  [-8,  0,  -6],
  [ 8,  0,  -6],
  [-8,  0,   6],
  [ 9,  0,   6],
  [-6,  0, -10],
  [ 7,  0, -10],
]

export default function StarterYard() {
  return (
    <group>
      {/* Main ground plane 30×30 */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[30, 0.1, 30]} />
        <meshStandardMaterial color="#4a8c3f" />
      </mesh>

      {/* Path: 1-unit wide grey strip from door to yard edge */}
      <mesh position={[0, -0.02, 9.5]} receiveShadow>
        <boxGeometry args={[1.2, 0.06, 9]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* 6 dark green grass patches */}
      {GRASS_PATCHES.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[2, 0.08, 2]} />
          <meshStandardMaterial color="#2d6e28" />
        </mesh>
      ))}

      {/* Perimeter fence — 4 sides, low box strips */}
      {/* Front fence (gap in middle for path) */}
      <mesh position={[-7.5, 0.2, 15]} castShadow>
        <boxGeometry args={[15, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      <mesh position={[7.5, 0.2, 15]} castShadow>
        <boxGeometry args={[15, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Back fence */}
      <mesh position={[0, 0.2, -15]} castShadow>
        <boxGeometry args={[30, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Left fence */}
      <mesh position={[-15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.4, 30]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Right fence */}
      <mesh position={[15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.4, 30]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Mount StarterYard in the exterior group in GameScreen.jsx**

In `src/screens/GameScreen.jsx`, add the import and mount it inside the exterior group:

```jsx
// Add import at top:
import StarterYard from '../components/exterior/StarterYard'

// Inside Scene, replace the exterior group:
{/* Exterior group */}
<group visible={!isInterior}>
  <StarterYard />
  {/* Roof, PlacedExteriorItems, ExteriorGhostItem added in later tasks */}
</group>
```

- [ ] **Step 3: Verify in browser**

Press V once to enter exterior mode. You should see a large green ground plane with a grey path, dark grass patches, and a brown fence ring around the yard.

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/exterior/StarterYard.jsx src/screens/GameScreen.jsx
git commit -m "feat: add starter yard (ground, path, grass patches, fence)"
```

---

## Task 5: Roof Component

**Files:**
- Create: `src/components/exterior/Roof.jsx`

The roof sits at `y = 3` (top of house walls). It renders different geometry based on `roofStyle` from the store.

- [ ] **Step 1: Create Roof.jsx**

Create `src/components/exterior/Roof.jsx`:

```jsx
import useGameStore from '../../store/useGameStore'

// Roof sits at y=3, always visible in both interior and exterior modes.
// flat:    single slab
// pitched: two angled panels meeting at a ridge
// gabled:  pitched + two triangular end caps
export default function Roof() {
  const roofStyle = useGameStore((s) => s.roofStyle)
  const roofColor = useGameStore((s) => s.roofColor)

  const mat = <meshStandardMaterial color={roofColor} />

  if (roofStyle === 'flat') {
    return (
      <mesh position={[0, 3.15, 0]} castShadow>
        <boxGeometry args={[10.4, 0.3, 10.4]} />
        {mat}
      </mesh>
    )
  }

  if (roofStyle === 'pitched') {
    // Two panels angled 30° meeting at the ridge
    return (
      <group position={[0, 3, 0]}>
        {/* Left panel */}
        <mesh position={[-2.5, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
          <boxGeometry args={[5.8, 0.25, 10.4]} />
          {mat}
        </mesh>
        {/* Right panel */}
        <mesh position={[2.5, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
          <boxGeometry args={[5.8, 0.25, 10.4]} />
          {mat}
        </mesh>
      </group>
    )
  }

  // gabled: pitched + triangular end caps
  return (
    <group position={[0, 3, 0]}>
      {/* Left panel */}
      <mesh position={[-2.5, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[5.8, 0.25, 10.4]} />
        {mat}
      </mesh>
      {/* Right panel */}
      <mesh position={[2.5, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <boxGeometry args={[5.8, 0.25, 10.4]} />
        {mat}
      </mesh>
      {/* Front gable end cap */}
      <mesh position={[0, 0.85, 5.2]} castShadow>
        <boxGeometry args={[10.4, 1.7, 0.25]} />
        {mat}
      </mesh>
      {/* Back gable end cap */}
      <mesh position={[0, 0.85, -5.2]} castShadow>
        <boxGeometry args={[10.4, 1.7, 0.25]} />
        {mat}
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Mount Roof in the Scene (always visible — not inside either visibility group)**

In `src/screens/GameScreen.jsx`, add the import and place `<Roof />` outside both groups so it always renders:

```jsx
// Add import at top:
import Roof from '../components/exterior/Roof'

// Inside Scene's return, after the closing </group> of the exterior group, add:
<Roof />
```

- [ ] **Step 3: Verify in browser**

Switch to exterior mode (V). A flat dark grey roof slab should appear on top of the house. Confirm it is visible in interior mode too (switch back with V twice).

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/exterior/Roof.jsx src/screens/GameScreen.jsx
git commit -m "feat: add Roof component with flat/pitched/gabled styles driven by store"
```

---

## Task 6: Exterior Item Models

**Files:**
- Create: `src/components/exterior/ExteriorItemMesh.jsx`

All four exterior item types rendered as procedural geometry. This is a single dispatcher component (like FurnitureMesh for interior items).

- [ ] **Step 1: Create ExteriorItemMesh.jsx**

Create `src/components/exterior/ExteriorItemMesh.jsx`:

```jsx
// Renders one exterior item by type as procedural Three.js geometry.
// Types: pinetree | flowerbed | lamppost | mailbox
export default function ExteriorItemMesh({ type }) {
  if (type === 'pinetree') {
    return (
      <group>
        {/* Trunk */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.2, 8]} />
          <meshStandardMaterial color="#6b3f1f" />
        </mesh>
        {/* Foliage layers — bottom to top */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <coneGeometry args={[1.0, 1.2, 8]} />
          <meshStandardMaterial color="#2d7a2d" />
        </mesh>
        <mesh position={[0, 2.7, 0]} castShadow>
          <coneGeometry args={[0.75, 1.0, 8]} />
          <meshStandardMaterial color="#359035" />
        </mesh>
        <mesh position={[0, 3.45, 0]} castShadow>
          <coneGeometry args={[0.5, 0.9, 8]} />
          <meshStandardMaterial color="#3da03d" />
        </mesh>
      </group>
    )
  }

  if (type === 'flowerbed') {
    const flowers = [
      [-0.5, 0, -0.3, '#ff4466'],
      [ 0.1, 0,  0.3, '#ffcc00'],
      [ 0.6, 0, -0.1, '#ff8800'],
      [-0.2, 0,  0.5, '#cc44ff'],
      [ 0.4, 0,  0.6, '#ff4466'],
      [-0.6, 0,  0.4, '#ffcc00'],
    ]
    return (
      <group>
        {/* Soil bed */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.16, 1.2]} />
          <meshStandardMaterial color="#5c3d1a" />
        </mesh>
        {/* Flower spheres */}
        {flowers.map(([x, y, z, color], i) => (
          <mesh key={i} position={[x, 0.35, z]} castShadow>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  if (type === 'lamppost') {
    return (
      <group>
        {/* Pole */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 3.0, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Lamp head */}
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.5]} />
          <meshStandardMaterial color="#444444" metalness={0.4} />
        </mesh>
        {/* Warm light glow bulb */}
        <mesh position={[0, 2.95, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={2} />
        </mesh>
        {/* Point light */}
        <pointLight position={[0, 2.9, 0]} intensity={1.2} distance={6} color="#ffe080" />
      </group>
    )
  }

  if (type === 'mailbox') {
    return (
      <group>
        {/* Post */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.0, 8]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        {/* Body */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.55, 0.4, 0.35]} />
          <meshStandardMaterial color="#2255bb" />
        </mesh>
        {/* Flag */}
        <mesh position={[0.32, 1.2, 0]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.02]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0.42, 1.32, 0]} castShadow>
          <boxGeometry args={[0.18, 0.14, 0.02]} />
          <meshStandardMaterial color="#dd2222" />
        </mesh>
      </group>
    )
  }

  return null
}
```

- [ ] **Step 2: Smoke test — manually render one item in the exterior group to verify**

In `src/screens/GameScreen.jsx` exterior group, temporarily add:

```jsx
import ExteriorItemMesh from '../components/exterior/ExteriorItemMesh'
// inside exterior <group>:
<group position={[5, 0, 8]}><ExteriorItemMesh type="pinetree" /></group>
<group position={[-5, 0, 8]}><ExteriorItemMesh type="lamppost" /></group>
<group position={[8, 0, 3]}><ExteriorItemMesh type="mailbox" /></group>
<group position={[-8, 0, 3]}><ExteriorItemMesh type="flowerbed" /></group>
```

Switch to exterior mode (V) and confirm all 4 items render correctly. Then **remove the test items** before committing.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/exterior/ExteriorItemMesh.jsx src/screens/GameScreen.jsx
git commit -m "feat: add exterior item models (pinetree, flowerbed, lamppost, mailbox)"
```

---

## Task 7: Exterior Ghost Item (Placement Preview)

**Files:**
- Create: `src/components/exterior/ExteriorGhostItem.jsx`

Ghost placement on the exterior ground plane. Items snap to 1-unit grid. Cannot be placed inside the house footprint (±5 units in X and Z for modern/classic, ±4 for cozy).

- [ ] **Step 1: Create ExteriorGhostItem.jsx**

Create `src/components/exterior/ExteriorGhostItem.jsx`:

```jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { snapToGrid } from '../../utils/grid'
import useGameStore from '../../store/useGameStore'
import ExteriorItemMesh from './ExteriorItemMesh'

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// House footprint bounds per house type — items may NOT be placed inside
const HOUSE_FOOTPRINT = {
  modern:  { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  classic: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  cozy:    { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
}

function isInsideFootprint(x, z, footprint) {
  return (
    x >= footprint.minX && x <= footprint.maxX &&
    z >= footprint.minZ && z <= footprint.maxZ
  )
}

export default function ExteriorGhostItem({ type, houseType }) {
  const { camera, gl } = useThree()
  const posRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const validRef = useRef(false)
  const [displayPos, setDisplayPos] = useState([0, 0, 0])
  const [displayRot, setDisplayRot] = useState(0)
  const [valid, setValid] = useState(false)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const addExteriorItem = useGameStore((s) => s.addExteriorItem)

  const footprint = HOUSE_FOOTPRINT[houseType] || HOUSE_FOOTPRINT.modern

  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        rotationRef.current = rotationRef.current + Math.PI / 2
        setDisplayRot(rotationRef.current)
      }
    }

    const onClick = () => {
      if (!validRef.current) return
      addExteriorItem(type, [...posRef.current], rotationRef.current)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    gl.domElement.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [gl, type, addExteriorItem])

  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const hit = new THREE.Vector3()
    const intersects = raycaster.current.ray.intersectPlane(groundPlane, hit)
    if (!intersects) return

    const snappedX = snapToGrid(hit.x)
    const snappedZ = snapToGrid(hit.z)
    const snapped = [snappedX, 0, snappedZ]
    posRef.current = snapped

    // Valid if outside the house footprint and within yard bounds
    const outsideHouse = !isInsideFootprint(snappedX, snappedZ, footprint)
    const inYard = Math.abs(snappedX) <= 14 && Math.abs(snappedZ) <= 14
    const isValid = outsideHouse && inYard

    validRef.current = isValid
    setValid(isValid)
    setDisplayPos(snapped)
  })

  return (
    <group position={displayPos} rotation={[0, displayRot, 0]}>
      {/* Validity indicator */}
      <mesh>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial
          color={valid ? '#00ff88' : '#ff3333'}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      <ExteriorItemMesh type={type} />
    </group>
  )
}
```

Note: `snapToGrid` is imported from `../../utils/grid`. If the function is named `snapPosition` in the existing utils, use that instead. Check `src/utils/grid.js` — use whichever function snaps a single coordinate to the nearest integer.

- [ ] **Step 2: Check the actual export name in grid.js**

Open `src/utils/grid.js`. If the snap function for a single value is called something other than `snapToGrid`, update the import in `ExteriorGhostItem.jsx` accordingly.

The existing `GhostItem.jsx` imports `{ snapPosition }` from `../../utils/grid` and calls `snapPosition(hit.x, hit.z)` returning `[x, 0, z]`. Update the import in `ExteriorGhostItem.jsx` to match:

```jsx
import { snapPosition } from '../../utils/grid'
// ...
// In useFrame:
const snapped = snapPosition(hit.x, hit.z)   // returns [x, 0, z]
posRef.current = snapped
const outsideHouse = !isInsideFootprint(snapped[0], snapped[2], footprint)
const inYard = Math.abs(snapped[0]) <= 14 && Math.abs(snapped[2]) <= 14
```

And remove the `snapToGrid` import. The final `useFrame` section:

```jsx
useFrame(() => {
  raycaster.current.setFromCamera(mouse.current, camera)
  const hit = new THREE.Vector3()
  const intersects = raycaster.current.ray.intersectPlane(groundPlane, hit)
  if (!intersects) return

  const snapped = snapPosition(hit.x, hit.z)
  posRef.current = snapped

  const outsideHouse = !isInsideFootprint(snapped[0], snapped[2], footprint)
  const inYard = Math.abs(snapped[0]) <= 14 && Math.abs(snapped[2]) <= 14
  const isValid = outsideHouse && inYard

  validRef.current = isValid
  setValid(isValid)
  setDisplayPos(snapped)
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/exterior/ExteriorGhostItem.jsx
git commit -m "feat: add ExteriorGhostItem with ground snap and house footprint validation"
```

---

## Task 8: Placed Exterior Item (Click to Pick Up)

**Files:**
- Create: `src/components/exterior/PlacedExteriorItem.jsx`

- [ ] **Step 1: Create PlacedExteriorItem.jsx**

Create `src/components/exterior/PlacedExteriorItem.jsx`:

```jsx
import { useState } from 'react'
import ExteriorItemMesh from './ExteriorItemMesh'
import useGameStore from '../../store/useGameStore'

export default function PlacedExteriorItem({ id, type, position, rotation }) {
  const [hovered, setHovered] = useState(false)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const removeExteriorItem = useGameStore((s) => s.removeExteriorItem)
  const heldItem = useGameStore((s) => s.heldItem)

  const handleClick = (e) => {
    if (heldItem) return
    e.stopPropagation()
    removeExteriorItem(id)
    setHeldItem({ type })
  }

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      {hovered && !heldItem && (
        <mesh>
          <boxGeometry args={[1.2, 4.0, 1.2]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.15} wireframe />
        </mesh>
      )}
      <ExteriorItemMesh type={type} />
    </group>
  )
}
```

- [ ] **Step 2: Mount ExteriorGhostItem and PlacedExteriorItem in GameScreen exterior group**

In `src/screens/GameScreen.jsx`, update imports and the exterior group:

```jsx
// Add these imports:
import ExteriorGhostItem from '../components/exterior/ExteriorGhostItem'
import PlacedExteriorItem from '../components/exterior/PlacedExteriorItem'

// In Scene, update exteriorItems subscription:
const exteriorItems = useGameStore((s) => s.exteriorItems)

// Inside exterior <group>:
<group visible={!isInterior}>
  <StarterYard />
  {exteriorItems.map((item) => (
    <PlacedExteriorItem key={item.id} {...item} />
  ))}
  {heldItem && !isInterior && (
    <ExteriorGhostItem type={heldItem.type} houseType={houseType} />
  )}
</group>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/exterior/PlacedExteriorItem.jsx src/screens/GameScreen.jsx
git commit -m "feat: add PlacedExteriorItem with hover highlight and click-to-pick-up"
```

---

## Task 9: Exterior Inventory Panel (Items + Roof Picker)

**Files:**
- Create: `src/components/inventory/ExteriorInventoryPanel.jsx`

This panel is only shown in exterior mode. It has two sections: roof picker at top (style buttons + color swatches) and 4 exterior item buttons below.

- [ ] **Step 1: Create ExteriorInventoryPanel.jsx**

Create `src/components/inventory/ExteriorInventoryPanel.jsx`:

```jsx
import useGameStore from '../../store/useGameStore'

const ROOF_STYLES = [
  { value: 'flat',    label: 'Flat' },
  { value: 'pitched', label: 'Pitched' },
  { value: 'gabled',  label: 'Gabled' },
]

const ROOF_COLORS = [
  { hex: '#555555', label: 'Dark Grey' },
  { hex: '#cc2222', label: 'Red' },
  { hex: '#7a4a1e', label: 'Brown' },
  { hex: '#111111', label: 'Black' },
  { hex: '#2a6e2a', label: 'Green' },
  { hex: '#1e3a8a', label: 'Blue' },
  { hex: '#c4622d', label: 'Terracotta' },
  { hex: '#f0f0f0', label: 'White' },
]

const EXTERIOR_ITEMS = [
  { type: 'pinetree',  label: 'Pine Tree',  emoji: '🌲' },
  { type: 'flowerbed', label: 'Flower Bed', emoji: '🌸' },
  { type: 'lamppost',  label: 'Lamppost',   emoji: '💡' },
  { type: 'mailbox',   label: 'Mailbox',    emoji: '📬' },
]

export default function ExteriorInventoryPanel() {
  const roofStyle = useGameStore((s) => s.roofStyle)
  const roofColor = useGameStore((s) => s.roofColor)
  const setRoofStyle = useGameStore((s) => s.setRoofStyle)
  const setRoofColor = useGameStore((s) => s.setRoofColor)
  const setHeldItem = useGameStore((s) => s.setHeldItem)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 220, height: '100%',
      background: 'rgba(20, 20, 30, 0.92)',
      borderLeft: '1px solid #444',
      display: 'flex', flexDirection: 'column',
      padding: 16, gap: 8,
      fontFamily: 'sans-serif', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
        Exterior
      </div>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
        Click to place · R to rotate · Esc to cancel
      </div>

      {/* Roof Style */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>
        Roof Style
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {ROOF_STYLES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoofStyle(value)}
            style={{
              flex: 1, padding: '6px 4px',
              background: roofStyle === value ? '#4a6fa5' : '#2a2a3a',
              border: roofStyle === value ? '1px solid #88aaff' : '1px solid #555',
              borderRadius: 5, color: '#fff',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roof Color */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold', marginTop: 8 }}>
        Roof Color
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ROOF_COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            onClick={() => setRoofColor(hex)}
            style={{
              width: 30, height: 30,
              background: hex,
              border: roofColor === hex ? '2px solid #fff' : '2px solid #444',
              borderRadius: 4, cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />

      {/* Exterior Items */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold' }}>
        Items
      </div>
      {EXTERIOR_ITEMS.map(({ type, label, emoji }) => (
        <button
          key={type}
          onClick={() => setHeldItem({ type })}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#2a2a3a', border: '1px solid #555',
            borderRadius: 6, padding: '10px 12px',
            color: '#fff', fontSize: 14, cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a5a' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a3a' }}
        >
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/inventory/ExteriorInventoryPanel.jsx
git commit -m "feat: add ExteriorInventoryPanel with roof picker and 4 exterior items"
```

---

## Task 10: Final Integration — Wire Up Exterior Inventory in GameScreen

**Files:**
- Modify: `src/screens/GameScreen.jsx`

Connect `exteriorInventoryOpen` state and show `ExteriorInventoryPanel` when in exterior mode and inventory is open. Also add exterior inventory toggle button.

- [ ] **Step 1: Update GameScreen.jsx with final exterior integration**

Replace the entire contents of `src/screens/GameScreen.jsx` with the final version:

```jsx
import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import useGameStore from '../store/useGameStore'
import HouseInterior from '../components/interiors/HouseInterior'
import Character from '../components/character/Character'
import FirstPersonHand from '../components/character/FirstPersonHand'
import useCharacterMovement from '../components/character/useCharacterMovement'
import IsometricCamera from '../components/camera/IsometricCamera'
import InventoryPanel from '../components/inventory/InventoryPanel'
import ExteriorInventoryPanel from '../components/inventory/ExteriorInventoryPanel'
import PlacedItem from '../components/furniture/PlacedItem'
import GhostItem from '../components/furniture/GhostItem'
import StarterYard from '../components/exterior/StarterYard'
import Roof from '../components/exterior/Roof'
import ExteriorGhostItem from '../components/exterior/ExteriorGhostItem'
import PlacedExteriorItem from '../components/exterior/PlacedExteriorItem'

function Scene({ houseType }) {
  const positionRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const walkTimeRef = useRef(0)

  const cameraMode = useGameStore((s) => s.cameraMode)
  const editMode = useGameStore((s) => s.editMode)
  const heldItem = useGameStore((s) => s.heldItem)
  const placedItems = useGameStore((s) => s.placedItems)
  const exteriorItems = useGameStore((s) => s.exteriorItems)
  const characterPosition = useGameStore((s) => s.characterPosition)

  const isMovingRef = useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType)

  const isInterior = editMode === 'interior'

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 12, 8]} intensity={1.0} castShadow />

      <IsometricCamera
        target={characterPosition}
        mode={editMode === 'exterior' ? 'exterior' : cameraMode}
        rotationRef={rotationRef}
      />

      {/* Interior group — hidden in exterior mode */}
      <group visible={isInterior}>
        <HouseInterior type={houseType} />

        {cameraMode === 'third' && (
          <Character
            positionRef={positionRef}
            rotationRef={rotationRef}
            walkTimeRef={walkTimeRef}
          />
        )}

        {cameraMode === 'first' && (
          <FirstPersonHand isMovingRef={isMovingRef} />
        )}

        {placedItems.map((item) => (
          <PlacedItem key={item.id} {...item} />
        ))}

        {heldItem && isInterior && (
          <GhostItem type={heldItem.type} houseType={houseType} />
        )}
      </group>

      {/* Exterior group */}
      <group visible={!isInterior}>
        <StarterYard />
        {exteriorItems.map((item) => (
          <PlacedExteriorItem key={item.id} {...item} />
        ))}
        {heldItem && !isInterior && (
          <ExteriorGhostItem type={heldItem.type} houseType={houseType} />
        )}
      </group>

      {/* Roof always visible */}
      <Roof />
    </>
  )
}

export default function GameScreen() {
  const selectedHouse = useGameStore((s) => s.selectedHouse)
  const inventoryOpen = useGameStore((s) => s.inventoryOpen)
  const exteriorInventoryOpen = useGameStore((s) => s.exteriorInventoryOpen)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const editMode = useGameStore((s) => s.editMode)
  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const setEditMode = useGameStore((s) => s.setEditMode)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const toggleExteriorInventory = useGameStore((s) => s.toggleExteriorInventory)
  const cancelHeld = useGameStore((s) => s.cancelHeld)
  const heldItem = useGameStore((s) => s.heldItem)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        if (editMode === 'interior' && cameraMode === 'third') {
          setEditMode('exterior')
        } else if (editMode === 'exterior') {
          setEditMode('interior')
          setCameraMode('first')
        } else {
          setCameraMode('third')
        }
      }
      if (e.key === 'e' || e.key === 'E') {
        if (!heldItem) {
          if (editMode === 'exterior') {
            toggleExteriorInventory()
          } else {
            toggleInventory()
          }
        }
      }
      if (e.key === 'Escape') {
        cancelHeld()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cameraMode, editMode, setCameraMode, setEditMode, toggleInventory, toggleExteriorInventory, cancelHeld, heldItem])

  const modeLabel =
    editMode === 'exterior' ? 'Exterior' :
    cameraMode === 'third' ? '3rd Person' : '1st Person'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ fov: 50, position: [12, 12, 12] }}>
        <Scene houseType={selectedHouse} />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        color: '#fff', fontFamily: 'sans-serif', fontSize: 13,
        textShadow: '0 1px 4px #000', pointerEvents: 'none',
        lineHeight: 1.8, background: 'rgba(0,0,0,0.35)',
        padding: '8px 12px', borderRadius: 6,
      }}>
        {editMode === 'interior' && <div>WASD — Move</div>}
        <div>E — {editMode === 'exterior' ? 'Exterior Inventory' : 'Inventory'}</div>
        <div>V — Mode ({modeLabel})</div>
        {editMode === 'interior' && <div>R — Rotate item &nbsp; Esc — Cancel</div>}
        {editMode === 'exterior' && <div>R — Rotate item &nbsp; Esc — Cancel</div>}
      </div>

      {/* Interior inventory toggle button */}
      {editMode === 'interior' && !heldItem && (
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

      {/* Exterior inventory toggle button */}
      {editMode === 'exterior' && !heldItem && (
        <button
          onClick={toggleExteriorInventory}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: exteriorInventoryOpen ? '#444' : '#222',
            color: '#fff', border: '1px solid #666',
            padding: '8px 16px', borderRadius: 6,
            fontFamily: 'sans-serif', cursor: 'pointer', fontSize: 14,
          }}
        >
          {exteriorInventoryOpen ? 'Close [E]' : 'Exterior [E]'}
        </button>
      )}

      {/* Cancel placement hint */}
      {heldItem && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          color: '#fff', fontFamily: 'sans-serif', fontSize: 14,
          background: 'rgba(0,0,0,0.6)', padding: '8px 16px',
          borderRadius: 6, pointerEvents: 'none',
        }}>
          Placing: <strong>{heldItem.type}</strong> &nbsp;· R to rotate · Esc to cancel
        </div>
      )}

      {/* Interior inventory panel */}
      {inventoryOpen && editMode === 'interior' && !heldItem && <InventoryPanel />}

      {/* Exterior inventory panel */}
      {exteriorInventoryOpen && editMode === 'exterior' && !heldItem && <ExteriorInventoryPanel />}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Smoke test in the browser**

```bash
npm run dev
```

Full test checklist:
1. Press V → enters exterior mode, camera zooms out to overhead view, yard + roof visible
2. Press E in exterior mode → ExteriorInventoryPanel slides open on right
3. Click "Pine Tree" → ghost tree follows mouse on ground
4. Hover inside house footprint → ghost turns red (invalid)
5. Click outside house → tree is placed on yard
6. Hover placed tree → yellow wireframe highlight appears
7. Click placed tree → it picks up again (ghost reactivated)
8. Press Escape → placement cancelled
9. Click Roof Style "Pitched" → roof geometry changes live
10. Click a color swatch → roof color changes live
11. Press V again → enters first-person mode (interior, no yard visible)
12. Press V again → back to third-person interior
13. Interior furniture placement still works normally
14. Interior inventory (E) still opens in interior mode

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameScreen.jsx
git commit -m "feat: wire exterior inventory panel, complete exterior edit mode integration"
```

---

## Self-Review

### Spec coverage check

| Spec Requirement | Covered By |
|---|---|
| `editMode` in store | Task 1 |
| `roofStyle`, `roofColor` in store | Task 1 |
| `exteriorItems` + add/remove actions | Task 1 |
| V key cycles: 3rd → exterior → 1st → 3rd | Task 3 |
| Camera at [0, 30, 20] in exterior mode | Task 2 |
| Interior group hidden in exterior mode | Task 3 |
| 30×30 ground plane | Task 4 |
| Path from z=5 to z=14 | Task 4 |
| 6 grass patches | Task 4 |
| Fence perimeter | Task 4 |
| Pine Tree model (3-layer cone + trunk) | Task 6 |
| Flower Bed model (soil + colored spheres) | Task 6 |
| Lamppost model (pole + box head + point light) | Task 6 |
| Mailbox model (box + post + flag) | Task 6 |
| Ghost + grid snap for exterior items | Task 7 |
| Cannot place inside house footprint | Task 7 |
| `exteriorItems` separate from `placedItems` | Task 1, 8 |
| Click placed item → pick up | Task 8 |
| Exterior inventory panel | Task 9 |
| Roof picker: flat/pitched/gabled | Task 5, 9 |
| Roof color: 8 swatches | Task 9 |
| Roof at y=3, always visible | Task 5 |
| E key opens exterior inventory in exterior mode | Task 3, 10 |
| R key rotates held exterior item | Task 7 |
| Escape cancels placement | Task 3, 10 |
| WASD disabled in exterior mode (character hidden) | Task 3 — interior group hidden so character not rendered |

All spec requirements covered.

### Placeholder scan

No TBDs, TODOs, or vague requirements found.

### Type consistency check

- `editMode` values: `'interior'` / `'exterior'` — consistent across store (Task 1), camera (Task 2), GameScreen (Task 3, 10)
- `roofStyle` values: `'flat'` / `'pitched'` / `'gabled'` — consistent across store and Roof component (Task 5) and ExteriorInventoryPanel (Task 9)
- `exteriorItems` action names: `addExteriorItem` / `removeExteriorItem` — consistent across store (Task 1), ExteriorGhostItem (Task 7), PlacedExteriorItem (Task 8)
- `toggleExteriorInventory` — consistent across store (Task 1) and GameScreen (Task 3, 10)
- `snapPosition` — used from existing `../../utils/grid`, consistent with existing GhostItem usage
