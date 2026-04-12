// src/hooks/usePatience.ts
import { useState, useEffect, useRef, useCallback } from 'react'

interface UsePatienceReturn {
  progress: number   // 1.0 = full, 0.0 = empty
  isExpired: boolean
  reset: (duration: number) => void
  pause: () => void
}

export function usePatience(
  initialDuration: number,
  onExpire: () => void,
  active: boolean = true
): UsePatienceReturn {
  const [progress, setProgress] = useState(1.0)
  const [isExpired, setIsExpired] = useState(false)
  const pausedRef = useRef(false)
  const durationRef = useRef(initialDuration)
  const startTimeRef = useRef(Date.now())
  const frameRef = useRef<number>(0)
  // Use a ref for onExpire to avoid stale closure — always calls the latest version
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  const tick = useCallback(() => {
    if (pausedRef.current || !active) return
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const remaining = Math.max(0, 1 - elapsed / durationRef.current)
    // Only update state when value changes by >0.5% to avoid 60fps re-renders
    setProgress((prev) => {
      const rounded = Math.round(remaining * 200) / 200
      return Math.abs(prev - rounded) > 0.004 ? rounded : prev
    })

    if (remaining === 0) {
      setIsExpired(true)
      onExpireRef.current()
    } else {
      frameRef.current = requestAnimationFrame(tick)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    startTimeRef.current = Date.now()
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick, active])

  const reset = useCallback((duration: number) => {
    durationRef.current = duration
    startTimeRef.current = Date.now()
    pausedRef.current = false
    setProgress(1.0)
    setIsExpired(false)
  }, [])

  const pause = useCallback(() => { pausedRef.current = true }, [])

  return { progress, isExpired, reset, pause }
}
