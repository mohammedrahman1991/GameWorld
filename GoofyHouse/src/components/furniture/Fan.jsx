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
      {/* Spinning blades group */}
      <group ref={bladesRef} position={[0, 0.95, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
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
