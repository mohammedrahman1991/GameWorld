# GoofyHouse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Sims-style 3D game with a 3D house selection screen, isometric third-person character movement, and drag-and-drop furniture placement.

**Architecture:** Vite + React app with two screens (HouseSelect, GameScreen). All 3D rendered via react-three-fiber inside a `<Canvas>`. React UI panels (inventory, HUD) are positioned absolutely outside the canvas. Zustand manages all game state. All 3D models are procedural Three.js primitives — no external asset files.

**Tech Stack:** React 18, Vite 5, @react-three/fiber 8, @react-three/drei 9, three 0.163, zustand 4, Vitest, @testing-library/react, jsdom

---

## File Map

```
src/
  test/
    setup.js
  store/
    useGameStore.js
  utils/
    grid.js
    collision.js
    furnitureSizes.js
  screens/
    HouseSelect.jsx
    GameScreen.jsx
  components/
    houses/
      ModernHouse.jsx
      ClassicHouse.jsx
      CozyHouse.jsx
    interiors/
      ModernInterior.jsx
      ClassicInterior.jsx
      CozyInterior.jsx
    camera/
      IsometricCamera.jsx
    character/
      Character.jsx
      FirstPersonHand.jsx
      useCharacterMovement.js
    furniture/
      Chair.jsx
      FurnitureLight.jsx
      WallClock.jsx
      Plant.jsx
      Fridge.jsx
      Fan.jsx
      Painting.jsx
      GhostItem.jsx
      PlacedItem.jsx
      FurnitureMesh.jsx
    inventory/
      InventoryPanel.jsx
  App.jsx
  main.jsx
  index.css
```

---

### Task 1: Project Setup

**Files:**
- Create: `package.json` (via vite scaffolding)
- Create: `vite.config.js`
- Create: `src/test/setup.js`
- Create: `src/index.css`

- [ ] **Step 1: Scaffold the project**

Run in `/Users/mohammedrahman/Desktop/Games/GoofyHouse`:
```bash
npm create vite@latest . -- --template react
```
Answer "y" if asked to overwrite. Select React + JavaScript.

- [ ] **Step 2: Install dependencies**

```bash
npm install @react-three/fiber @react-three/drei three zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in vite.config.js**

Replace `vite.config.js` with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create global CSS reset**

Replace `src/index.css` with:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: server starts at `http://localhost:5173`, browser shows Vite + React default page.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold vite react project with r3f and zustand"
```

---

### Task 2: Zustand Store

**Files:**
- Create: `src/store/useGameStore.js`
- Create: `src/store/useGameStore.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/store/useGameStore.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import useGameStore from './useGameStore'

beforeEach(() => {
  useGameStore.setState({
    selectedHouse: null,
    cameraMode: 'third',
    inventoryOpen: false,
    placedItems: [],
    heldItem: null,
    characterPosition: [0, 0, 0],
  })
})

describe('selectHouse', () => {
  it('sets selected house', () => {
    act(() => useGameStore.getState().selectHouse('modern'))
    expect(useGameStore.getState().selectedHouse).toBe('modern')
  })
})

describe('toggleInventory', () => {
  it('toggles inventoryOpen', () => {
    act(() => useGameStore.getState().toggleInventory())
    expect(useGameStore.getState().inventoryOpen).toBe(true)
    act(() => useGameStore.getState().toggleInventory())
    expect(useGameStore.getState().inventoryOpen).toBe(false)
  })
})

describe('setHeldItem', () => {
  it('sets held item and closes inventory', () => {
    useGameStore.setState({ inventoryOpen: true })
    act(() => useGameStore.getState().setHeldItem({ type: 'chair' }))
    expect(useGameStore.getState().heldItem).toEqual({ type: 'chair' })
    expect(useGameStore.getState().inventoryOpen).toBe(false)
  })
})

describe('placeItem', () => {
  it('adds item to placedItems and clears heldItem', () => {
    useGameStore.setState({ heldItem: { type: 'chair' } })
    act(() => useGameStore.getState().placeItem('chair', [1, 0, 1], 0))
    const state = useGameStore.getState()
    expect(state.placedItems).toHaveLength(1)
    expect(state.placedItems[0]).toMatchObject({ type: 'chair', position: [1, 0, 1], rotation: 0 })
    expect(state.heldItem).toBeNull()
  })
})

describe('moveItem', () => {
  it('updates position and rotation of existing item', () => {
    useGameStore.setState({ placedItems: [{ id: 42, type: 'chair', position: [0, 0, 0], rotation: 0 }] })
    act(() => useGameStore.getState().moveItem(42, [3, 0, 3], 90))
    expect(useGameStore.getState().placedItems[0]).toMatchObject({ id: 42, position: [3, 0, 3], rotation: 90 })
  })
})

describe('cancelHeld', () => {
  it('clears heldItem', () => {
    useGameStore.setState({ heldItem: { type: 'plant' } })
    act(() => useGameStore.getState().cancelHeld())
    expect(useGameStore.getState().heldItem).toBeNull()
  })
})

describe('setCameraMode', () => {
  it('switches camera mode', () => {
    act(() => useGameStore.getState().setCameraMode('first'))
    expect(useGameStore.getState().cameraMode).toBe('first')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/store/useGameStore.test.js
```
Expected: FAIL — `useGameStore` not found.

- [ ] **Step 3: Write the store**

Create `src/store/useGameStore.js`:
```js
import { create } from 'zustand'

const useGameStore = create((set) => ({
  selectedHouse: null,        // 'modern' | 'classic' | 'cozy' | null
  cameraMode: 'third',        // 'third' | 'first'
  inventoryOpen: false,
  placedItems: [],            // [{ id, type, position:[x,y,z], rotation }]
  heldItem: null,             // { type } | null
  characterPosition: [0, 0, 0],

  selectHouse: (house) => set({ selectedHouse: house }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  setHeldItem: (item) => set({ heldItem: item, inventoryOpen: false }),
  placeItem: (type, position, rotation) =>
    set((s) => ({
      placedItems: [...s.placedItems, { id: Date.now() + Math.random(), type, position, rotation }],
      heldItem: null,
    })),
  moveItem: (id, position, rotation) =>
    set((s) => ({
      placedItems: s.placedItems.map((item) =>
        item.id === id ? { ...item, position, rotation } : item
      ),
    })),
  cancelHeld: () => set({ heldItem: null }),
  setCharacterPosition: (pos) => set({ characterPosition: pos }),
}))

export default useGameStore
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/store/useGameStore.test.js
```
Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add zustand game store with placement and camera state"
```

---

### Task 3: Grid & Collision Utilities

**Files:**
- Create: `src/utils/grid.js`
- Create: `src/utils/collision.js`
- Create: `src/utils/furnitureSizes.js`
- Create: `src/utils/grid.test.js`
- Create: `src/utils/collision.test.js`

- [ ] **Step 1: Write grid utility tests**

Create `src/utils/grid.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { snapToGrid, snapPosition } from './grid'

describe('snapToGrid', () => {
  it('snaps to nearest integer', () => {
    expect(snapToGrid(1.4)).toBe(1)
    expect(snapToGrid(1.6)).toBe(2)
    expect(snapToGrid(-0.4)).toBe(0)
    expect(snapToGrid(-0.6)).toBe(-1)
  })
})

describe('snapPosition', () => {
  it('returns snapped [x, 0, z] tuple', () => {
    expect(snapPosition(1.3, 2.7)).toEqual([1, 0, 3])
    expect(snapPosition(-1.6, 0.1)).toEqual([-2, 0, 0])
  })
})
```

- [ ] **Step 2: Write collision utility tests**

Create `src/utils/collision.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { overlaps, isInsideBounds } from './collision'

describe('overlaps', () => {
  it('detects overlapping AABBs', () => {
    expect(overlaps(0, 0, 1, 1, 0, 0, 1, 1)).toBe(true)
    expect(overlaps(0, 0, 1, 1, 2, 0, 1, 1)).toBe(false)
    expect(overlaps(0, 0, 1, 1, 0.4, 0, 1, 1)).toBe(true)
  })

  it('returns false when AABBs only touch edges', () => {
    expect(overlaps(0, 0, 1, 1, 1, 0, 1, 1)).toBe(false)
  })
})

describe('isInsideBounds', () => {
  it('returns true when point is inside bounds', () => {
    const b = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    expect(isInsideBounds(0, 0, b)).toBe(true)
    expect(isInsideBounds(3.9, -3.9, b)).toBe(true)
  })

  it('returns false outside bounds', () => {
    const b = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    expect(isInsideBounds(5, 0, b)).toBe(false)
    expect(isInsideBounds(0, -5, b)).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/utils/
```
Expected: FAIL — modules not found.

- [ ] **Step 4: Write grid utility**

Create `src/utils/grid.js`:
```js
export const GRID_SIZE = 1

export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function snapPosition(x, z) {
  return [snapToGrid(x), 0, snapToGrid(z)]
}
```

- [ ] **Step 5: Write collision utility**

Create `src/utils/collision.js`:
```js
// AABB overlap check: ax/az = center, aw/ad = full width/depth
export function overlaps(ax, az, aw, ad, bx, bz, bw, bd) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(az - bz) < (ad + bd) / 2
}

export function isInsideBounds(x, z, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

// Check if a position is blocked by any placed item
export function isBlocked(x, z, itemSize, placedItems, furnitureSizes, excludeId = null) {
  return placedItems.some((item) => {
    if (item.id === excludeId) return false
    const size = furnitureSizes[item.type] || { w: 1, d: 1 }
    return overlaps(x, z, itemSize.w, itemSize.d, item.position[0], item.position[2], size.w, size.d)
  })
}
```

- [ ] **Step 6: Write furniture sizes map**

Create `src/utils/furnitureSizes.js`:
```js
export const FURNITURE_SIZES = {
  chair:    { w: 1,   d: 1   },
  light:    { w: 0.5, d: 0.5 },
  clock:    { w: 0.6, d: 0.2 },
  plant:    { w: 0.7, d: 0.7 },
  fridge:   { w: 1,   d: 0.8 },
  fan:      { w: 0.8, d: 0.8 },
  painting: { w: 1,   d: 0.2 },
}

export const HOUSE_BOUNDS = {
  modern:  { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 },
  classic: { minX: -4.5, maxX: 4.5, minZ: -4.5, maxZ: 4.5 },
  cozy:    { minX: -3.5, maxX: 3.5, minZ: -3.5, maxZ: 3.5 },
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run src/utils/
```
Expected: 6 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/
git commit -m "feat: add grid snapping, collision, and furniture size utilities"
```

---

### Task 4: App Shell + Screen Routing

**Files:**
- Create: `src/main.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Write main.jsx**

Replace `src/main.jsx`:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 2: Write App.jsx**

Replace `src/App.jsx`:
```jsx
import { Suspense } from 'react'
import useGameStore from './store/useGameStore'
import HouseSelect from './screens/HouseSelect'
import GameScreen from './screens/GameScreen'

export default function App() {
  const selectedHouse = useGameStore((s) => s.selectedHouse)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {selectedHouse === null ? (
        <Suspense fallback={<div style={{ color: '#fff', padding: 20 }}>Loading...</div>}>
          <HouseSelect />
        </Suspense>
      ) : (
        <Suspense fallback={<div style={{ color: '#fff', padding: 20 }}>Loading...</div>}>
          <GameScreen />
        </Suspense>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder screens so the app compiles**

Create `src/screens/HouseSelect.jsx`:
```jsx
export default function HouseSelect() {
  return <div style={{ color: 'white', padding: 40 }}>House Select — TODO</div>
}
```

Create `src/screens/GameScreen.jsx`:
```jsx
export default function GameScreen() {
  return <div style={{ color: 'white', padding: 40 }}>Game Screen — TODO</div>
}
```

- [ ] **Step 4: Verify app renders**

```bash
npm run dev
```
Expected: Browser shows "House Select — TODO" on a black background. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx src/App.jsx src/screens/
git commit -m "feat: add app shell with screen routing via zustand"
```

---

### Task 5: House Models (Selection Screen)

**Files:**
- Create: `src/components/houses/ModernHouse.jsx`
- Create: `src/components/houses/ClassicHouse.jsx`
- Create: `src/components/houses/CozyHouse.jsx`

These are the compact 3D preview models shown on the selection screen. They are built from Three.js primitives inside a `<group>`.

- [ ] **Step 1: Write ModernHouse**

Create `src/components/houses/ModernHouse.jsx`:
```jsx
// Flat roof, large windows, grey/white palette
export default function ModernHouse({ hovered }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#e0e0e0' : '#cccccc'} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 2.2]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Large front window */}
      <mesh position={[0, 0.8, 1.01]}>
        <boxGeometry args={[1.2, 0.8, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.35, 1.01]}>
        <boxGeometry args={[0.45, 0.7, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Glow outline when hovered */}
      {hovered && (
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[2.1, 1.6, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 2: Write ClassicHouse**

Create `src/components/houses/ClassicHouse.jsx`:
```jsx
// Pitched roof, chimney, warm brick colors, porch
export default function ClassicHouse({ hovered }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#d4906a' : '#c07850'} />
      </mesh>
      {/* Pitched roof — two triangular halves via rotated boxes */}
      <mesh position={[0, 1.85, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.5, 1.5, 2.2]} />
        <meshStandardMaterial color="#7a3f20" />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.6, 2.2, -0.4]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
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
      {/* Front window */}
      <mesh position={[0, 0.9, 1.01]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 1.01]}>
        <boxGeometry args={[0.4, 0.6, 0.02]} />
        <meshStandardMaterial color="#5c2e00" />
      </mesh>
      {hovered && (
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[2.1, 1.6, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 3: Write CozyHouse**

Create `src/components/houses/CozyHouse.jsx`:
```jsx
// Cottage style, rounded details, wooden, flower boxes
export default function CozyHouse({ hovered }) {
  return (
    <group>
      {/* Main body — slightly smaller */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.8, 1.3, 1.8]} />
        <meshStandardMaterial color={hovered ? '#c8a882' : '#b5895a'} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.3, 1.3, 2.0]} />
        <meshStandardMaterial color="#5c4020" />
      </mesh>
      {/* Round window left */}
      <mesh position={[-0.4, 0.8, 0.91]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Round window right */}
      <mesh position={[0.4, 0.8, 0.91]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
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
      {/* Flowers (spheres) */}
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.62, 1.0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={['#ff6688', '#ffdd44', '#ff4466'][i]} />
        </mesh>
      ))}
      {hovered && (
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[1.9, 1.4, 1.9]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/houses/
git commit -m "feat: add three procedural house preview models"
```

---

### Task 6: House Selection Screen

**Files:**
- Modify: `src/screens/HouseSelect.jsx`

- [ ] **Step 1: Write HouseSelect screen**

Replace `src/screens/HouseSelect.jsx`:
```jsx
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import useGameStore from '../store/useGameStore'
import ModernHouse from '../components/houses/ModernHouse'
import ClassicHouse from '../components/houses/ClassicHouse'
import CozyHouse from '../components/houses/CozyHouse'

const HOUSES = [
  { type: 'modern',  label: 'Modern',  position: [-4, 0, 0], Component: ModernHouse },
  { type: 'classic', label: 'Classic', position: [0,  0, 0], Component: ClassicHouse },
  { type: 'cozy',    label: 'Cozy',    position: [4,  0, 0], Component: CozyHouse },
]

function RotatingHouse({ type, label, position, Component }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const selectHouse = useGameStore((s) => s.selectHouse)
  const liftY = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.6
    // Smooth lift on hover
    const target = hovered ? 0.3 : 0
    liftY.current += (target - liftY.current) * 0.1
    groupRef.current.position.y = liftY.current
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => selectHouse(type)}
      style={{ cursor: 'pointer' }}
    >
      {/* Pedestal */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.3, 32]} />
        <meshStandardMaterial color={hovered ? '#444' : '#333'} />
      </mesh>
      <Component hovered={hovered} />
    </group>
  )
}

export default function HouseSelect() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 5, 12], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

        {HOUSES.map((h) => (
          <RotatingHouse key={h.type} {...h} />
        ))}
      </Canvas>

      {/* Labels overlay */}
      <div style={{
        position: 'absolute', bottom: '10%', left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', pointerEvents: 'none',
      }}>
        {HOUSES.map((h) => (
          <div key={h.type} style={{
            color: '#fff', fontSize: 22, fontFamily: 'sans-serif',
            fontWeight: 'bold', textShadow: '0 2px 8px #000',
          }}>
            {h.label}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', top: '8%', left: 0, right: 0,
        textAlign: 'center', color: '#fff', fontSize: 32,
        fontFamily: 'sans-serif', fontWeight: 'bold',
        textShadow: '0 2px 12px #000', pointerEvents: 'none',
      }}>
        Choose Your House
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```
Expected: Three 3D houses on a dark background, slowly rotating on pedestals. Hovering lifts and highlights a house. Clicking any house switches to the "Game Screen — TODO" placeholder.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HouseSelect.jsx
git commit -m "feat: add 3D house selection screen with hover and click"
```

---

### Task 7: Pre-built House Interiors

**Files:**
- Create: `src/components/interiors/ModernInterior.jsx`
- Create: `src/components/interiors/ClassicInterior.jsx`
- Create: `src/components/interiors/CozyInterior.jsx`
- Create: `src/components/interiors/HouseInterior.jsx`

These are the playable house interiors: floors, walls, ceilings. The interior is 10x10 units (or 8x8 for cozy).

- [ ] **Step 1: Write ModernInterior**

Create `src/components/interiors/ModernInterior.jsx`:
```jsx
// 10x10 interior, flat concrete/white walls
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
      {/* Back wall */}
      <mesh position={[0, 1.5, -5]}>
        <boxGeometry args={[10, 3, 0.1]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 1.5, 5]}>
        <boxGeometry args={[10, 3, 0.1]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Right wall */}
      <mesh position={[5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Large window in front wall */}
      <mesh position={[0, 1.8, 4.96]}>
        <boxGeometry args={[4, 1.6, 0.05]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Write ClassicInterior**

Create `src/components/interiors/ClassicInterior.jsx`:
```jsx
// 10x10 interior, warm wood tones
export default function ClassicInterior() {
  return (
    <group>
      {/* Floor — wood planks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#a0622a" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f5e8d0" side={2} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 1.5, -5]}>
        <boxGeometry args={[10, 3, 0.1]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 1.5, 5]}>
        <boxGeometry args={[10, 3, 0.1]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshStandardMaterial color="#ddd0b8" />
      </mesh>
      {/* Right wall */}
      <mesh position={[5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 10]} />
        <meshStandardMaterial color="#ddd0b8" />
      </mesh>
      {/* Window */}
      <mesh position={[0, 1.8, 4.96]}>
        <boxGeometry args={[2, 1.4, 0.05]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 3: Write CozyInterior**

Create `src/components/interiors/CozyInterior.jsx`:
```jsx
// 8x8 interior, warm earthy tones
export default function CozyInterior() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#c8a060" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#f0e8d8" side={2} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 1.4, -4]}>
        <boxGeometry args={[8, 2.8, 0.1]} />
        <meshStandardMaterial color="#d4b896" />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 1.4, 4]}>
        <boxGeometry args={[8, 2.8, 0.1]} />
        <meshStandardMaterial color="#d4b896" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-4, 1.4, 0]}>
        <boxGeometry args={[0.1, 2.8, 8]} />
        <meshStandardMaterial color="#c8aa88" />
      </mesh>
      {/* Right wall */}
      <mesh position={[4, 1.4, 0]}>
        <boxGeometry args={[0.1, 2.8, 8]} />
        <meshStandardMaterial color="#c8aa88" />
      </mesh>
      {/* Round window */}
      <mesh position={[0, 1.8, 3.96]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 24]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Write HouseInterior router**

Create `src/components/interiors/HouseInterior.jsx`:
```jsx
import ModernInterior from './ModernInterior'
import ClassicInterior from './ClassicInterior'
import CozyInterior from './CozyInterior'

export default function HouseInterior({ type }) {
  if (type === 'modern') return <ModernInterior />
  if (type === 'classic') return <ClassicInterior />
  if (type === 'cozy') return <CozyInterior />
  return null
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/interiors/
git commit -m "feat: add three pre-built house interiors with walls, floors, ceilings"
```

---

### Task 8: Character Model

**Files:**
- Create: `src/components/character/Character.jsx`

Low-poly humanoid built entirely from boxes and cylinders. The component accepts `position`, `rotation`, and `walkTime` props.

- [ ] **Step 1: Write Character component**

Create `src/components/character/Character.jsx`:
```jsx
// Low-poly humanoid character
// walkTime: number that increments while walking (drives arm/leg swing)
export default function Character({ position = [0, 0, 0], rotation = 0, walkTime = 0 }) {
  const swing = Math.sin(walkTime * 8) * 0.4

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Torso */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.3]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.32, 1.0, 0]} rotation={[swing, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.32, 1.0, 0]} rotation={[-swing, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.14, 0.35, 0]} rotation={[-swing, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.14, 0.35, 0]} rotation={[swing, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/character/Character.jsx
git commit -m "feat: add low-poly procedural character model with walk animation"
```

---

### Task 9: Character Movement Hook

**Files:**
- Create: `src/components/character/useCharacterMovement.js`

- [ ] **Step 1: Write the movement hook**

Create `src/components/character/useCharacterMovement.js`:
```js
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { isInsideBounds, isBlocked } from '../../utils/collision'
import { HOUSE_BOUNDS, FURNITURE_SIZES } from '../../utils/furnitureSizes'
import useGameStore from '../../store/useGameStore'

const SPEED = 4
const CHAR_SIZE = { w: 0.4, d: 0.4 }

export default function useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType) {
  const keys = useRef(new Set())

  useEffect(() => {
    const down = (e) => keys.current.add(e.key.toLowerCase())
    const up = (e) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const k = keys.current
    let dx = 0, dz = 0

    if (k.has('w') || k.has('arrowup'))    dz -= 1
    if (k.has('s') || k.has('arrowdown'))  dz += 1
    if (k.has('a') || k.has('arrowleft'))  dx -= 1
    if (k.has('d') || k.has('arrowright')) dx += 1

    if (dx === 0 && dz === 0) return

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dz * dz)
    dx = (dx / len) * SPEED * delta
    dz = (dz / len) * SPEED * delta

    const [cx, cy, cz] = positionRef.current
    const nx = cx + dx
    const nz = cz + dz

    const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const placedItems = useGameStore.getState().placedItems

    const canX = isInsideBounds(nx, cz, bounds) && !isBlocked(nx, cz, CHAR_SIZE, placedItems, FURNITURE_SIZES)
    const canZ = isInsideBounds(cx, nz, bounds) && !isBlocked(cx, nz, CHAR_SIZE, placedItems, FURNITURE_SIZES)

    const finalX = canX ? nx : cx
    const finalZ = canZ ? nz : cz

    positionRef.current = [finalX, cy, finalZ]

    // Face direction of travel
    if (canX || canZ) {
      rotationRef.current = Math.atan2(dx, dz)
      walkTimeRef.current += delta
    }

    useGameStore.getState().setCharacterPosition(positionRef.current)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/character/useCharacterMovement.js
git commit -m "feat: add WASD character movement hook with collision"
```

---

### Task 10: First-Person Hand

**Files:**
- Create: `src/components/character/FirstPersonHand.jsx`

Renders a right arm/fist fixed to the screen in first-person mode. Uses `useFrame` for subtle bob.

- [ ] **Step 1: Write FirstPersonHand**

Create `src/components/character/FirstPersonHand.jsx`:
```jsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export default function FirstPersonHand({ isWalking }) {
  const handRef = useRef()
  const { camera } = useThree()
  const bobTime = useRef(0)

  useFrame((_, delta) => {
    if (!handRef.current) return
    if (isWalking) bobTime.current += delta * 8

    // Position hand relative to camera: bottom-right, forward
    const offsetRight = 0.35
    const offsetDown = -0.28
    const offsetForward = -0.5
    const bob = isWalking ? Math.sin(bobTime.current) * 0.02 : 0

    handRef.current.position.set(
      camera.position.x + Math.cos(camera.rotation.y + Math.PI / 2) * offsetRight + Math.sin(camera.rotation.y) * offsetForward,
      camera.position.y + offsetDown + bob,
      camera.position.z - Math.sin(camera.rotation.y + Math.PI / 2) * offsetRight - Math.cos(camera.rotation.y) * offsetForward
    )
    handRef.current.rotation.copy(camera.rotation)
  })

  return (
    <group ref={handRef}>
      {/* Forearm */}
      <mesh position={[0, 0, 0.1]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.35]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
      {/* Fist */}
      <mesh position={[0, -0.02, -0.05]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.12]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/character/FirstPersonHand.jsx
git commit -m "feat: add first-person hand component that follows camera"
```

---

### Task 11: Game Screen + Camera

**Files:**
- Create: `src/components/camera/IsometricCamera.jsx`
- Modify: `src/screens/GameScreen.jsx`

- [ ] **Step 1: Write IsometricCamera**

Create `src/components/camera/IsometricCamera.jsx`:
```jsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const ISO_OFFSET = new THREE.Vector3(12, 12, 12)

export default function IsometricCamera({ target, mode }) {
  const { camera } = useThree()
  const currentTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const t = new THREE.Vector3(...target)

    if (mode === 'third') {
      // Smoothly follow character from isometric angle
      currentTarget.current.lerp(t, 0.08)
      camera.position.copy(currentTarget.current).add(ISO_OFFSET)
      camera.lookAt(currentTarget.current)
    } else {
      // First-person: camera at head height
      currentTarget.current.lerp(t, 0.15)
      camera.position.set(
        currentTarget.current.x,
        currentTarget.current.y + 1.55,
        currentTarget.current.z
      )
      // Keep looking forward (don't reset rotation — let character control it)
    }
  })

  return null
}
```

- [ ] **Step 2: Write full GameScreen**

Replace `src/screens/GameScreen.jsx`:
```jsx
import { useRef, useState, useEffect } from 'react'
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

function Scene({ houseType }) {
  const positionRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const walkTimeRef = useRef(0)

  const cameraMode = useGameStore((s) => s.cameraMode)
  const heldItem = useGameStore((s) => s.heldItem)
  const placedItems = useGameStore((s) => s.placedItems)
  const characterPosition = useGameStore((s) => s.characterPosition)

  useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 12, 8]} intensity={1.0} castShadow />

      <IsometricCamera target={characterPosition} mode={cameraMode} />
      <HouseInterior type={houseType} />

      {cameraMode === 'third' && (
        <Character
          position={positionRef.current}
          rotation={rotationRef.current}
          walkTime={walkTimeRef.current}
        />
      )}

      {cameraMode === 'first' && <FirstPersonHand isWalking={false} />}

      {placedItems.map((item) => (
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
  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const cancelHeld = useGameStore((s) => s.cancelHeld)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        setCameraMode(cameraMode === 'third' ? 'first' : 'third')
      }
      if (e.key === 'e' || e.key === 'E') {
        toggleInventory()
      }
      if (e.key === 'Escape') {
        cancelHeld()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cameraMode, setCameraMode, toggleInventory, cancelHeld])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ fov: 50 }} style={{ background: '#87ceeb' }}>
        <Scene houseType={selectedHouse} />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        color: '#fff', fontFamily: 'sans-serif', fontSize: 13,
        textShadow: '0 1px 4px #000', pointerEvents: 'none',
        lineHeight: 1.8,
      }}>
        <div>WASD — Move</div>
        <div>E — Inventory</div>
        <div>V — Camera ({cameraMode === 'third' ? '3rd Person' : '1st Person'})</div>
        <div>R — Rotate item</div>
        <div>Esc — Cancel</div>
      </div>

      {/* Inventory toggle button */}
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
        {inventoryOpen ? 'Close Inventory' : 'Inventory [E]'}
      </button>

      {inventoryOpen && <InventoryPanel />}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Click any house on the selection screen. Expected: game screen loads, sky-blue background, house interior visible, character visible in center, HUD text in bottom-left, inventory button top-right.

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameScreen.jsx src/components/camera/
git commit -m "feat: add game screen with isometric camera, scene assembly, keyboard controls"
```

---

### Task 12: Furniture Models

**Files:**
- Create: `src/components/furniture/Chair.jsx`
- Create: `src/components/furniture/FurnitureLight.jsx`
- Create: `src/components/furniture/WallClock.jsx`
- Create: `src/components/furniture/Plant.jsx`
- Create: `src/components/furniture/Fridge.jsx`
- Create: `src/components/furniture/Fan.jsx`
- Create: `src/components/furniture/Painting.jsx`
- Create: `src/components/furniture/FurnitureMesh.jsx`

- [ ] **Step 1: Write Chair**

Create `src/components/furniture/Chair.jsx`:
```jsx
export default function Chair({ color = '#8b4513' }) {
  return (
    <group>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.75, -0.31]} castShadow>
        <boxGeometry args={[0.7, 0.55, 0.07]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 4 legs */}
      {[[-0.28, -0.28], [-0.28, 0.28], [0.28, -0.28], [0.28, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
          <meshStandardMaterial color="#5c3010" />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Write FurnitureLight (floor lamp)**

Create `src/components/furniture/FurnitureLight.jsx`:
```jsx
export default function FurnitureLight() {
  return (
    <group>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.3, 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#f5e08a" side={2} />
      </mesh>
      {/* Bulb glow */}
      <pointLight position={[0, 1.4, 0]} intensity={1.5} distance={4} color="#ffe8a0" />
    </group>
  )
}
```

- [ ] **Step 3: Write WallClock**

Create `src/components/furniture/WallClock.jsx`:
```jsx
export default function WallClock() {
  return (
    <group>
      {/* Clock face */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#f5f0e0" />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 8, 24]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Hour hand */}
      <mesh position={[0, 0.1, 0.04]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.04, 0.16, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0.06, 0.08, 0.04]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.03, 0.22, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 4: Write Plant**

Create `src/components/furniture/Plant.jsx`:
```jsx
export default function Plant() {
  return (
    <group>
      {/* Pot */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.4, 12]} />
        <meshStandardMaterial color="#c87941" />
      </mesh>
      {/* Dirt */}
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 12]} />
        <meshStandardMaterial color="#4a2800" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#2d8a30" />
      </mesh>
      <mesh position={[0.1, 0.95, 0.05]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#3aaa3e" />
      </mesh>
      <mesh position={[-0.08, 0.88, -0.08]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#228822" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 5: Write Fridge**

Create `src/components/furniture/Fridge.jsx`:
```jsx
export default function Fridge() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.9, 1.8, 0.7]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Door seam line */}
      <mesh position={[0, 0.55, 0.36]}>
        <boxGeometry args={[0.88, 0.02, 0.02]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      {/* Upper handle */}
      <mesh position={[0.3, 1.1, 0.37]}>
        <boxGeometry args={[0.06, 0.25, 0.05]} />
        <meshStandardMaterial color="#999" />
      </mesh>
      {/* Lower handle */}
      <mesh position={[0.3, 0.35, 0.37]}>
        <boxGeometry args={[0.06, 0.2, 0.05]} />
        <meshStandardMaterial color="#999" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 6: Write Fan**

Create `src/components/furniture/Fan.jsx`:
```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Fan() {
  const bladesRef = useRef()

  useFrame((_, delta) => {
    if (bladesRef.current) {
      bladesRef.current.rotation.y += delta * 6
    }
  })

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.25, 0.28, 0.12, 16]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      {/* Spinning blades */}
      <group ref={bladesRef} position={[0, 0.95, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0, 0]} rotation={[0, (i * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.35, 0.04, 0.1]} />
            <meshStandardMaterial color="#88aacc" />
          </mesh>
        ))}
        {/* Center hub */}
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </group>
    </group>
  )
}
```

- [ ] **Step 7: Write Painting**

Create `src/components/furniture/Painting.jsx`:
```jsx
const PAINTINGS = [
  { bg: '#1a3a6e', accent: '#f0c040' },
  { bg: '#5a1a1a', accent: '#40c0a0' },
  { bg: '#1a4a1a', accent: '#e080c0' },
]

// Pick a stable color based on position hash
function pickStyle(position) {
  const hash = Math.abs(Math.round(position[0] * 7 + position[2] * 13)) % PAINTINGS.length
  return PAINTINGS[hash]
}

export default function Painting({ position = [0, 0, 0] }) {
  const style = pickStyle(position)
  return (
    <group>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[1.0, 0.75, 0.05]} />
        <meshStandardMaterial color="#5c3010" />
      </mesh>
      {/* Canvas */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.88, 0.63, 0.01]} />
        <meshStandardMaterial color={style.bg} />
      </mesh>
      {/* Abstract art: colored shape */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.4, 0.35, 0.01]} />
        <meshStandardMaterial color={style.accent} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 8: Write FurnitureMesh router**

Create `src/components/furniture/FurnitureMesh.jsx`:
```jsx
import Chair from './Chair'
import FurnitureLight from './FurnitureLight'
import WallClock from './WallClock'
import Plant from './Plant'
import Fridge from './Fridge'
import Fan from './Fan'
import Painting from './Painting'

export default function FurnitureMesh({ type, position }) {
  switch (type) {
    case 'chair':    return <Chair />
    case 'light':    return <FurnitureLight />
    case 'clock':    return <WallClock />
    case 'plant':    return <Plant />
    case 'fridge':   return <Fridge />
    case 'fan':      return <Fan />
    case 'painting': return <Painting position={position} />
    default:         return null
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/furniture/
git commit -m "feat: add all 7 procedural furniture models"
```

---

### Task 13: Inventory Panel

**Files:**
- Create: `src/components/inventory/InventoryPanel.jsx`

Pure React UI — no R3F. Slides in from the right. Displays 7 item buttons.

- [ ] **Step 1: Write InventoryPanel**

Create `src/components/inventory/InventoryPanel.jsx`:
```jsx
import useGameStore from '../../store/useGameStore'

const ITEMS = [
  { type: 'chair',    label: 'Chair',    emoji: '🪑' },
  { type: 'light',    label: 'Lamp',     emoji: '💡' },
  { type: 'clock',    label: 'Clock',    emoji: '🕐' },
  { type: 'plant',    label: 'Plant',    emoji: '🌿' },
  { type: 'fridge',   label: 'Fridge',   emoji: '🧊' },
  { type: 'fan',      label: 'Fan',      emoji: '🌀' },
  { type: 'painting', label: 'Painting', emoji: '🖼' },
]

export default function InventoryPanel() {
  const setHeldItem = useGameStore((s) => s.setHeldItem)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 200, height: '100%',
      background: 'rgba(20, 20, 30, 0.92)',
      borderLeft: '1px solid #444',
      display: 'flex', flexDirection: 'column',
      padding: 16, gap: 8,
      fontFamily: 'sans-serif',
    }}>
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        Inventory
      </div>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 12 }}>
        Click to place · R to rotate · Esc to cancel
      </div>
      {ITEMS.map(({ type, label, emoji }) => (
        <button
          key={type}
          onClick={() => setHeldItem({ type })}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#2a2a3a', border: '1px solid #555',
            borderRadius: 6, padding: '10px 12px',
            color: '#fff', fontSize: 14, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a5a'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a3a'}
        >
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open inventory with `E` key or button. Expected: panel slides in from right, 7 furniture buttons visible. Clicking any button closes the panel.

- [ ] **Step 3: Commit**

```bash
git add src/components/inventory/
git commit -m "feat: add inventory panel with 7 furniture items"
```

---

### Task 14: Furniture Placement (Ghost + Place)

**Files:**
- Create: `src/components/furniture/GhostItem.jsx`
- Create: `src/components/furniture/PlacedItem.jsx`

`GhostItem` uses raycasting against a floor plane to follow the mouse. It snaps to grid and shows green/red based on validity. Clicking places the item. `R` key rotates it 90°.

- [ ] **Step 1: Write GhostItem**

Create `src/components/furniture/GhostItem.jsx`:
```jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { snapPosition } from '../../utils/grid'
import { isBlocked, isInsideBounds } from '../../utils/collision'
import { FURNITURE_SIZES, HOUSE_BOUNDS } from '../../utils/furnitureSizes'
import useGameStore from '../../store/useGameStore'
import FurnitureMesh from './FurnitureMesh'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

export default function GhostItem({ type, houseType }) {
  const { camera, gl } = useThree()
  const ghostRef = useRef()
  const [pos, setPos] = useState([0, 0, 0])
  const [rotation, setRotation] = useState(0)
  const [valid, setValid] = useState(true)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const placeItem = useGameStore((s) => s.placeItem)
  const cancelHeld = useGameStore((s) => s.cancelHeld)
  const placedItems = useGameStore((s) => s.placedItems)

  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onRotate = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => r + Math.PI / 2)
      }
    }

    const onClick = (e) => {
      if (e.button !== 0) return
      setPos((current) => {
        const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
        const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }
        const blocked = isBlocked(current[0], current[2], size, placedItems, FURNITURE_SIZES)
        const inside = isInsideBounds(current[0], current[2], bounds)
        if (inside && !blocked) {
          placeItem(type, current, rotation)
        }
        return current
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onRotate)
    gl.domElement.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onRotate)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [gl, type, houseType, rotation, placedItems, placeItem])

  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const target = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(floorPlane, target)
    if (!target) return

    const snapped = snapPosition(target.x, target.z)
    setPos(snapped)

    const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }
    const blocked = isBlocked(snapped[0], snapped[2], size, placedItems, FURNITURE_SIZES)
    const inside = isInsideBounds(snapped[0], snapped[2], bounds)
    setValid(inside && !blocked)
  })

  return (
    <group ref={ghostRef} position={pos} rotation={[0, rotation, 0]}>
      {/* Ghost overlay */}
      <mesh>
        <boxGeometry args={[
          FURNITURE_SIZES[type]?.w ?? 1,
          1,
          FURNITURE_SIZES[type]?.d ?? 1,
        ]} />
        <meshStandardMaterial
          color={valid ? '#00ff88' : '#ff3333'}
          transparent
          opacity={0.35}
        />
      </mesh>
      <FurnitureMesh type={type} position={pos} />
    </group>
  )
}
```

- [ ] **Step 2: Write PlacedItem**

Create `src/components/furniture/PlacedItem.jsx`:
```jsx
import { useState } from 'react'
import FurnitureMesh from './FurnitureMesh'

export default function PlacedItem({ id, type, position, rotation }) {
  const [hovered, setHovered] = useState(false)

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {hovered && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.15} wireframe />
        </mesh>
      )}
      <FurnitureMesh type={type} position={position} />
    </group>
  )
}
```

- [ ] **Step 3: Verify in browser**

1. Open inventory (`E`), click Chair.
2. Move mouse over the floor — a ghost chair follows, snapping to grid.
3. Ghost turns red near walls or blocked spots.
4. Press `R` to rotate the ghost.
5. Click a valid spot — chair appears placed, solid.

- [ ] **Step 4: Commit**

```bash
git add src/components/furniture/GhostItem.jsx src/components/furniture/PlacedItem.jsx
git commit -m "feat: add ghost item placement with grid snap, validation, and rotation"
```

---

### Task 15: Move Placed Items (Drag to Reposition)

**Files:**
- Modify: `src/components/furniture/PlacedItem.jsx`
- Modify: `src/store/useGameStore.js`

Clicking and dragging a placed item picks it back up into ghost mode (held item), removes it from `placedItems`, and re-enters placement flow. Pressing `Escape` puts it back.

- [ ] **Step 1: Add removeItem action to store**

Replace `src/store/useGameStore.js`:
```js
import { create } from 'zustand'

const useGameStore = create((set) => ({
  selectedHouse: null,
  cameraMode: 'third',
  inventoryOpen: false,
  placedItems: [],
  heldItem: null,
  characterPosition: [0, 0, 0],

  selectHouse: (house) => set({ selectedHouse: house }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  setHeldItem: (item) => set({ heldItem: item, inventoryOpen: false }),
  placeItem: (type, position, rotation) =>
    set((s) => ({
      placedItems: [...s.placedItems, { id: Date.now() + Math.random(), type, position, rotation }],
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
}))

export default useGameStore
```

- [ ] **Step 2: Update PlacedItem to support drag-to-move**

Replace `src/components/furniture/PlacedItem.jsx`:
```jsx
import { useState } from 'react'
import FurnitureMesh from './FurnitureMesh'
import useGameStore from '../../store/useGameStore'

export default function PlacedItem({ id, type, position, rotation }) {
  const [hovered, setHovered] = useState(false)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const removeItem = useGameStore((s) => s.removeItem)
  const heldItem = useGameStore((s) => s.heldItem)

  // Don't allow picking up while already holding something
  const handleClick = (e) => {
    if (heldItem) return
    e.stopPropagation()
    removeItem(id)
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
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.2} wireframe />
        </mesh>
      )}
      <FurnitureMesh type={type} position={position} />
    </group>
  )
}
```

- [ ] **Step 3: Update store tests to include removeItem**

Add to `src/store/useGameStore.test.js`:
```js
describe('removeItem', () => {
  it('removes item by id', () => {
    useGameStore.setState({ placedItems: [{ id: 99, type: 'plant', position: [0,0,0], rotation: 0 }] })
    act(() => useGameStore.getState().removeItem(99))
    expect(useGameStore.getState().placedItems).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 5: Verify in browser**

1. Place a chair somewhere.
2. Hover over it — yellow wireframe outline appears.
3. Click it — chair lifts back into ghost mode, follows mouse.
4. Place it in a new spot.
5. Click it and press `Escape` — chair disappears from scene (goes to held item, then cancelled).

- [ ] **Step 6: Final commit**

```bash
git add src/components/furniture/PlacedItem.jsx src/store/useGameStore.js src/store/useGameStore.test.js
git commit -m "feat: allow clicking placed items to pick up and reposition"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| House selection screen with 3 rotating 3D houses | Task 5, 6 |
| Modern / Classic / Cozy styles | Task 5 |
| Hover lift + glow, click to select | Task 6 |
| Isometric third-person camera follows character | Task 11 |
| First-person camera mode (V key) | Task 11 |
| Right hand in first-person | Task 10 |
| WASD character movement | Task 9 |
| Bounding box collision with walls + furniture | Task 9 |
| Pre-built house interiors (walls, floors, ceilings) | Task 7 |
| Inventory panel (E key), 7 items | Task 13 |
| Drag-to-place with ghost preview | Task 14 |
| Green/red validity indicator | Task 14 |
| Grid snapping | Task 3, 14 |
| R key to rotate held item | Task 14 |
| Escape to cancel placement | Task 11 |
| Click placed item to pick up and move | Task 15 |
| Fan spinning animation | Task 12 |
| All 7 furniture models (chair, light, clock, plant, fridge, fan, painting) | Task 12 |

All spec requirements covered. No gaps found.

**Placeholder scan:** No TBDs, TODOs, or incomplete sections found.

**Type consistency:** `useGameStore` action names consistent across all tasks (`placeItem`, `moveItem`, `removeItem`, `setHeldItem`, `cancelHeld`). `FurnitureMesh` type strings (`'chair'`, `'light'`, `'clock'`, `'plant'`, `'fridge'`, `'fan'`, `'painting'`) match `FURNITURE_SIZES` keys and `InventoryPanel` item types throughout.
