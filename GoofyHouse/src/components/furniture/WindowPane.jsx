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
