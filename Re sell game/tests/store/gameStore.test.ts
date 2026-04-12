// tests/store/gameStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../src/store/gameStore'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState())
  })

  it('starts in shop phase', () => {
    expect(useGameStore.getState().phase).toBe('shop')
  })

  it('starts with 0 coins', () => {
    expect(useGameStore.getState().coins).toBe(0)
  })

  it('addCoins increases coin count', () => {
    useGameStore.getState().addCoins(100)
    expect(useGameStore.getState().coins).toBe(100)
  })

  it('setPhase changes the phase', () => {
    useGameStore.getState().setPhase('world-map')
    expect(useGameStore.getState().phase).toBe('world-map')
  })

  it('recordSale logs a sale and adds coins', () => {
    useGameStore.getState().recordSale({
      itemId: 'ruby-1',
      itemName: 'Ruby',
      restockCost: 50,
      soldFor: 80,
      profit: 30,
      soldAt: Date.now(),
    })
    const state = useGameStore.getState()
    expect(state.sessionSales).toHaveLength(1)
    expect(state.coins).toBe(80)
    expect(state.lifetimeCoins).toBe(80)
  })

  it('unlockCategory adds category to unlockedCategories', () => {
    useGameStore.getState().unlockCategory('mythical-weapons')
    expect(useGameStore.getState().unlockedCategories).toContain('mythical-weapons')
  })

  it('clearSessionSales empties session sales', () => {
    useGameStore.getState().recordSale({
      itemId: 'gold-1',
      itemName: 'Gold bar',
      restockCost: 100,
      soldFor: 150,
      profit: 50,
      soldAt: Date.now(),
    })
    useGameStore.getState().clearSessionSales()
    expect(useGameStore.getState().sessionSales).toHaveLength(0)
  })
})
