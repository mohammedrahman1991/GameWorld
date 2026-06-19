import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const CAM_DIST   = 7    // units behind character
const CAM_HEIGHT = 5.5  // units above character
const EXTERIOR_POS    = new THREE.Vector3(0, 30, 20)
const EXTERIOR_TARGET = new THREE.Vector3(0, 0, 0)

export default function IsometricCamera({ target, mode, rotationRef }) {
  const { camera } = useThree()
  const smoothPos  = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3())
  const initialized = useRef(false)

  useFrame(() => {
    const t = new THREE.Vector3(...target)

    if (mode === 'exterior') {
      camera.position.lerp(EXTERIOR_POS, 0.06)
      camera.lookAt(EXTERIOR_TARGET)
      return
    }

    if (mode === 'third') {
      const yaw = rotationRef?.current ?? 0
      // Camera sits directly behind the character based on their facing direction
      const want = t.clone().add(new THREE.Vector3(
        -Math.sin(yaw) * CAM_DIST,
        CAM_HEIGHT,
        -Math.cos(yaw) * CAM_DIST,
      ))
      const lookAt = t.clone().add(new THREE.Vector3(0, 0.8, 0))

      if (!initialized.current) {
        smoothPos.current.copy(want)
        smoothLook.current.copy(lookAt)
        initialized.current = true
      }
      smoothPos.current.lerp(want, 0.08)
      smoothLook.current.lerp(lookAt, 0.12)
      camera.position.copy(smoothPos.current)
      camera.lookAt(smoothLook.current)
    } else {
      // First-person
      const yaw = rotationRef?.current ?? 0
      const fp = t.clone()
      fp.y += 1.55
      smoothPos.current.lerp(fp, 0.2)
      camera.position.copy(smoothPos.current)
      camera.rotation.set(0, yaw + Math.PI, 0)
    }
  })

  return null
}
