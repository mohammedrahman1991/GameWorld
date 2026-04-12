import { describe, it, expect } from 'vitest'
import { snapToGrid, snapPosition } from './grid'

describe('snapToGrid', () => {
  it('snaps to nearest integer', () => {
    expect(snapToGrid(1.4)).toBe(1)
    expect(snapToGrid(1.6)).toBe(2)
    expect(snapToGrid(-0.4)).toBe(0)
    expect(snapToGrid(-0.6)).toBe(-1)
  })
})

describe('snapPosition', () => {
  it('returns snapped [x, 0, z] tuple', () => {
    expect(snapPosition(1.3, 2.7)).toEqual([1, 0, 3])
    expect(snapPosition(-1.6, 0.1)).toEqual([-2, 0, 0])
  })
})
