import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// positionRef, rotationRef, walkTimeRef are refs shared with useCharacterMovement
// We read them every frame and apply directly to the group — no React re-renders needed
export default function Character({ positionRef, rotationRef, walkTimeRef }) {
  const groupRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    const [x, y, z] = positionRef.current
    groupRef.current.position.set(x, y, z)
    groupRef.current.rotation.y = rotationRef.current

    const swing = Math.sin(walkTimeRef.current * 8) * 0.4
    if (leftArmRef.current)  leftArmRef.current.rotation.x  =  swing
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing
    if (leftLegRef.current)  leftLegRef.current.rotation.x  = -swing
    if (rightLegRef.current) rightLegRef.current.rotation.x =  swing
  })

  return (
    <group ref={groupRef}>
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
      <mesh ref={leftArmRef} position={[-0.32, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.32, 1.0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
      {/* Left leg */}
      <mesh ref={leftLegRef} position={[-0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
      {/* Right leg */}
      <mesh ref={rightLegRef} position={[0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a5a" />
      </mesh>
    </group>
  )
}
