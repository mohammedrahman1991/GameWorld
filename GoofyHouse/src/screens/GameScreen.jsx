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
import ExteriorInventoryPanel from '../components/inventory/ExteriorInventoryPanel'
import PlacedItem from '../components/furniture/PlacedItem'
import GhostItem from '../components/furniture/GhostItem'
import WindowPanes from '../components/furniture/WindowPane'
import Shopkeeper from '../components/npc/Shopkeeper'
import ShopMenu from '../components/npc/ShopMenu'
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
  const currentFloor = useGameStore((s) => s.currentFloor)

  const isMovingRef = useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType)

  const isInterior = editMode === 'interior'

  // Items visible on current floor only
  const floorItems = placedItems.filter((i) => (i.floor ?? 0) === currentFloor)

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
          <Character
            positionRef={positionRef}
            rotationRef={rotationRef}
            walkTimeRef={walkTimeRef}
          />
        )}

        {cameraMode === 'first' && (
          <FirstPersonHand isMovingRef={isMovingRef} />
        )}

        {floorItems.map((item) => (
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
  const currentFloor = useGameStore((s) => s.currentFloor)
  const shopOpen = useGameStore((s) => s.shopOpen)
  const heldItem = useGameStore((s) => s.heldItem)
  const paintMode = useGameStore((s) => s.paintMode)

  const setCameraMode = useGameStore((s) => s.setCameraMode)
  const setEditMode = useGameStore((s) => s.setEditMode)
  const toggleInventory = useGameStore((s) => s.toggleInventory)
  const toggleExteriorInventory = useGameStore((s) => s.toggleExteriorInventory)
  const cancelHeld = useGameStore((s) => s.cancelHeld)
  const setCurrentFloor = useGameStore((s) => s.setCurrentFloor)
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const exitPaintMode = useGameStore((s) => s.exitPaintMode)

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
        if (editMode === 'exterior') {
          if (!heldItem) toggleExteriorInventory()
          return
        }
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
  }, [cameraMode, editMode, setCameraMode, setEditMode, toggleInventory, toggleExteriorInventory, cancelHeld, heldItem, shopOpen, currentFloor, paintMode, setShopOpen, exitPaintMode])

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
        color: '#fff', fontFamily: 'sans-serif', fontSize: 12,
        textShadow: '0 1px 4px #000', pointerEvents: 'none',
        lineHeight: 1.8, background: 'rgba(0,0,0,0.35)',
        padding: '8px 12px', borderRadius: 6,
      }}>
        {editMode === 'interior' && <div>WASD — Move &nbsp;|&nbsp; Floor: {currentFloor + 1}/3</div>}
        <div>E — {editMode === 'exterior' ? 'Exterior Inventory' : 'Inventory/Shop'}</div>
        <div>V — Mode ({modeLabel})</div>
        {editMode === 'interior' && <div>R — Rotate &nbsp;|&nbsp; Esc — Cancel</div>}
        {editMode === 'exterior' && <div>R — Rotate item &nbsp; Esc — Cancel</div>}
        {paintMode && <div style={{ color: '#aaffaa' }}>Paint mode — click floor tiles</div>}
      </div>

      {/* Floor switcher buttons — only in interior mode */}
      {editMode === 'interior' && (
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
      )}

      {/* Interior inventory toggle button */}
      {editMode === 'interior' && !heldItem && !shopOpen && !paintMode && (
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

      {/* Placement hint */}
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
      {inventoryOpen && editMode === 'interior' && !heldItem && !shopOpen && <InventoryPanel />}

      {/* Shop menu */}
      {shopOpen && <ShopMenu />}

      {/* Exterior inventory panel */}
      {exteriorInventoryOpen && editMode === 'exterior' && !heldItem && <ExteriorInventoryPanel />}
    </div>
  )
}
