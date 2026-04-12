import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const ISO_OFFSET = new THREE.Vector3(12, 12, 12)
const EXTERIOR_POS = new THREE.Vector3(0, 30, 20)
const EXTERIOR_TARGET = new THREE.Vector3(0, 0, 0)

// Handles all three camera modes:
// 'third'    — isometric follow cam behind character
// 'exterior' — fixed overhead for yard editing
// 'first'    — first-person at character head height
export default function IsometricCamera({ target, mode, rotationRef }) {
  const { camera } = useThree()
  const smoothTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const t = new THREE.Vector3(...target)

    if (mode === 'exterior') {
      camera.position.lerp(EXTERIOR_POS, 0.06)
      camera.lookAt(EXTERIOR_TARGET)
      return
    }

    if (mode === 'third') {
      smoothTarget.current.lerp(t, 0.08)
      const newPos = smoothTarget.current.clone().add(ISO_OFFSET)
      camera.position.copy(newPos)
      camera.lookAt(smoothTarget.current)
    } else {
      // First-person: position camera at head height, look in direction character faces
      smoothTarget.current.lerp(t, 0.2)
      camera.position.set(
        smoothTarget.current.x,
        smoothTarget.current.y + 1.55,
        smoothTarget.current.z
      )
      const yaw = rotationRef?.current ?? 0
      camera.rotation.set(0, yaw + Math.PI, 0)
    }
  })

  return null
}
