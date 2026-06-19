import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useGameStore = create(persist((set) => ({
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

  // ── Exterior edit mode ──────────────────────────────────────────────────
  editMode: 'interior',         // 'interior' | 'exterior'
  exteriorInventoryOpen: false,
  exteriorItems: [],            // [{ id, type, position:[x,y,z], rotation }]
  roofStyle: 'flat',            // 'flat' | 'pitched' | 'gabled'
  roofColor: '#555555',

  // ── Existing actions ────────────────────────────────────────────────────
  selectHouse: (house) => set({ selectedHouse: house }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  setHeldItem: (item) => set({ heldItem: item, inventoryOpen: false, paintMode: false, exteriorInventoryOpen: false }),
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

  // ── Multi-floor actions ──────────────────────────────────────────────────
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

  // ── Exterior edit actions ────────────────────────────────────────────────
  setEditMode: (mode) => set({ editMode: mode }),
  toggleExteriorInventory: () => set((s) => ({ exteriorInventoryOpen: !s.exteriorInventoryOpen })),
  addExteriorItem: (type, position, rotation) =>
    set((s) => ({
      exteriorItems: [...s.exteriorItems, { id: Date.now() + Math.random(), type, position, rotation }],
      heldItem: null,
    })),
  removeExteriorItem: (id) =>
    set((s) => ({ exteriorItems: s.exteriorItems.filter((item) => item.id !== id) })),
  setRoofStyle: (style) => set({ roofStyle: style }),
  setRoofColor: (color) => set({ roofColor: color }),
}), {
  name: 'goofy-house-save',
  partialize: (s) => ({
    placedItems:    s.placedItems,
    floorTiles:     s.floorTiles,
    placedWindows:  s.placedWindows,
    exteriorItems:  s.exteriorItems,
    roofStyle:      s.roofStyle,
    roofColor:      s.roofColor,
    currentFloor:   s.currentFloor,
    selectedHouse:  s.selectedHouse,
  }),
}))

export default useGameStore
