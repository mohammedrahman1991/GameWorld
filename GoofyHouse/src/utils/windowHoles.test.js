import { describe, it, expect } from 'vitest'
import { WINDOW_HOLES, getWindowKey, getHoleById } from './windowHoles'

describe('WINDOW_HOLES', () => {
  it('has 10 holes per house type', () => {
    expect(WINDOW_HOLES.modern).toHaveLength(10)
    expect(WINDOW_HOLES.classic).toHaveLength(10)
    expect(WINDOW_HOLES.cozy).toHaveLength(10)
  })

  it('each hole has required fields', () => {
    WINDOW_HOLES.modern.forEach((hole) => {
      expect(hole).toHaveProperty('id')
      expect(hole).toHaveProperty('wall')
      expect(hole).toHaveProperty('position')
      expect(hole.position).toHaveLength(3)
    })
  })
})

describe('getWindowKey', () => {
  it('generates unique key from house, hole id, and floor', () => {
    expect(getWindowKey('modern', 'f1', 0)).toBe('modern_f1_0')
    expect(getWindowKey('classic', 'b2', 1)).toBe('classic_b2_1')
  })
})

describe('getHoleById', () => {
  it('finds hole by id and house type', () => {
    const hole = getHoleById('modern', 'f1')
    expect(hole).toBeDefined()
    expect(hole.id).toBe('f1')
  })

  it('returns undefined for unknown id', () => {
    expect(getHoleById('modern', 'zzz')).toBeUndefined()
  })
})
