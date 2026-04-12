// src/data/locations.ts
import type { Category } from '../store/gameStore'

export interface MapLocation {
  id: string
  name: string
  emoji: string
  description: string
  unlockCoins: number
  unlockCategory: Category | null
  position: { x: number; y: number } // percentage of map width/height
}

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: 'your-stall',
    name: 'Your Stall',
    emoji: '🏪',
    description: 'Open your shop for the next session',
    unlockCoins: 0,
    unlockCategory: null,
    position: { x: 50, y: 60 },
  },
  {
    id: 'the-market',
    name: 'The Market',
    emoji: '🛒',
    description: 'Preview your next item batch',
    unlockCoins: 0,
    unlockCategory: null,
    position: { x: 25, y: 40 },
  },
  {
    id: 'the-vault',
    name: 'The Vault',
    emoji: '🏦',
    description: 'View your coins and sales history',
    unlockCoins: 0,
    unlockCategory: null,
    position: { x: 75, y: 40 },
  },
  {
    id: 'collectors-den',
    name: "Collector's Den",
    emoji: '⚔️',
    description: 'Mythical weapons and legendary gems',
    unlockCoins: 500,
    unlockCategory: 'mythical-weapons',
    position: { x: 20, y: 70 },
  },
  {
    id: 'stock-exchange',
    name: 'Stock Exchange',
    emoji: '📈',
    description: 'Trade fictional company stocks',
    unlockCoins: 1000,
    unlockCategory: 'stocks',
    position: { x: 80, y: 70 },
  },
  {
    id: 'black-market',
    name: 'Black Market',
    emoji: '🌑',
    description: 'Mystery items — highest risk, highest reward',
    unlockCoins: 2500,
    unlockCategory: null,
    position: { x: 50, y: 85 },
  },
]
