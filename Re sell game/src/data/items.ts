// src/data/items.ts
import type { GameItem, Category } from '../store/gameStore'

export interface ItemTemplate {
  name: string
  category: Category
  baseValue: number
  restockCost: number
  emoji: string
  rarity: 'common' | 'rare' | 'legendary'
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // Gems
  { name: 'Diamond', category: 'gems', baseValue: 200, restockCost: 120, emoji: '💎', rarity: 'rare' },
  { name: 'Ruby', category: 'gems', baseValue: 150, restockCost: 90, emoji: '🔴', rarity: 'rare' },
  { name: 'Sapphire', category: 'gems', baseValue: 130, restockCost: 80, emoji: '🔵', rarity: 'rare' },
  { name: 'Emerald', category: 'gems', baseValue: 160, restockCost: 95, emoji: '💚', rarity: 'rare' },
  { name: 'Moissanite', category: 'gems', baseValue: 180, restockCost: 110, emoji: '✨', rarity: 'legendary' },
  // Metals
  { name: 'Gold Bar', category: 'metals', baseValue: 120, restockCost: 70, emoji: '🥇', rarity: 'common' },
  { name: 'Silver Bar', category: 'metals', baseValue: 80, restockCost: 45, emoji: '🥈', rarity: 'common' },
  // Resources
  { name: 'Oil Barrel', category: 'resources', baseValue: 60, restockCost: 30, emoji: '🛢️', rarity: 'common' },
  // Stocks
  { name: 'TeslaX Stock', category: 'stocks', baseValue: 300, restockCost: 200, emoji: '⚡', rarity: 'rare' },
  { name: 'NvidiaPro Stock', category: 'stocks', baseValue: 350, restockCost: 230, emoji: '🟢', rarity: 'rare' },
  { name: 'AppleCo Stock', category: 'stocks', baseValue: 280, restockCost: 185, emoji: '🍏', rarity: 'rare' },
  { name: 'RobloxWorld Stock', category: 'stocks', baseValue: 200, restockCost: 130, emoji: '🎮', rarity: 'rare' },
  // Weapons
  { name: 'Sword', category: 'weapons', baseValue: 90, restockCost: 50, emoji: '⚔️', rarity: 'common' },
  { name: 'Dagger', category: 'weapons', baseValue: 70, restockCost: 40, emoji: '🗡️', rarity: 'common' },
  { name: 'Spear', category: 'weapons', baseValue: 85, restockCost: 48, emoji: '🔱', rarity: 'common' },
  // Mythical Weapons
  { name: 'Dragon Blade', category: 'mythical-weapons', baseValue: 500, restockCost: 320, emoji: '🐉', rarity: 'legendary' },
  { name: 'Shadow Scythe', category: 'mythical-weapons', baseValue: 480, restockCost: 300, emoji: '☠️', rarity: 'legendary' },
  { name: 'Phoenix Bow', category: 'mythical-weapons', baseValue: 520, restockCost: 340, emoji: '🔥', rarity: 'legendary' },
  { name: 'Titan Hammer', category: 'mythical-weapons', baseValue: 550, restockCost: 360, emoji: '🔨', rarity: 'legendary' },
  // Rocks & Minerals
  { name: 'Quartz', category: 'rocks', baseValue: 30, restockCost: 15, emoji: '🪨', rarity: 'common' },
  { name: 'Obsidian', category: 'rocks', baseValue: 45, restockCost: 22, emoji: '⬛', rarity: 'common' },
  { name: 'Geode', category: 'rocks', baseValue: 55, restockCost: 28, emoji: '🌀', rarity: 'common' },
  { name: 'Coal', category: 'rocks', baseValue: 20, restockCost: 8, emoji: '🖤', rarity: 'common' },
]

export const UNLOCK_MILESTONES: { coins: number; category: Category }[] = [
  { coins: 500, category: 'mythical-weapons' },
  { coins: 1000, category: 'stocks' },
]

/** Generate a batch of items for a shop session (apply market fluctuation ±15%) */
export function generateSessionInventory(unlockedCategories: Category[]): GameItem[] {
  const available = ITEM_TEMPLATES.filter((t) => unlockedCategories.includes(t.category))
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const batch = shuffled.slice(0, Math.min(6, shuffled.length))

  return batch.map((template, i) => {
    const fluctuation = 0.85 + Math.random() * 0.3 // 0.85–1.15
    return {
      id: `${template.name.toLowerCase().replace(/\s/g, '-')}-${i}`,
      name: template.name,
      category: template.category,
      baseValue: Math.round(template.baseValue * fluctuation),
      restockCost: template.restockCost,
      currentValue: Math.round(template.baseValue * fluctuation),
      emoji: template.emoji,
      rarity: template.rarity,
    }
  })
}
