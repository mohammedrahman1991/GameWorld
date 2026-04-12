import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Right hand model fixed in first-person view.
// isMovingRef: ref whose .current is true when character is walking
export default function FirstPersonHand({ isMovingRef }) {
  const handRef = useRef()
  const { camera } = useThree()
  const bobTime = useRef(0)

  useFrame((_, delta) => {
    if (!handRef.current) return
    if (isMovingRef?.current) bobTime.current += delta * 8

    const bob = isMovingRef?.current ? Math.sin(bobTime.current) * 0.015 : 0

    // Offset relative to camera: right, down, forward
    const right = 0.32
    const down = -0.26
    const forward = 0.5

    const cos = Math.cos(camera.rotation.y)
    const sin = Math.sin(camera.rotation.y)

    handRef.current.position.set(
      camera.position.x + sin * forward + cos * right,
      camera.position.y + down + bob,
      camera.position.z + cos * forward - sin * right
    )
    handRef.current.rotation.y = camera.rotation.y
  })

  return (
    <group ref={handRef}>
      {/* Forearm */}
      <mesh position={[0, 0, 0.12]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.3]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
      {/* Fist */}
      <mesh position={[0, -0.02, -0.04]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.12]} />
        <meshStandardMaterial color="#f5c5a0" />
      </mesh>
      {/* Sleeve cuff */}
      <mesh position={[0, 0.02, 0.2]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.06]} />
        <meshStandardMaterial color="#3a7fc1" />
      </mesh>
    </group>
  )
}
