// src/data/shops.ts
import type { Category } from '../store/gameStore'

export interface ShopItem {
  name: string
  emoji: string
  category: Category
  buyPrice: number   // what you pay
  baseValue: number  // what you can sell it for (before fluctuation)
  rarity: 'common' | 'rare' | 'legendary'
}

export interface BuyShop {
  id: string
  name: string
  emoji: string
  description: string
  color: string
  items: ShopItem[]
}

export const BUY_SHOPS: BuyShop[] = [
  {
    id: 'gem-palace',
    name: 'Gem Palace',
    emoji: '💎',
    description: 'Rare gems and precious stones',
    color: '#6C5CE7',
    items: [
      { name: 'Diamond', emoji: '💎', category: 'gems', buyPrice: 120, baseValue: 200, rarity: 'rare' },
      { name: 'Ruby', emoji: '🔴', category: 'gems', buyPrice: 90, baseValue: 150, rarity: 'rare' },
      { name: 'Sapphire', emoji: '🔵', category: 'gems', buyPrice: 80, baseValue: 130, rarity: 'rare' },
      { name: 'Moissanite', emoji: '✨', category: 'gems', buyPrice: 110, baseValue: 180, rarity: 'legendary' },
    ],
  },
  {
    id: 'emerald-emporium',
    name: 'Emerald Emporium',
    emoji: '💚',
    description: 'Green gems and forest jewels',
    color: '#00B894',
    items: [
      { name: 'Emerald', emoji: '💚', category: 'gems', buyPrice: 95, baseValue: 160, rarity: 'rare' },
      { name: 'Jade Stone', emoji: '🟢', category: 'gems', buyPrice: 60, baseValue: 100, rarity: 'common' },
      { name: 'Peridot', emoji: '💚', category: 'gems', buyPrice: 50, baseValue: 85, rarity: 'common' },
    ],
  },
  {
    id: 'gold-exchange',
    name: 'Gold & Silver Exchange',
    emoji: '🥇',
    description: 'Precious metals bought and sold',
    color: '#F5C842',
    items: [
      { name: 'Gold Bar', emoji: '🥇', category: 'metals', buyPrice: 70, baseValue: 120, rarity: 'common' },
      { name: 'Silver Bar', emoji: '🥈', category: 'metals', buyPrice: 45, baseValue: 80, rarity: 'common' },
      { name: 'Platinum Shard', emoji: '⬜', category: 'metals', buyPrice: 140, baseValue: 230, rarity: 'rare' },
    ],
  },
  {
    id: 'blacksmith',
    name: "The Blacksmith",
    emoji: '⚔️',
    description: 'Handcrafted weapons and blades',
    color: '#636E72',
    items: [
      { name: 'Sword', emoji: '⚔️', category: 'weapons', buyPrice: 50, baseValue: 90, rarity: 'common' },
      { name: 'Dagger', emoji: '🗡️', category: 'weapons', buyPrice: 40, baseValue: 70, rarity: 'common' },
      { name: 'Spear', emoji: '🔱', category: 'weapons', buyPrice: 48, baseValue: 85, rarity: 'common' },
      { name: 'Battle Axe', emoji: '🪓', category: 'weapons', buyPrice: 65, baseValue: 110, rarity: 'common' },
    ],
  },
  {
    id: 'mystic-armory',
    name: 'Mystic Armory',
    emoji: '🐉',
    description: 'Legendary weapons of mythical power',
    color: '#E17055',
    items: [
      { name: 'Dragon Blade', emoji: '🐉', category: 'mythical-weapons', buyPrice: 320, baseValue: 500, rarity: 'legendary' },
      { name: 'Shadow Scythe', emoji: '☠️', category: 'mythical-weapons', buyPrice: 300, baseValue: 480, rarity: 'legendary' },
      { name: 'Phoenix Bow', emoji: '🔥', category: 'mythical-weapons', buyPrice: 340, baseValue: 520, rarity: 'legendary' },
      { name: 'Titan Hammer', emoji: '🔨', category: 'mythical-weapons', buyPrice: 360, baseValue: 550, rarity: 'legendary' },
    ],
  },
  {
    id: 'oil-depot',
    name: 'Oil Depot',
    emoji: '🛢️',
    description: 'Industrial resources and energy',
    color: '#2D3436',
    items: [
      { name: 'Oil Barrel', emoji: '🛢️', category: 'resources', buyPrice: 30, baseValue: 60, rarity: 'common' },
      { name: 'Oil Drum', emoji: '🛢️', category: 'resources', buyPrice: 50, baseValue: 95, rarity: 'common' },
      { name: 'Premium Oil', emoji: '🛢️', category: 'resources', buyPrice: 80, baseValue: 140, rarity: 'rare' },
    ],
  },
  {
    id: 'stock-market',
    name: 'Stock Market',
    emoji: '📈',
    description: 'Fictional company stock certificates',
    color: '#0984E3',
    items: [
      { name: 'TeslaX Stock', emoji: '⚡', category: 'stocks', buyPrice: 200, baseValue: 300, rarity: 'rare' },
      { name: 'NvidiaPro Stock', emoji: '🟢', category: 'stocks', buyPrice: 230, baseValue: 350, rarity: 'rare' },
      { name: 'AppleCo Stock', emoji: '🍏', category: 'stocks', buyPrice: 185, baseValue: 280, rarity: 'rare' },
      { name: 'RobloxWorld Stock', emoji: '🎮', category: 'stocks', buyPrice: 130, baseValue: 200, rarity: 'rare' },
    ],
  },
  {
    id: 'rock-shop',
    name: "Rocky's Minerals",
    emoji: '🪨',
    description: 'Rocks, geodes, and rare minerals',
    color: '#A29080',
    items: [
      { name: 'Quartz', emoji: '🪨', category: 'rocks', buyPrice: 15, baseValue: 30, rarity: 'common' },
      { name: 'Obsidian', emoji: '⬛', category: 'rocks', buyPrice: 22, baseValue: 45, rarity: 'common' },
      { name: 'Geode', emoji: '🌀', category: 'rocks', buyPrice: 28, baseValue: 55, rarity: 'common' },
      { name: 'Coal', emoji: '🖤', category: 'rocks', buyPrice: 8, baseValue: 20, rarity: 'common' },
    ],
  },
  {
    id: 'ruby-vault',
    name: 'Ruby Vault',
    emoji: '❤️‍🔥',
    description: 'Fine rubies and fire gems',
    color: '#D63031',
    items: [
      { name: 'Blood Ruby', emoji: '❤️‍🔥', category: 'gems', buyPrice: 150, baseValue: 240, rarity: 'legendary' },
      { name: 'Star Ruby', emoji: '🔴', category: 'gems', buyPrice: 100, baseValue: 165, rarity: 'rare' },
      { name: 'Rough Ruby', emoji: '🔴', category: 'gems', buyPrice: 60, baseValue: 100, rarity: 'common' },
    ],
  },
  {
    id: 'crystal-cave',
    name: 'Crystal Cave',
    emoji: '🔮',
    description: 'Crystals and magical minerals',
    color: '#A855F7',
    items: [
      { name: 'Crystal Ball', emoji: '🔮', category: 'gems', buyPrice: 110, baseValue: 175, rarity: 'rare' },
      { name: 'Amethyst', emoji: '💜', category: 'gems', buyPrice: 70, baseValue: 115, rarity: 'common' },
      { name: 'Rose Quartz', emoji: '🌸', category: 'gems', buyPrice: 45, baseValue: 75, rarity: 'common' },
      { name: 'Moonstone', emoji: '🌙', category: 'gems', buyPrice: 90, baseValue: 150, rarity: 'rare' },
    ],
  },
  {
    id: 'lava-forge',
    name: 'Lava Forge',
    emoji: '🌋',
    description: 'Volcanic weapons forged in fire',
    color: '#FF7675',
    items: [
      { name: 'Lava Sword', emoji: '🌋', category: 'weapons', buyPrice: 130, baseValue: 210, rarity: 'rare' },
      { name: 'Magma Dagger', emoji: '🔥', category: 'weapons', buyPrice: 95, baseValue: 155, rarity: 'rare' },
      { name: 'Obsidian Blade', emoji: '⬛', category: 'weapons', buyPrice: 75, baseValue: 125, rarity: 'common' },
    ],
  },
  {
    id: 'diamond-district',
    name: 'Diamond District',
    emoji: '💍',
    description: 'Premium diamonds and jewels',
    color: '#74B9FF',
    items: [
      { name: 'Pink Diamond', emoji: '💍', category: 'gems', buyPrice: 250, baseValue: 400, rarity: 'legendary' },
      { name: 'Blue Diamond', emoji: '💙', category: 'gems', buyPrice: 220, baseValue: 350, rarity: 'legendary' },
      { name: 'Raw Diamond', emoji: '💎', category: 'gems', buyPrice: 100, baseValue: 165, rarity: 'rare' },
    ],
  },
  {
    id: 'ancient-relics',
    name: 'Ancient Relics',
    emoji: '🏺',
    description: 'Old weapons and historic artifacts',
    color: '#FDCB6E',
    items: [
      { name: 'Ancient Sword', emoji: '🏺', category: 'weapons', buyPrice: 85, baseValue: 140, rarity: 'rare' },
      { name: 'Viking Axe', emoji: '🪓', category: 'weapons', buyPrice: 70, baseValue: 115, rarity: 'common' },
      { name: 'Gladiator Spear', emoji: '🔱', category: 'weapons', buyPrice: 80, baseValue: 130, rarity: 'rare' },
      { name: 'Knight Shield', emoji: '🛡️', category: 'weapons', buyPrice: 60, baseValue: 100, rarity: 'common' },
    ],
  },
  {
    id: 'space-market',
    name: 'Space Market',
    emoji: '🚀',
    description: 'Futuristic tech stocks and energy',
    color: '#0F3460',
    items: [
      { name: 'SpaceX Stock', emoji: '🚀', category: 'stocks', buyPrice: 280, baseValue: 420, rarity: 'legendary' },
      { name: 'Meta Stock', emoji: '🌐', category: 'stocks', buyPrice: 160, baseValue: 245, rarity: 'rare' },
      { name: 'Amazon Stock', emoji: '📦', category: 'stocks', buyPrice: 210, baseValue: 320, rarity: 'rare' },
    ],
  },
  {
    id: 'tropical-gems',
    name: 'Tropical Gems',
    emoji: '🌺',
    description: 'Exotic gems from distant lands',
    color: '#FF6B6B',
    items: [
      { name: 'Coral Gem', emoji: '🪸', category: 'gems', buyPrice: 55, baseValue: 90, rarity: 'common' },
      { name: 'Topaz', emoji: '🌺', category: 'gems', buyPrice: 75, baseValue: 125, rarity: 'rare' },
      { name: 'Aquamarine', emoji: '🔷', category: 'gems', buyPrice: 85, baseValue: 140, rarity: 'rare' },
      { name: 'Opal', emoji: '🌈', category: 'gems', buyPrice: 100, baseValue: 165, rarity: 'rare' },
    ],
  },
  {
    id: 'iron-works',
    name: 'Iron Works',
    emoji: '⚙️',
    description: 'Heavy metals and industrial goods',
    color: '#B2BEC3',
    items: [
      { name: 'Iron Ingot', emoji: '⚙️', category: 'metals', buyPrice: 25, baseValue: 45, rarity: 'common' },
      { name: 'Copper Bar', emoji: '🟤', category: 'metals', buyPrice: 35, baseValue: 60, rarity: 'common' },
      { name: 'Bronze Bar', emoji: '🏆', category: 'metals', buyPrice: 55, baseValue: 90, rarity: 'common' },
    ],
  },
  {
    id: 'shadow-vault',
    name: 'Shadow Vault',
    emoji: '🌑',
    description: 'Dark and mysterious rare items',
    color: '#1E1E2E',
    items: [
      { name: 'Shadow Gem', emoji: '🌑', category: 'gems', buyPrice: 180, baseValue: 290, rarity: 'legendary' },
      { name: 'Void Crystal', emoji: '🫧', category: 'gems', buyPrice: 200, baseValue: 320, rarity: 'legendary' },
      { name: 'Dark Matter', emoji: '🌚', category: 'resources', buyPrice: 250, baseValue: 400, rarity: 'legendary' },
    ],
  },
  {
    id: 'gem-mine',
    name: 'Gem Mine',
    emoji: '⛏️',
    description: 'Freshly mined raw stones',
    color: '#8B6914',
    items: [
      { name: 'Raw Sapphire', emoji: '⛏️', category: 'gems', buyPrice: 55, baseValue: 95, rarity: 'common' },
      { name: 'Raw Emerald', emoji: '🟩', category: 'gems', buyPrice: 65, baseValue: 110, rarity: 'common' },
      { name: 'Raw Gold', emoji: '🟡', category: 'metals', buyPrice: 40, baseValue: 70, rarity: 'common' },
      { name: 'Miner\'s Diamond', emoji: '💎', category: 'gems', buyPrice: 130, baseValue: 215, rarity: 'rare' },
    ],
  },
  {
    id: 'royal-armory',
    name: 'Royal Armory',
    emoji: '👑',
    description: 'Weapons fit for kings and queens',
    color: '#FAB005',
    items: [
      { name: 'Royal Sword', emoji: '👑', category: 'weapons', buyPrice: 160, baseValue: 260, rarity: 'legendary' },
      { name: 'King\'s Dagger', emoji: '🗡️', category: 'weapons', buyPrice: 120, baseValue: 195, rarity: 'rare' },
      { name: 'Queen\'s Bow', emoji: '🏹', category: 'weapons', buyPrice: 140, baseValue: 225, rarity: 'rare' },
    ],
  },
  {
    id: 'energy-exchange',
    name: 'Energy Exchange',
    emoji: '⚡',
    description: 'Power stocks and energy resources',
    color: '#FDCB6E',
    items: [
      { name: 'Solar Stock', emoji: '☀️', category: 'stocks', buyPrice: 120, baseValue: 190, rarity: 'rare' },
      { name: 'Wind Stock', emoji: '💨', category: 'stocks', buyPrice: 100, baseValue: 160, rarity: 'common' },
      { name: 'Nuclear Stock', emoji: '☢️', category: 'stocks', buyPrice: 200, baseValue: 320, rarity: 'legendary' },
      { name: 'Energy Cell', emoji: '⚡', category: 'resources', buyPrice: 45, baseValue: 80, rarity: 'common' },
    ],
  },
]
