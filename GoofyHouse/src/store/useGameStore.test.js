import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import useGameStore from './useGameStore'

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

describe('removeItem', () => {
  it('removes item by id', () => {
    useGameStore.setState({ placedItems: [{ id: 99, type: 'plant', position: [0, 0, 0], rotation: 0 }] })
    act(() => useGameStore.getState().removeItem(99))
    expect(useGameStore.getState().placedItems).toHaveLength(0)
  })
})

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
