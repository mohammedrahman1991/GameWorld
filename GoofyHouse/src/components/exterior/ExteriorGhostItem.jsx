import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { snapPosition } from '../../utils/grid'
import useGameStore from '../../store/useGameStore'
import ExteriorItemMesh from './ExteriorItemMesh'

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// House footprint bounds per house type — items may NOT be placed inside
const HOUSE_FOOTPRINT = {
  modern:  { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  classic: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
  cozy:    { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
}

function isInsideFootprint(x, z, footprint) {
  return (
    x >= footprint.minX && x <= footprint.maxX &&
    z >= footprint.minZ && z <= footprint.maxZ
  )
}

export default function ExteriorGhostItem({ type, houseType }) {
  const { camera, gl } = useThree()
  const posRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const validRef = useRef(false)
  const [displayPos, setDisplayPos] = useState([0, 0, 0])
  const [displayRot, setDisplayRot] = useState(0)
  const [valid, setValid] = useState(false)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const addExteriorItem = useGameStore((s) => s.addExteriorItem)

  const footprint = HOUSE_FOOTPRINT[houseType] || HOUSE_FOOTPRINT.modern

  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        rotationRef.current = rotationRef.current + Math.PI / 2
        setDisplayRot(rotationRef.current)
      }
    }

    const onClick = () => {
      if (!validRef.current) return
      addExteriorItem(type, [...posRef.current], rotationRef.current)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    gl.domElement.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [gl, type, addExteriorItem])

  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const hit = new THREE.Vector3()
    const intersects = raycaster.current.ray.intersectPlane(groundPlane, hit)
    if (!intersects) return

    const snapped = snapPosition(hit.x, hit.z)
    posRef.current = snapped

    const outsideHouse = !isInsideFootprint(snapped[0], snapped[2], footprint)
    const inYard = Math.abs(snapped[0]) <= 14 && Math.abs(snapped[2]) <= 14
    const isValid = outsideHouse && inYard

    validRef.current = isValid
    setValid(isValid)
    setDisplayPos(snapped)
  })

  return (
    <group position={displayPos} rotation={[0, displayRot, 0]}>
      {/* Validity indicator */}
      <mesh>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial
          color={valid ? '#00ff88' : '#ff3333'}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      <ExteriorItemMesh type={type} />
    </group>
  )
}
