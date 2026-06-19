import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { isInsideBounds, isBlocked } from '../../utils/collision'
import { HOUSE_BOUNDS, FURNITURE_SIZES } from '../../utils/furnitureSizes'
import useGameStore from '../../store/useGameStore'

const SPEED     = 4
const TURN_RATE = 2.2   // radians per second
const CHAR_SIZE = { w: 0.4, d: 0.4 }

// W/S — move forward/backward along the character's facing direction
// A/D — turn left / turn right (rotate the character)
export default function useCharacterMovement(positionRef, rotationRef, walkTimeRef, houseType) {
  const keys     = useRef(new Set())
  const joystick = useRef({ dx: 0, dz: 0 })   // filled by mobile joystick
  const isMoving = useRef(false)

  useEffect(() => {
    const down = (e) => keys.current.add(e.key.toLowerCase())
    const up   = (e) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    // expose joystick ref so the HUD joystick can write into it
    window.__ghJoystick = joystick
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      delete window.__ghJoystick
    }
  }, [])

  useFrame((_, delta) => {
    const k  = keys.current
    const jx = joystick.current.dx
    const jz = joystick.current.dz

    // Turn left/right
    let turn = 0
    if (k.has('a') || k.has('arrowleft'))  turn -= 1
    if (k.has('d') || k.has('arrowright')) turn += 1
    if (jx !== 0) turn = jx

    if (turn !== 0) rotationRef.current += turn * TURN_RATE * delta

    // Move forward/backward along facing direction
    let fwd = 0
    if (k.has('w') || k.has('arrowup'))   fwd =  1
    if (k.has('s') || k.has('arrowdown')) fwd = -1
    if (jz !== 0) fwd = -jz   // joystick up = positive jz → move forward

    if (fwd === 0 && turn === 0) {
      isMoving.current = false
      return
    }

    const yaw = rotationRef.current
    const dx  = Math.sin(yaw) * fwd * SPEED * delta
    const dz  = Math.cos(yaw) * fwd * SPEED * delta

    const [cx, cy, cz] = positionRef.current
    const nx = cx + dx
    const nz = cz + dz

    const bounds     = HOUSE_BOUNDS[houseType] || HOUSE_BOUNDS.modern
    const placedItems = useGameStore.getState().placedItems

    const canX = isInsideBounds(nx, cz, bounds) &&
      !isBlocked(nx, cz, CHAR_SIZE, placedItems, FURNITURE_SIZES)
    const canZ = isInsideBounds(cx, nz, bounds) &&
      !isBlocked(cx, nz, CHAR_SIZE, placedItems, FURNITURE_SIZES)

    positionRef.current = [canX ? nx : cx, cy, canZ ? nz : cz]
    isMoving.current = fwd !== 0

    walkTimeRef.current += Math.abs(fwd) * delta
    useGameStore.getState().setCharacterPosition(positionRef.current)
  })

  return isMoving
}
