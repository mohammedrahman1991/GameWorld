import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { snapPosition } from '../../utils/grid'
import { isBlocked, isInsideBounds } from '../../utils/collision'
import { FURNITURE_SIZES, HOUSE_BOUNDS } from '../../utils/furnitureSizes'
import { WALL_MOUNTED_TYPES, WINDOW_SNAP_TYPES } from '../../utils/wallConstants'
import { WINDOW_HOLES, getWindowKey, WALL_ROTATIONS } from '../../utils/windowHoles'
import useGameStore from '../../store/useGameStore'
import FurnitureMesh from './FurnitureMesh'

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

// Wall planes (inward-facing normals, at house wall positions)
const WALL_PLANES = [
  { plane: new THREE.Plane(new THREE.Vector3(0, 0, -1),  5), wall: 'front' },
  { plane: new THREE.Plane(new THREE.Vector3(0, 0,  1),  5), wall: 'back'  },
  { plane: new THREE.Plane(new THREE.Vector3(1, 0,  0),  5), wall: 'left'  },
  { plane: new THREE.Plane(new THREE.Vector3(-1, 0, 0),  5), wall: 'right' },
]

export default function GhostItem({ type, houseType }) {
  const { camera, gl } = useThree()
  const posRef = useRef([0, 0, 0])
  const rotationRef = useRef(0)
  const validRef = useRef(true)
  const closestHoleRef = useRef(null)
  const [displayPos, setDisplayPos] = useState([0, 0, 0])
  const [displayRot, setDisplayRot] = useState(0)
  const [valid, setValid] = useState(true)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const placeItem = useGameStore((s) => s.placeItem)
  const addWindow = useGameStore((s) => s.addWindow)
  const currentFloor = useGameStore((s) => s.currentFloor)

  const isWallMounted = WALL_MOUNTED_TYPES.includes(type)
  const isWindowSnap = WINDOW_SNAP_TYPES.includes(type)

  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onKeyDown = (e) => {
      if ((e.key === 'r' || e.key === 'R') && !isWallMounted && !isWindowSnap) {
        rotationRef.current += Math.PI / 2
        setDisplayRot(rotationRef.current)
      }
    }

    const onClick = () => {
      if (!validRef.current) return
      if (isWindowSnap && closestHoleRef.current) {
        const { hole } = closestHoleRef.current
        const key = getWindowKey(houseType, hole.id, currentFloor)
        addWindow(key)
        useGameStore.getState().cancelHeld()
        return
      }
      const surface = isWallMounted ? 'wall' : 'floor'
      placeItem(type, [...posRef.current], rotationRef.current, currentFloor, surface)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    gl.domElement.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [gl, type, houseType, isWallMounted, isWindowSnap, placeItem, addWindow, currentFloor])

  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera)
    const ray = raycaster.current.ray
    const hit = new THREE.Vector3()

    if (isWindowSnap) {
      // Snap to nearest window hole
      const holes = WINDOW_HOLES[houseType] || []
      const placedWindows = useGameStore.getState().placedWindows
      let closest = null
      let closestDist = Infinity

      holes.forEach((hole) => {
        const key = getWindowKey(houseType, hole.id, currentFloor)
        if (placedWindows.includes(key)) return
        const hp = new THREE.Vector3(...hole.position)
        const dist = ray.distanceToPoint(hp)
        if (dist < closestDist) {
          closestDist = dist
          closest = { hole, dist }
        }
      })

      if (closest && closest.dist < 3) {
        const h = closest.hole
        posRef.current = [...h.position]
        rotationRef.current = WALL_ROTATIONS[h.wall] || 0
        closestHoleRef.current = closest
        validRef.current = true
        setDisplayPos([...h.position])
        setDisplayRot(WALL_ROTATIONS[h.wall] || 0)
        setValid(true)
      } else {
        closestHoleRef.current = null
        validRef.current = false
        setValid(false)
      }
      return
    }

    if (isWallMounted) {
      // Find nearest wall plane intersection
      let best = null
      let bestDist = Infinity
      WALL_PLANES.forEach(({ plane, wall }) => {
        const intersect = ray.intersectPlane(plane, hit.clone())
        if (intersect) {
          const d = camera.position.distanceTo(intersect)
          if (d < bestDist) { bestDist = d; best = { pos: intersect.clone(), wall } }
        }
      })
      if (best) {
        const p = [best.pos.x, 1.5, best.pos.z]
        posRef.current = p
        rotationRef.current = WALL_ROTATIONS[best.wall] || 0
        validRef.current = true
        setDisplayPos(p)
        setDisplayRot(WALL_ROTATIONS[best.wall] || 0)
        setValid(true)
      }
      return
    }

    // Floor placement (default)
    const intersects = ray.intersectPlane(floorPlane, hit)
    if (!intersects) return
    const snapped = snapPosition(hit.x, hit.z)
    posRef.current = snapped
    const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }
    const placedItems = useGameStore.getState().placedItems.filter(i => i.floor === currentFloor)
    const blocked = isBlocked(snapped[0], snapped[2], size, placedItems, FURNITURE_SIZES)
    const inside = isInsideBounds(snapped[0], snapped[2], bounds)
    const isValid = inside && !blocked
    validRef.current = isValid
    setValid(isValid)
    setDisplayPos(snapped)
  })

  const size = FURNITURE_SIZES[type] || { w: 1, d: 1 }

  return (
    <group position={displayPos} rotation={[0, displayRot, 0]}>
      <mesh>
        <boxGeometry args={[size.w, isWallMounted || isWindowSnap ? 1 : 1, size.d]} />
        <meshStandardMaterial color={valid ? '#00ff88' : '#ff3333'} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <FurnitureMesh type={type} position={displayPos} />
    </group>
  )
}
