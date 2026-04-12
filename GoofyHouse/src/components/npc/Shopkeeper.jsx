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
