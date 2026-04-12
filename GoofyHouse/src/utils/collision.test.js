import { describe, it, expect } from 'vitest'
import { overlaps, isInsideBounds } from './collision'

describe('overlaps', () => {
  it('detects overlapping AABBs', () => {
    expect(overlaps(0, 0, 1, 1, 0, 0, 1, 1)).toBe(true)
    expect(overlaps(0, 0, 1, 1, 2, 0, 1, 1)).toBe(false)
    expect(overlaps(0, 0, 1, 1, 0.4, 0, 1, 1)).toBe(true)
  })

  it('returns false when AABBs only touch edges', () => {
    expect(overlaps(0, 0, 1, 1, 1, 0, 1, 1)).toBe(false)
  })
})

describe('isInsideBounds', () => {
  it('returns true when point is inside bounds', () => {
    const b = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    expect(isInsideBounds(0, 0, b)).toBe(true)
    expect(isInsideBounds(3.9, -3.9, b)).toBe(true)
  })

  it('returns false outside bounds', () => {
    const b = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 }
    expect(isInsideBounds(5, 0, b)).toBe(false)
    expect(isInsideBounds(0, -5, b)).toBe(false)
  })
})
