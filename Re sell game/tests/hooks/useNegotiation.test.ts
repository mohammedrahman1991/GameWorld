// tests/hooks/useNegotiation.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNegotiation } from '../../src/hooks/useNegotiation'

const mockItem = {
  id: 'ruby-1',
  name: 'Ruby',
  category: 'gems' as const,
  baseValue: 150,
  restockCost: 90,
  currentValue: 150,
  emoji: '🔴',
  rarity: 'rare' as const,
}

const mockBot = {
  type: 'alex' as const,
  displayName: 'Excited Kid',
  emoji: '😄',
  color: '#FF9F43',
  personality: 'Excited kid',
  patienceDuration: 20,
  patienceDrainMultiplier: 0.8,
  acceptanceThreshold: 1.2,
  offerBias: 1.0,
}

describe('useNegotiation', () => {
  it('initialises with correct mode and round', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    expect(result.current.round).toBe(1)
    expect(['A', 'B']).toContain(result.current.mode)
    expect(result.current.outcome).toBeNull()
  })

  it('accept() produces a deal outcome', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.accept(120))
    expect(result.current.outcome).toBe('deal')
    expect(result.current.dealPrice).toBe(120)
  })

  it('reject() produces a no-deal outcome', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.reject())
    expect(result.current.outcome).toBe('no-deal')
  })

  it('counter() increments round', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.counter(160))
    expect(result.current.round).toBe(2)
  })

  it('after 3 counters, outcome resolves automatically', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.counter(100))
    act(() => result.current.counter(110))
    act(() => result.current.counter(120))
    expect(result.current.outcome).toBe('deal')
    expect(result.current.dealPrice).toBe(120)
  })

  it('patienceExpired() sets outcome to no-deal', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.patienceExpired())
    expect(result.current.outcome).toBe('no-deal')
  })
})
