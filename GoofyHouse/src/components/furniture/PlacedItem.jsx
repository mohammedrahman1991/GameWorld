import { useState } from 'react'
import FurnitureMesh from './FurnitureMesh'
import useGameStore from '../../store/useGameStore'

export default function PlacedItem({ id, type, position, rotation }) {
  const [hovered, setHovered] = useState(false)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const removeItem = useGameStore((s) => s.removeItem)
  const heldItem = useGameStore((s) => s.heldItem)

  const handleClick = (e) => {
    if (heldItem) return       // Can't pick up while already holding something
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
