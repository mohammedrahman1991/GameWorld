// src/store/gameStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'shop' | 'session-end' | 'world-map' | 'village' | 'my-house' | 'mystic-shop'
export type Category =
  | 'gems'
  | 'metals'
  | 'resources'
  | 'stocks'
  | 'weapons'
  | 'mythical-weapons'
  | 'rocks'

export interface SaleRecord {
  itemId: string
  itemName: string
  restockCost: number
  soldFor: number
  profit: number
  soldAt: number
}

export interface GameItem {
  id: string
  name: string
  category: Category
  baseValue: number
  restockCost: number
  currentValue: number
  emoji: string
  rarity: 'common' | 'rare' | 'legendary'
}

interface GameState {
  phase: Phase
  coins: number
  lifetimeCoins: number
  inventory: GameItem[]
  sessionSales: SaleRecord[]
  salesHistory: SaleRecord[]
  unlockedCategories: Category[]

  // Reward system
  totalSalesCount: number   // incremented every sale — drives star shard milestones
  starShards: number        // earned every 5 sales; spent in the Mystic Shop
  secretBinder: string[]    // IDs of mystic items the player has collected

  // Actions
  setPhase: (phase: Phase) => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => void
  recordSale: (sale: SaleRecord) => void
  clearSessionSales: () => void
  setInventory: (items: GameItem[]) => void
  unlockCategory: (category: Category) => void

  // Reward actions
  addStarShards: (n: number) => void
  spendStarShards: (n: number) => void
  collectBinderItem: (id: string) => void
}

const INITIAL_CATEGORIES: Category[] = ['gems', 'metals', 'resources', 'rocks', 'weapons']

const initialState = {
  phase: 'shop' as Phase,
  coins: 200,
  lifetimeCoins: 0,
  inventory: [],
  sessionSales: [],
  salesHistory: [],
  unlockedCategories: INITIAL_CATEGORIES,
  totalSalesCount: 0,
  starShards: 0,
  secretBinder: [] as string[],
}

export const useGameStore = create<GameState>()(persist((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  addCoins: (amount) =>
    set((s) => ({
      coins: s.coins + amount,
      lifetimeCoins: s.lifetimeCoins + amount,
    })),

  spendCoins: (amount) =>
    set((s) => ({
      coins: Math.max(0, s.coins - amount),
    })),

  recordSale: (sale) =>
    set((s) => {
      const newHistory = [...s.salesHistory, sale]
      if (newHistory.length > 100) newHistory.splice(0, newHistory.length - 100)
      return {
        sessionSales: [...s.sessionSales, sale],
        salesHistory: newHistory,
        coins: s.coins + sale.soldFor,
        lifetimeCoins: s.lifetimeCoins + sale.soldFor,
        totalSalesCount: s.totalSalesCount + 1,
      }
    }),

  clearSessionSales: () => set({ sessionSales: [] }),

  setInventory: (items) => set({ inventory: items }),

  unlockCategory: (category) =>
    set((s) => ({
      unlockedCategories: s.unlockedCategories.includes(category)
        ? s.unlockedCategories
        : [...s.unlockedCategories, category],
    })),

  addStarShards: (n) => set((s) => ({ starShards: s.starShards + n })),

  spendStarShards: (n) =>
    set((s) => ({ starShards: Math.max(0, s.starShards - n) })),

  collectBinderItem: (id) =>
    set((s) => ({
      secretBinder: s.secretBinder.includes(id)
        ? s.secretBinder
        : [...s.secretBinder, id],
    })),
}), {
  name: 'resell-game-save',
  partialize: (s) => ({
    phase: s.phase,
    coins: s.coins,
    lifetimeCoins: s.lifetimeCoins,
    inventory: s.inventory,
    salesHistory: s.salesHistory,
    unlockedCategories: s.unlockedCategories,
    totalSalesCount: s.totalSalesCount,
    starShards: s.starShards,
    secretBinder: s.secretBinder,
  }),
}))

// Expose initial state for test resets
;(useGameStore as any).getInitialState = () => ({
  ...initialState,
  setPhase: useGameStore.getState().setPhase,
  addCoins: useGameStore.getState().addCoins,
  spendCoins: useGameStore.getState().spendCoins,
  recordSale: useGameStore.getState().recordSale,
  clearSessionSales: useGameStore.getState().clearSessionSales,
  setInventory: useGameStore.getState().setInventory,
  unlockCategory: useGameStore.getState().unlockCategory,
  addStarShards: useGameStore.getState().addStarShards,
  spendStarShards: useGameStore.getState().spendStarShards,
  collectBinderItem: useGameStore.getState().collectBinderItem,
})
