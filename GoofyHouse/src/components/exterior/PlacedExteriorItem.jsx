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
