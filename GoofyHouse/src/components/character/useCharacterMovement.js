import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { isInsideBounds, isBlocked } from '../../utils/collision'
import { HOUSE_BOUNDS, FURNITURE_SIZES } from '../../utils/furnitureSizes'
import useGameStore from '../../store/useGameStore'

const SPEED = 4
const CHAR_SIZE = { w: 0.4, d: 0.4 }

// positionRef: { current: [x, y, z] }
// rotationRef: { current: number }  (Y rotation in radians)
// walkTimeRef: { current: number }  (increments while moving, drives animation)
export default function useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType) {
  const keys = useRef(new Set())
  const isMoving = useRef(false)

  useEffect(() => {
    const down = (e) => keys.current.add(e.key.toLowerCase())
    const up = (e) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const k = keys.current
    let dx = 0, dz = 0

    if (k.has('w') || k.has('arrowup'))    dz -= 1
    if (k.has('s') || k.has('arrowdown'))  dz += 1
    if (k.has('a') || k.has('arrowleft'))  dx -= 1
    if (k.has('d') || k.has('arrowright')) dx += 1

    if (dx === 0 && dz === 0) {
      isMoving.current = false
      return
    }

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dz * dz)
    dx = (dx / len) * SPEED * delta
    dz = (dz / len) * SPEED * delta

    const [cx, cy, cz] = positionRef.current
    const nx = cx + dx
    const nz = cz + dz

    const bounds = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const placedItems = useGameStore.getState().placedItems

    const canX = isInsideBounds(nx, cz, bounds) &&
      !isBlocked(nx, cz, CHAR_SIZE, placedItems, FURNITURE_SIZES)
    const canZ = isInsideBounds(cx, nz, bounds) &&
      !isBlocked(cx, nz, CHAR_SIZE, placedItems, FURNITURE_SIZES)

    const finalX = canX ? nx : cx
    const finalZ = canZ ? nz : cz

    positionRef.current = [finalX, cy, finalZ]
    isMoving.current = true

    // Face direction of travel
    if (dx !== 0 || dz !== 0) {
      rotationRef.current = Math.atan2(dx, dz)
    }

    walkTimeRef.current += delta
    useGameStore.getState().setCharacterPosition(positionRef.current)
  })

  return isMoving
}
