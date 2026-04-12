import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import useGameStore from '../store/useGameStore'
import ModernHouse from '../components/houses/ModernHouse'
import ClassicHouse from '../components/houses/ClassicHouse'
import CozyHouse from '../components/houses/CozyHouse'

const HOUSES = [
  { type: 'modern',  label: 'Modern',  position: [-4, 0, 0], Component: ModernHouse },
  { type: 'classic', label: 'Classic', position: [0,  0, 0], Component: ClassicHouse },
  { type: 'cozy',    label: 'Cozy',    position: [4,  0, 0], Component: CozyHouse },
]

function RotatingHouse({ type, position, Component }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const selectHouse = useGameStore((s) => s.selectHouse)
  const liftY = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.6
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
        camera={{ position: [0, 7, 16], fov: 50 }}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

        {HOUSES.map((h) => (
          <RotatingHouse key={h.type} {...h} />
        ))}
      </Canvas>

      {/* House name labels */}
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
