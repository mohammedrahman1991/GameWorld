# Re sell Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Re sell — a browser-based kids stall game where a mysterious merchant negotiates with AI-powered bot customers, earns coins, and unlocks items across a storybook illustrated town.

**Architecture:** Three-phase React SPA (Shop → Session End → World Map) driven by a Zustand store. Game logic lives in hooks. API calls live in services. Visual layers use CSS/SVG with Framer Motion animations. Builds to static files — host anywhere, embed via `<iframe>`.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS v3, Framer Motion, Zustand, OpenAI SDK v4, ElevenLabs REST API, Vitest, React Testing Library

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/main.tsx` | React root render |
| `src/App.tsx` | Phase router — shop / session-end / world-map |
| `src/index.css` | Tailwind directives + global font |
| `src/store/gameStore.ts` | All game state (Zustand) |
| `src/data/items.ts` | All item definitions |
| `src/data/bots.ts` | Bot type definitions + personality config |
| `src/data/locations.ts` | World map location definitions |
| `src/services/openai.ts` | GPT-4o dialogue generation |
| `src/services/elevenlabs.ts` | ElevenLabs TTS playback |
| `src/hooks/useNegotiation.ts` | Negotiation state machine (rounds, outcome) |
| `src/hooks/useBotDialogue.ts` | Fetch OpenAI dialogue + trigger voice |
| `src/hooks/usePatience.ts` | Patience meter countdown timer |
| `src/phases/ShopPhase/ShopPhase.tsx` | Shop phase orchestrator |
| `src/phases/ShopPhase/ShopScene.tsx` | Background scene (building, trees, stall) |
| `src/phases/ShopPhase/BotCharacter.tsx` | Bot sprite + patience meter + walk animation |
| `src/phases/ShopPhase/SpeechBubble.tsx` | Bot speech bubble |
| `src/phases/ShopPhase/NegotiationUI.tsx` | Price slider + accept/counter/reject buttons |
| `src/phases/ShopPhase/CoinCounter.tsx` | Live coin display top-right |
| `src/phases/ShopPhase/InventoryDisplay.tsx` | Items on stall table |
| `src/phases/SessionEnd/SessionEnd.tsx` | Session summary + auto-restock trigger |
| `src/phases/WorldMap/WorldMap.tsx` | World map container |
| `src/phases/WorldMap/LocationTile.tsx` | Location tile (locked/unlocked state) |
| `src/phases/WorldMap/MerchantWalker.tsx` | Player movement on map |
| `src/phases/WorldMap/MarketModal.tsx` | Next batch preview overlay |
| `src/phases/WorldMap/VaultModal.tsx` | Lifetime stats overlay |
| `src/components/PriceSlider.tsx` | Reusable styled price slider |
| `src/components/PatienceMeter.tsx` | Draining patience bar |
| `tests/store/gameStore.test.ts` | Store state transition tests |
| `tests/hooks/useNegotiation.test.ts` | Negotiation logic tests |
| `tests/services/openai.test.ts` | OpenAI service (mocked) tests |
| `tests/services/elevenlabs.test.ts` | ElevenLabs service (mocked) tests |

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `index.html`
- Modify: `.env`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd "/Users/mohammedrahman/Desktop/Games/Re sell game"
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" — select **Yes**.

- [ ] **Step 2: Install all dependencies**

```bash
npm install framer-motion zustand openai
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        storybook: ['"Fredoka One"', 'cursive'],
      },
      colors: {
        coin: '#F5C842',
        stall: '#8B5E3C',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Set up index.css**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');

body {
  margin: 0;
  font-family: 'Fredoka One', cursive;
  background: #1a1a2e;
  overflow: hidden;
}
```

- [ ] **Step 5: Update .env with VITE_ prefixed keys**

Vite only exposes env vars prefixed with `VITE_` to the browser. Update `.env`:

```env
VITE_OPENAI_API_KEY=<paste your existing OPENAI_API_KEY value here>
VITE_ELEVENLABS_API_KEY=<paste your existing ELEVENLABS_API_KEY value here>
VITE_ELEVENLABS_VOICE_ID=IKne3meq5aSn9XLyUdCD
PORT=3000
```

- [ ] **Step 6: Configure Vitest in vite.config.ts**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})
```

- [ ] **Step 7: Create test setup file**

```bash
mkdir -p tests/store tests/hooks tests/services
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Write a smoke test**

```ts
// tests/store/gameStore.test.ts (placeholder — will be filled in Task 2)
import { describe, it, expect } from 'vitest'

describe('gameStore', () => {
  it('placeholder', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 9: Run tests to confirm setup works**

```bash
npx vitest run
```

Expected: 1 test passes.

- [ ] **Step 10: Write a minimal App.tsx to confirm dev server works**

```tsx
// src/App.tsx
export default function App() {
  return (
    <div className="flex items-center justify-center h-screen text-white text-4xl font-storybook">
      Re sell — Loading...
    </div>
  )
}
```

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 11: Start dev server and verify it loads**

```bash
npm run dev
```

Expected: Browser shows "Re sell — Loading..." in white on dark background.

- [ ] **Step 12: Commit**

```bash
git init
git add package.json vite.config.ts tsconfig.json tailwind.config.js postcss.config.js src/ index.html tests/ .gitignore
git commit -m "feat: project setup — React + Vite + Tailwind + Zustand + Framer Motion + Vitest"
```

---

## Task 2: Game Store

**Files:**
- Create: `src/store/gameStore.ts`
- Modify: `tests/store/gameStore.test.ts`

- [ ] **Step 1: Write failing tests for store**

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/store/gameStore.test.ts
```

Expected: FAIL — "Cannot find module '../../src/store/gameStore'"

- [ ] **Step 3: Implement the game store**

```ts
// src/store/gameStore.ts
import { create } from 'zustand'

export type Phase = 'shop' | 'session-end' | 'world-map'
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

  // Actions
  setPhase: (phase: Phase) => void
  addCoins: (amount: number) => void
  recordSale: (sale: SaleRecord) => void
  clearSessionSales: () => void
  setInventory: (items: GameItem[]) => void
  unlockCategory: (category: Category) => void
}

const INITIAL_CATEGORIES: Category[] = ['gems', 'metals', 'resources', 'rocks', 'weapons']

const initialState = {
  phase: 'shop' as Phase,
  coins: 0,
  lifetimeCoins: 0,
  inventory: [],
  sessionSales: [],
  salesHistory: [],
  unlockedCategories: INITIAL_CATEGORIES,
}

export const useGameStore = create<GameState>()((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  addCoins: (amount) =>
    set((s) => ({
      coins: s.coins + amount,
      lifetimeCoins: s.lifetimeCoins + amount,
    })),

  recordSale: (sale) =>
    set((s) => ({
      sessionSales: [...s.sessionSales, sale],
      salesHistory: [...s.salesHistory, sale],
      coins: s.coins + sale.soldFor,
      lifetimeCoins: s.lifetimeCoins + sale.soldFor,
    })),

  clearSessionSales: () => set({ sessionSales: [] }),

  setInventory: (items) => set({ inventory: items }),

  unlockCategory: (category) =>
    set((s) => ({
      unlockedCategories: s.unlockedCategories.includes(category)
        ? s.unlockedCategories
        : [...s.unlockedCategories, category],
    })),
}))

// Expose initial state for test resets
;(useGameStore as any).getInitialState = () => ({
  ...initialState,
  setPhase: useGameStore.getState().setPhase,
  addCoins: useGameStore.getState().addCoins,
  recordSale: useGameStore.getState().recordSale,
  clearSessionSales: useGameStore.getState().clearSessionSales,
  setInventory: useGameStore.getState().setInventory,
  unlockCategory: useGameStore.getState().unlockCategory,
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/store/gameStore.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts tests/store/gameStore.test.ts
git commit -m "feat: game store — phase, coins, inventory, sales, unlocks"
```

---

## Task 3: Item & Bot Data

**Files:**
- Create: `src/data/items.ts`
- Create: `src/data/bots.ts`
- Create: `src/data/locations.ts`

- [ ] **Step 1: Create items.ts**

```ts
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
```

- [ ] **Step 2: Create bots.ts**

```ts
// src/data/bots.ts
export type BotType =
  | 'excited-kid'
  | 'grumpy-collector'
  | 'shady-dealer'
  | 'rich-shopper'
  | 'bargain-hunter'

export interface BotConfig {
  type: BotType
  displayName: string
  emoji: string
  color: string
  personality: string
  patienceDuration: number      // seconds before they walk
  patienceDrainMultiplier: number // drain speed per round (1 = normal, 1.5 = faster)
  acceptanceThreshold: number   // fraction of baseValue they'll pay (0.6–1.3)
  offerBias: number             // fraction of baseValue they initially offer (0.6–1.2)
}

export const BOT_CONFIGS: BotConfig[] = [
  {
    type: 'excited-kid',
    displayName: 'Excited Kid',
    emoji: '😄',
    color: '#FF9F43',
    personality:
      'You are an enthusiastic young kid who LOVES collectibles and gets excited easily. You speak casually and with excitement. Keep responses under 12 words. Family-friendly only.',
    patienceDuration: 20,
    patienceDrainMultiplier: 0.8,
    acceptanceThreshold: 1.2,
    offerBias: 1.0,
  },
  {
    type: 'grumpy-collector',
    displayName: 'Grumpy Collector',
    emoji: '😤',
    color: '#6C5CE7',
    personality:
      'You are a grumpy old collector. You are skeptical and always think prices are too high. Speak curtly. Under 12 words. Family-friendly.',
    patienceDuration: 12,
    patienceDrainMultiplier: 1.4,
    acceptanceThreshold: 0.75,
    offerBias: 0.65,
  },
  {
    type: 'shady-dealer',
    displayName: 'Shady Dealer',
    emoji: '😏',
    color: '#2D3436',
    personality:
      'You are a mysterious shady market dealer. Speak cryptically and vaguely. Under 12 words. Family-friendly.',
    patienceDuration: 10,
    patienceDrainMultiplier: 1.6,
    acceptanceThreshold: 0.9,
    offerBias: 0.7,
  },
  {
    type: 'rich-shopper',
    displayName: 'Rich Shopper',
    emoji: '🤑',
    color: '#00B894',
    personality:
      'You are a wealthy casual shopper. You dont really care about price. Speak confidently and generously. Under 12 words. Family-friendly.',
    patienceDuration: 25,
    patienceDrainMultiplier: 0.6,
    acceptanceThreshold: 1.3,
    offerBias: 1.1,
  },
  {
    type: 'bargain-hunter',
    displayName: 'Bargain Hunter',
    emoji: '🔍',
    color: '#FDCB6E',
    personality:
      'You are obsessed with finding the lowest price. You always try to negotiate. Speak urgently. Under 12 words. Family-friendly.',
    patienceDuration: 30,
    patienceDrainMultiplier: 1.0,
    acceptanceThreshold: 0.8,
    offerBias: 0.62,
  },
]

export function randomBot(): BotConfig {
  return BOT_CONFIGS[Math.floor(Math.random() * BOT_CONFIGS.length)]
}
```

- [ ] **Step 3: Create locations.ts**

```ts
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
```

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "feat: item templates, bot configs, and world map locations data"
```

---

## Task 4: AI Services

**Files:**
- Create: `src/services/openai.ts`
- Create: `src/services/elevenlabs.ts`
- Create: `tests/services/openai.test.ts`
- Create: `tests/services/elevenlabs.test.ts`

- [ ] **Step 1: Write failing tests for OpenAI service**

```ts
// tests/services/openai.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateBotDialogue } from '../../src/services/openai'

vi.mock('openai', () => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: 'I will pay 50 coins for that!' } }],
  })
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create } },
    })),
  }
})

describe('generateBotDialogue', () => {
  it('returns a dialogue string', async () => {
    const result = await generateBotDialogue({
      botPersonality: 'You are an excited kid.',
      itemName: 'Ruby',
      mode: 'offer',
      offerAmount: 50,
      round: 1,
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns fallback string on error', async () => {
    const { default: OpenAI } = await import('openai')
    ;(OpenAI as any).mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('Network error')),
        },
      },
    }))
    const result = await generateBotDialogue({
      botPersonality: 'You are an excited kid.',
      itemName: 'Ruby',
      mode: 'offer',
      offerAmount: 50,
      round: 1,
    })
    expect(result).toBe('Hmm...')
  })
})
```

- [ ] **Step 2: Write failing tests for ElevenLabs service**

```ts
// tests/services/elevenlabs.test.ts
import { describe, it, expect, vi } from 'vitest'
import { speakText } from '../../src/services/elevenlabs'

describe('speakText', () => {
  it('resolves without error when fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' })),
    } as any)
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()

    const mockPlay = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(global, 'Audio' as any).mockImplementation(() => ({ play: mockPlay }))

    await expect(speakText('Hello!')).resolves.toBeUndefined()
  })

  it('resolves silently when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any)
    await expect(speakText('Hello!')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run tests/services/
```

Expected: FAIL — Cannot find modules.

- [ ] **Step 4: Implement openai.ts**

```ts
// src/services/openai.ts
import OpenAI from 'openai'

type DialogueMode = 'offer' | 'ask' | 'counter' | 'accept' | 'reject' | 'walk'

interface DialogueParams {
  botPersonality: string
  itemName: string
  mode: DialogueMode
  offerAmount?: number
  round: number
}

function buildPrompt(params: DialogueParams): string {
  const { itemName, mode, offerAmount, round } = params
  switch (mode) {
    case 'offer':
      return `You want to buy the "${itemName}" for ${offerAmount} coins. Say so in character.`
    case 'ask':
      return `You want to know the price of "${itemName}". Ask in character.`
    case 'counter':
      return `The seller wants ${offerAmount} coins for "${itemName}". Counter with a lower amount. Round ${round} of 3.`
    case 'accept':
      return `You just agreed to buy "${itemName}" for ${offerAmount} coins. React happily in character.`
    case 'reject':
      return `The price for "${itemName}" is too high. Say you're walking away.`
    case 'walk':
      return `You ran out of patience. Say you're leaving — brief, one sentence.`
  }
}

export async function generateBotDialogue(params: DialogueParams): Promise<string> {
  try {
    const client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${params.botPersonality} You are in a kids market stall game. Keep ALL responses family-friendly and under 15 words.`,
        },
        { role: 'user', content: buildPrompt(params) },
      ],
      max_tokens: 60,
    })

    return response.choices[0]?.message?.content ?? 'Hmm...'
  } catch {
    return 'Hmm...'
  }
}
```

- [ ] **Step 5: Implement elevenlabs.ts**

```ts
// src/services/elevenlabs.ts
export async function speakText(text: string): Promise<void> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID ?? 'IKne3meq5aSn9XLyUdCD'

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!response.ok) return // voice is enhancement — fail silently

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    await audio.play()
    URL.revokeObjectURL(url)
  } catch {
    // fail silently — voice is enhancement, not required
  }
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run tests/services/
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/ tests/services/
git commit -m "feat: OpenAI dialogue service and ElevenLabs TTS service"
```

---

## Task 5: Negotiation Hook

**Files:**
- Create: `src/hooks/useNegotiation.ts`
- Create: `tests/hooks/useNegotiation.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
  type: 'excited-kid' as const,
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
    expect(result.current.outcome).not.toBeNull()
  })

  it('patienceExpired() sets outcome to no-deal', () => {
    const { result } = renderHook(() => useNegotiation(mockItem, mockBot))
    act(() => result.current.patienceExpired())
    expect(result.current.outcome).toBe('no-deal')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/hooks/useNegotiation.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement useNegotiation.ts**

```ts
// src/hooks/useNegotiation.ts
import { useState, useMemo } from 'react'
import type { GameItem } from '../store/gameStore'
import type { BotConfig } from '../data/bots'

export type NegotiationMode = 'A' | 'B'
export type NegotiationOutcome = 'deal' | 'no-deal' | null

interface NegotiationState {
  mode: NegotiationMode
  round: number
  currentOffer: number
  outcome: NegotiationOutcome
  dealPrice: number | null
  accept: (price: number) => void
  reject: () => void
  counter: (price: number) => void
  patienceExpired: () => void
  botWillAccept: (price: number) => boolean
}

export function useNegotiation(item: GameItem, bot: BotConfig): NegotiationState {
  const mode = useMemo<NegotiationMode>(() => (Math.random() < 0.5 ? 'A' : 'B'), [item.id, bot.type])
  const initialOffer = useMemo(
    () => Math.round(item.currentValue * bot.offerBias),
    [item.currentValue, bot.offerBias]
  )

  const [round, setRound] = useState(1)
  const [currentOffer, setCurrentOffer] = useState(initialOffer)
  const [outcome, setOutcome] = useState<NegotiationOutcome>(null)
  const [dealPrice, setDealPrice] = useState<number | null>(null)

  const maxAcceptablePrice = Math.round(item.currentValue * bot.acceptanceThreshold)

  function botWillAccept(price: number): boolean {
    return price <= maxAcceptablePrice
  }

  function accept(price: number) {
    setDealPrice(price)
    setOutcome('deal')
  }

  function reject() {
    setOutcome('no-deal')
  }

  function counter(playerPrice: number) {
    const nextRound = round + 1
    setCurrentOffer(playerPrice)
    setRound(nextRound)

    if (nextRound > 3) {
      // After 3 rounds, bot decides
      if (botWillAccept(playerPrice)) {
        setDealPrice(playerPrice)
        setOutcome('deal')
      } else {
        setOutcome('no-deal')
      }
    }
  }

  function patienceExpired() {
    setOutcome('no-deal')
  }

  return { mode, round, currentOffer, outcome, dealPrice, accept, reject, counter, patienceExpired, botWillAccept }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/hooks/useNegotiation.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNegotiation.ts tests/hooks/useNegotiation.test.ts
git commit -m "feat: negotiation hook — mode A/B, rounds, accept/counter/reject, patience"
```

---

## Task 6: Patience Hook & Price Slider Component

**Files:**
- Create: `src/hooks/usePatience.ts`
- Create: `src/components/PriceSlider.tsx`
- Create: `src/components/PatienceMeter.tsx`

- [ ] **Step 1: Create usePatience.ts**

```ts
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
  onExpire: () => void
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
    if (pausedRef.current) return
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const remaining = Math.max(0, 1 - elapsed / durationRef.current)
    setProgress(remaining)

    if (remaining === 0) {
      setIsExpired(true)
      onExpireRef.current()
    } else {
      frameRef.current = requestAnimationFrame(tick)
    }
  }, [])

  useEffect(() => {
    startTimeRef.current = Date.now()
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick])

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
```

- [ ] **Step 2: Create PatienceMeter.tsx**

```tsx
// src/components/PatienceMeter.tsx
import { motion } from 'framer-motion'

interface PatienceMeterProps {
  progress: number // 1.0 = full, 0.0 = empty
}

export function PatienceMeter({ progress }: PatienceMeterProps) {
  const color = progress > 0.5 ? '#00B894' : progress > 0.25 ? '#FDCB6E' : '#FF4757'

  return (
    <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create PriceSlider.tsx**

```tsx
// src/components/PriceSlider.tsx
import { motion } from 'framer-motion'

interface PriceSliderProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}

export function PriceSlider({ min, max, value, onChange }: PriceSliderProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <motion.div
        key={value}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.2 }}
        className="text-4xl font-storybook text-coin"
      >
        🪙 {value}
      </motion.div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-coin"
        style={{ background: `linear-gradient(to right, #F5C842 0%, #F5C842 ${((value - min) / (max - min)) * 100}%, #4a4a6a ${((value - min) / (max - min)) * 100}%, #4a4a6a 100%)` }}
      />
      <div className="flex justify-between w-full text-sm text-gray-400">
        <span>{min} coins</span>
        <span>{max} coins</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePatience.ts src/components/
git commit -m "feat: patience timer hook, patience meter bar, price slider"
```

---

## Task 7: Bot Dialogue Hook

**Files:**
- Create: `src/hooks/useBotDialogue.ts`

- [ ] **Step 1: Create useBotDialogue.ts**

```ts
// src/hooks/useBotDialogue.ts
import { useState, useCallback } from 'react'
import { generateBotDialogue } from '../services/openai'
import { speakText } from '../services/elevenlabs'
import type { BotConfig } from '../data/bots'
import type { GameItem } from '../store/gameStore'
import type { NegotiationMode } from './useNegotiation'

type DialogueMode = 'offer' | 'ask' | 'counter' | 'accept' | 'reject' | 'walk'

interface UseBotDialogueReturn {
  dialogue: string
  isLoading: boolean
  triggerDialogue: (mode: DialogueMode, amount?: number, round?: number) => Promise<void>
}

export function useBotDialogue(bot: BotConfig, item: GameItem): UseBotDialogueReturn {
  const [dialogue, setDialogue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const triggerDialogue = useCallback(
    async (mode: DialogueMode, amount?: number, round = 1) => {
      setIsLoading(true)
      const text = await generateBotDialogue({
        botPersonality: bot.personality,
        itemName: item.name,
        mode,
        offerAmount: amount,
        round,
      })
      setDialogue(text)
      setIsLoading(false)
      speakText(text) // fire and forget — voice is non-blocking
    },
    [bot, item]
  )

  return { dialogue, isLoading, triggerDialogue }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useBotDialogue.ts
git commit -m "feat: bot dialogue hook — OpenAI fetch + ElevenLabs voice trigger"
```

---

## Task 8: Shop Scene Background

**Files:**
- Create: `src/phases/ShopPhase/ShopScene.tsx`

- [ ] **Step 1: Create the shop scene background**

```bash
mkdir -p src/phases/ShopPhase src/phases/SessionEnd src/phases/WorldMap
```

```tsx
// src/phases/ShopPhase/ShopScene.tsx
import { motion } from 'framer-motion'

interface ShopSceneProps {
  children: React.ReactNode
}

// Pedestrian NPC that walks across the background
function Pedestrian({ delay, fromLeft }: { delay: number; fromLeft: boolean }) {
  return (
    <motion.div
      className="absolute bottom-16 text-3xl"
      initial={{ x: fromLeft ? -60 : '110vw' }}
      animate={{ x: fromLeft ? '110vw' : -60 }}
      transition={{ duration: 12, delay, repeat: Infinity, ease: 'linear' }}
      style={{ zIndex: 1 }}
    >
      {['🚶', '🚶‍♀️', '🏃', '👴', '👩'][Math.floor(Math.random() * 5)]}
    </motion.div>
  )
}

export function ShopScene({ children }: ShopSceneProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B8D4E8 40%, #C8A882 60%, #A0826D 100%)' }}>
      {/* Sky */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #6BB5D6 0%, #A8D0E6 35%)' }} />

      {/* Building facade */}
      <div className="absolute top-0 left-0 right-0 h-3/5"
        style={{ background: 'linear-gradient(180deg, #E8D5B7 0%, #D4B896 100%)', borderBottom: '8px solid #8B6914' }}>
        {/* Windows */}
        {[15, 35, 55, 75].map((left) => (
          <div key={left} className="absolute top-8 w-14 h-16 rounded-t-lg"
            style={{ left: `${left}%`, background: '#87CEEB', border: '4px solid #8B6914', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)' }} />
        ))}
        {/* Awning */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-12 rounded-t-lg"
          style={{ background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F5F5 20px, #F5F5F5 40px)', borderRadius: '8px 8px 0 0' }} />
      </div>

      {/* Sidewalk */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5"
        style={{ background: 'linear-gradient(180deg, #C8B89A 0%, #B8A882 100%)' }}>
        {/* Pavement lines */}
        {[10, 30, 50, 70, 90].map((pos) => (
          <div key={pos} className="absolute top-0 bottom-0 w-px opacity-30"
            style={{ left: `${pos}%`, background: '#8B7355' }} />
        ))}
      </div>

      {/* Trees */}
      <div className="absolute text-7xl" style={{ left: '5%', bottom: '30%', zIndex: 2 }}>🌳</div>
      <div className="absolute text-6xl" style={{ right: '6%', bottom: '32%', zIndex: 2 }}>🌳</div>
      <div className="absolute text-5xl" style={{ left: '18%', bottom: '28%', zIndex: 2 }}>🌲</div>

      {/* Pedestrian NPCs */}
      <Pedestrian delay={0} fromLeft={true} />
      <Pedestrian delay={5} fromLeft={false} />
      <Pedestrian delay={9} fromLeft={true} />

      {/* Game content (stall, bot, UI) */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/phases/ShopPhase/ShopScene.tsx
git commit -m "feat: shop scene background — building facade, sidewalk, trees, pedestrian NPCs"
```

---

## Task 9: Shop Phase Components

**Files:**
- Create: `src/phases/ShopPhase/SpeechBubble.tsx`
- Create: `src/phases/ShopPhase/BotCharacter.tsx`
- Create: `src/phases/ShopPhase/CoinCounter.tsx`
- Create: `src/phases/ShopPhase/InventoryDisplay.tsx`

- [ ] **Step 1: Create SpeechBubble.tsx**

```tsx
// src/phases/ShopPhase/SpeechBubble.tsx
import { motion, AnimatePresence } from 'framer-motion'

interface SpeechBubbleProps {
  text: string
  isLoading: boolean
}

export function SpeechBubble({ text, isLoading }: SpeechBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={text}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl px-5 py-3 max-w-xs text-gray-800 text-lg font-storybook shadow-lg"
        style={{ border: '3px solid #333' }}
      >
        {isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          text
        )}
        {/* Bubble tail */}
        <div className="absolute -bottom-4 left-8 w-0 h-0"
          style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '16px solid #333' }} />
        <div className="absolute -bottom-3 left-8 w-0 h-0"
          style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '16px solid white', marginLeft: '0px' }} />
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Create BotCharacter.tsx**

```tsx
// src/phases/ShopPhase/BotCharacter.tsx
import { motion } from 'framer-motion'
import { PatienceMeter } from '../../components/PatienceMeter'
import { SpeechBubble } from './SpeechBubble'
import type { BotConfig } from '../../data/bots'

interface BotCharacterProps {
  bot: BotConfig
  dialogue: string
  isLoadingDialogue: boolean
  patienceProgress: number
  fromLeft: boolean
}

export function BotCharacter({ bot, dialogue, isLoadingDialogue, patienceProgress, fromLeft }: BotCharacterProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 mb-4"
      initial={{ x: fromLeft ? -200 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {dialogue && <SpeechBubble text={dialogue} isLoading={isLoadingDialogue} />}
      <PatienceMeter progress={patienceProgress} />
      <motion.div
        className="text-8xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 4px 8px ${bot.color}88)` }}
      >
        {bot.emoji}
      </motion.div>
      <span className="text-white text-sm font-storybook"
        style={{ textShadow: `0 0 8px ${bot.color}` }}>
        {bot.displayName}
      </span>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create CoinCounter.tsx**

```tsx
// src/phases/ShopPhase/CoinCounter.tsx
import { motion, AnimatePresence } from 'framer-motion'

interface CoinCounterProps {
  coins: number
}

export function CoinCounter({ coins }: CoinCounterProps) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-50 rounded-full px-4 py-2 z-20">
      <span className="text-2xl">🪙</span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={coins}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="text-2xl font-storybook text-coin"
        >
          {coins}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 4: Create InventoryDisplay.tsx**

```tsx
// src/phases/ShopPhase/InventoryDisplay.tsx
import { motion } from 'framer-motion'
import type { GameItem } from '../../store/gameStore'

interface InventoryDisplayProps {
  items: GameItem[]
  activeItemId: string | null
  onSelectItem: (item: GameItem) => void
}

export function InventoryDisplay({ items, activeItemId, onSelectItem }: InventoryDisplayProps) {
  return (
    <div className="flex gap-3 p-3 bg-stall rounded-xl shadow-xl border-4 border-amber-900 mb-2"
      style={{ background: 'linear-gradient(180deg, #8B5E3C 0%, #6B4423 100%)' }}>
      {items.map((item) => (
        <motion.button
          key={item.id}
          onClick={() => onSelectItem(item)}
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.95 }}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${
            activeItemId === item.id
              ? 'bg-yellow-400 bg-opacity-30 ring-2 ring-coin'
              : 'bg-black bg-opacity-20 hover:bg-opacity-30'
          }`}
        >
          <span className="text-4xl">{item.emoji}</span>
          <span className="text-white text-xs font-storybook mt-1">{item.name}</span>
          <span className="text-coin text-xs">🪙 {item.currentValue}</span>
        </motion.button>
      ))}
      {items.length === 0 && (
        <div className="text-gray-400 font-storybook px-4 py-2">All sold!</div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/phases/ShopPhase/SpeechBubble.tsx src/phases/ShopPhase/BotCharacter.tsx src/phases/ShopPhase/CoinCounter.tsx src/phases/ShopPhase/InventoryDisplay.tsx
git commit -m "feat: shop phase components — speech bubble, bot character, coin counter, inventory"
```

---

## Task 10: Negotiation UI

**Files:**
- Create: `src/phases/ShopPhase/NegotiationUI.tsx`

- [ ] **Step 1: Create NegotiationUI.tsx**

```tsx
// src/phases/ShopPhase/NegotiationUI.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { PriceSlider } from '../../components/PriceSlider'
import type { GameItem } from '../../store/gameStore'
import type { BotConfig } from '../../data/bots'

interface NegotiationUIProps {
  item: GameItem
  bot: BotConfig
  currentOffer: number
  mode: 'A' | 'B'
  round: number
  onAccept: (price: number) => void
  onReject: () => void
  onCounter: (price: number) => void
  botWillAccept: (price: number) => boolean
}

export function NegotiationUI({
  item, bot, currentOffer, mode, round, onAccept, onReject, onCounter, botWillAccept
}: NegotiationUIProps) {
  const sliderMin = Math.round(item.restockCost * 0.8)
  const sliderMax = Math.round(item.currentValue * 2)
  const [sliderValue, setSliderValue] = useState(currentOffer)

  const hint = botWillAccept(sliderValue) ? '✅ They might take this!' : '❌ Too high for them'

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-lg bg-black bg-opacity-70 backdrop-blur rounded-2xl p-5 border border-gray-600"
    >
      {/* Item being negotiated */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-5xl">{item.emoji}</span>
        <div>
          <div className="text-white font-storybook text-xl">{item.name}</div>
          <div className="text-gray-400 text-sm">
            {mode === 'A' ? `${bot.displayName} offered you` : `${bot.displayName} wants to know your price`}
            {mode === 'A' && <span className="text-coin ml-1">🪙 {currentOffer}</span>}
          </div>
          <div className="text-gray-500 text-xs">Round {round} / 3</div>
        </div>
      </div>

      {/* Slider */}
      <PriceSlider min={sliderMin} max={sliderMax} value={sliderValue} onChange={setSliderValue} />
      <div className="text-center text-sm mt-1 mb-4" style={{ color: botWillAccept(sliderValue) ? '#00B894' : '#FF4757' }}>
        {hint}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {mode === 'A' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAccept(currentOffer)}
            className="flex-1 py-3 rounded-xl font-storybook text-white text-lg"
            style={{ background: '#00B894' }}
          >
            ✅ Accept
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCounter(sliderValue)}
          className="flex-1 py-3 rounded-xl font-storybook text-white text-lg"
          style={{ background: '#6C5CE7' }}
        >
          💬 {mode === 'A' ? 'Counter' : 'Offer'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReject}
          className="flex-1 py-3 rounded-xl font-storybook text-white text-lg"
          style={{ background: '#FF4757' }}
        >
          ❌ Reject
        </motion.button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/phases/ShopPhase/NegotiationUI.tsx
git commit -m "feat: negotiation UI — price slider, accept/counter/reject buttons, hint text"
```

---

## Task 11: Shop Phase Assembly

**Files:**
- Create: `src/phases/ShopPhase/ShopPhase.tsx`

- [ ] **Step 1: Create ShopPhase.tsx**

```tsx
// src/phases/ShopPhase/ShopPhase.tsx
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShopScene } from './ShopScene'
import { BotCharacter } from './BotCharacter'
import { NegotiationUI } from './NegotiationUI'
import { CoinCounter } from './CoinCounter'
import { InventoryDisplay } from './InventoryDisplay'
import { useNegotiation } from '../../hooks/useNegotiation'
import { useBotDialogue } from '../../hooks/useBotDialogue'
import { usePatience } from '../../hooks/usePatience'
import { useGameStore } from '../../store/gameStore'
import { randomBot } from '../../data/bots'
import { generateSessionInventory } from '../../data/items'
import type { GameItem } from '../../store/gameStore'
import type { BotConfig } from '../../data/bots'

export function ShopPhase() {
  const { coins, inventory, setInventory, recordSale, setPhase, unlockedCategories } = useGameStore()

  const [currentBot, setCurrentBot] = useState<BotConfig | null>(null)
  const [currentItem, setCurrentItem] = useState<GameItem | null>(null)
  const [fromLeft, setFromLeft] = useState(true)
  const [merchantReaction, setMerchantReaction] = useState<'celebrate' | 'shrug' | null>(null)

  // Seed inventory on mount if empty
  useEffect(() => {
    if (inventory.length === 0) {
      setInventory(generateSessionInventory(unlockedCategories))
    }
  }, [])

  const negotiation = useNegotiation(
    currentItem ?? { id: '', name: '', category: 'gems', baseValue: 0, restockCost: 0, currentValue: 0, emoji: '', rarity: 'common' },
    currentBot ?? {
      type: 'excited-kid', displayName: '', emoji: '', color: '', personality: '',
      patienceDuration: 15, patienceDrainMultiplier: 1, acceptanceThreshold: 1, offerBias: 1
    }
  )

  const dialogue = useBotDialogue(
    currentBot ?? { type: 'excited-kid', displayName: '', emoji: '', color: '', personality: '', patienceDuration: 15, patienceDrainMultiplier: 1, acceptanceThreshold: 1, offerBias: 1 },
    currentItem ?? { id: '', name: '', category: 'gems', baseValue: 0, restockCost: 0, currentValue: 0, emoji: '', rarity: 'common' }
  )

  const onPatienceExpire = useCallback(() => {
    dialogue.triggerDialogue('walk')
    negotiation.patienceExpired()
    setMerchantReaction('shrug')
    setTimeout(nextBot, 2500)
  }, [])

  const patience = usePatience(currentBot?.patienceDuration ?? 20, onPatienceExpire)

  function spawnBot(item: GameItem) {
    const bot = randomBot()
    setCurrentBot(bot)
    setCurrentItem(item)
    setFromLeft(Math.random() < 0.5)
    const mode = Math.random() < 0.5 ? 'offer' : 'ask'
    const amount = Math.round(item.currentValue * bot.offerBias)
    setTimeout(() => dialogue.triggerDialogue(mode, amount, 1), 400)
  }

  function nextBot() {
    setCurrentBot(null)
    setCurrentItem(null)
    setMerchantReaction(null)
  }

  function handleSelectItem(item: GameItem) {
    if (!currentBot) spawnBot(item)
  }

  async function handleAccept(price: number) {
    if (!currentItem || !currentBot) return
    await dialogue.triggerDialogue('accept', price, negotiation.round)
    patience.pause()
    recordSale({
      itemId: currentItem.id,
      itemName: currentItem.name,
      restockCost: currentItem.restockCost,
      soldFor: price,
      profit: price - currentItem.restockCost,
      soldAt: Date.now(),
    })
    setInventory(inventory.filter((i) => i.id !== currentItem.id))
    negotiation.accept(price)
    setMerchantReaction('celebrate')
    setTimeout(() => {
      nextBot()
      if (inventory.filter((i) => i.id !== currentItem.id).length === 0) {
        setTimeout(() => setPhase('session-end'), 1500)
      }
    }, 2000)
  }

  async function handleReject() {
    if (!currentBot) return
    await dialogue.triggerDialogue('reject')
    patience.pause()
    negotiation.reject()
    setMerchantReaction('shrug')
    setTimeout(nextBot, 1500)
  }

  async function handleCounter(price: number) {
    if (!currentBot || !currentItem) return
    negotiation.counter(price)
    if (negotiation.botWillAccept(price)) {
      await dialogue.triggerDialogue('accept', price, negotiation.round)
      handleAccept(price)
    } else {
      const counterAmount = Math.round(price * 0.85)
      await dialogue.triggerDialogue('counter', counterAmount, negotiation.round + 1)
    }
  }

  return (
    <ShopScene>
      <CoinCounter coins={coins} />

      {/* Merchant reaction */}
      <AnimatePresence>
        {merchantReaction && (
          <motion.div
            key={merchantReaction}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -30, opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 text-5xl z-30"
          >
            {merchantReaction === 'celebrate' ? '🎉' : '😔'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot */}
      <AnimatePresence>
        {currentBot && currentItem && (
          <BotCharacter
            bot={currentBot}
            dialogue={dialogue.dialogue}
            isLoadingDialogue={dialogue.isLoading}
            patienceProgress={patience.progress}
            fromLeft={fromLeft}
          />
        )}
      </AnimatePresence>

      {/* Negotiation UI */}
      <AnimatePresence>
        {currentBot && currentItem && negotiation.outcome === null && (
          <NegotiationUI
            item={currentItem}
            bot={currentBot}
            currentOffer={negotiation.currentOffer}
            mode={negotiation.mode}
            round={negotiation.round}
            onAccept={handleAccept}
            onReject={handleReject}
            onCounter={handleCounter}
            botWillAccept={negotiation.botWillAccept}
          />
        )}
      </AnimatePresence>

      {/* Inventory */}
      <InventoryDisplay
        items={inventory}
        activeItemId={currentItem?.id ?? null}
        onSelectItem={handleSelectItem}
      />

      {/* Close shop button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={() => setPhase('session-end')}
        className="mt-2 px-6 py-2 rounded-full text-sm font-storybook text-gray-300 bg-black bg-opacity-40 border border-gray-600"
      >
        Close Shop →
      </motion.button>
    </ShopScene>
  )
}
```

- [ ] **Step 2: Update App.tsx to render ShopPhase**

```tsx
// src/App.tsx
import { ShopPhase } from './phases/ShopPhase/ShopPhase'
import { useGameStore } from './store/gameStore'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  if (phase === 'shop') return <ShopPhase />

  return (
    <div className="flex items-center justify-center h-screen text-white text-4xl font-storybook">
      Phase: {phase} — coming soon
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and verify shop phase renders**

```bash
npm run dev
```

Expected: Storybook shop scene with building, trees, pedestrians, and inventory bar at bottom.

- [ ] **Step 4: Commit**

```bash
git add src/phases/ShopPhase/ShopPhase.tsx src/App.tsx
git commit -m "feat: shop phase assembly — bot spawning, negotiation flow, deal/reject outcomes"
```

---

## Task 12: Session End Screen

**Files:**
- Create: `src/phases/SessionEnd/SessionEnd.tsx`

- [ ] **Step 1: Create SessionEnd.tsx**

```tsx
// src/phases/SessionEnd/SessionEnd.tsx
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { generateSessionInventory } from '../../data/items'
import { UNLOCK_MILESTONES } from '../../data/items'

export function SessionEnd() {
  const { sessionSales, coins, lifetimeCoins, setPhase, clearSessionSales, setInventory, unlockedCategories, unlockCategory } = useGameStore()

  const totalProfit = sessionSales.reduce((sum, s) => sum + s.profit, 0)
  const totalRevenue = sessionSales.reduce((sum, s) => sum + s.soldFor, 0)

  function handleContinue() {
    // Check milestone unlocks
    UNLOCK_MILESTONES.forEach(({ coins: threshold, category }) => {
      if (lifetimeCoins >= threshold && !unlockedCategories.includes(category)) {
        unlockCategory(category)
      }
    })
    // Restock inventory
    setInventory(generateSessionInventory(unlockedCategories))
    clearSessionSales()
    setPhase('world-map')
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 p-8"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      <motion.h1
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-storybook text-coin"
      >
        🎉 Session Complete!
      </motion.h1>

      {/* Sales breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-black bg-opacity-40 rounded-2xl p-4 border border-gray-700"
      >
        {sessionSales.length === 0 ? (
          <p className="text-gray-400 text-center font-storybook">No sales this session.</p>
        ) : (
          sessionSales.map((sale, i) => (
            <motion.div
              key={sale.itemId}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
              className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0"
            >
              <span className="text-white font-storybook">{sale.itemName}</span>
              <div className="text-right">
                <div className="text-coin text-sm">Sold: 🪙 {sale.soldFor}</div>
                <div className="text-xs" style={{ color: sale.profit >= 0 ? '#00B894' : '#FF4757' }}>
                  Profit: {sale.profit >= 0 ? '+' : ''}{sale.profit}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Totals */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-8 text-center"
      >
        <div>
          <div className="text-3xl font-storybook text-coin">🪙 {totalRevenue}</div>
          <div className="text-gray-400 text-sm">Revenue</div>
        </div>
        <div>
          <div className="text-3xl font-storybook" style={{ color: totalProfit >= 0 ? '#00B894' : '#FF4757' }}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit}
          </div>
          <div className="text-gray-400 text-sm">Profit</div>
        </div>
        <div>
          <div className="text-3xl font-storybook text-coin">🪙 {coins}</div>
          <div className="text-gray-400 text-sm">Total Coins</div>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleContinue}
        className="px-10 py-4 rounded-2xl text-2xl font-storybook text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #6C5CE7, #a855f7)' }}
      >
        Explore Town →
      </motion.button>
    </div>
  )
}
```

- [ ] **Step 2: Wire SessionEnd into App.tsx**

```tsx
// src/App.tsx
import { ShopPhase } from './phases/ShopPhase/ShopPhase'
import { SessionEnd } from './phases/SessionEnd/SessionEnd'
import { useGameStore } from './store/gameStore'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  if (phase === 'shop') return <ShopPhase />
  if (phase === 'session-end') return <SessionEnd />

  return (
    <div className="flex items-center justify-center h-screen text-white text-4xl font-storybook">
      World Map — coming soon
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/phases/SessionEnd/ src/App.tsx
git commit -m "feat: session end screen — sales breakdown, profit summary, unlock check, restock"
```

---

## Task 13: World Map

**Files:**
- Create: `src/phases/WorldMap/LocationTile.tsx`
- Create: `src/phases/WorldMap/MerchantWalker.tsx`
- Create: `src/phases/WorldMap/MarketModal.tsx`
- Create: `src/phases/WorldMap/VaultModal.tsx`
- Create: `src/phases/WorldMap/WorldMap.tsx`

- [ ] **Step 1: Create LocationTile.tsx**

```tsx
// src/phases/WorldMap/LocationTile.tsx
import { motion } from 'framer-motion'
import type { MapLocation } from '../../data/locations'

interface LocationTileProps {
  location: MapLocation
  isUnlocked: boolean
  coins: number
  onClick: () => void
}

export function LocationTile({ location, isUnlocked, coins, onClick }: LocationTileProps) {
  return (
    <motion.button
      onClick={isUnlocked ? onClick : undefined}
      whileHover={isUnlocked ? { scale: 1.1 } : {}}
      whileTap={isUnlocked ? { scale: 0.95 } : {}}
      className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all"
      style={{
        position: 'absolute',
        left: `${location.position.x}%`,
        top: `${location.position.y}%`,
        transform: 'translate(-50%, -50%)',
        borderColor: isUnlocked ? '#F5C842' : '#555',
        background: isUnlocked ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
        filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.5)',
        cursor: isUnlocked ? 'pointer' : 'not-allowed',
        minWidth: '80px',
      }}
      title={isUnlocked ? location.description : `Unlock at 🪙 ${location.unlockCoins} coins`}
    >
      <span className="text-3xl">{isUnlocked ? location.emoji : '🔒'}</span>
      <span className="text-white text-xs font-storybook text-center leading-tight">{location.name}</span>
      {!isUnlocked && (
        <span className="text-coin text-xs">🪙 {location.unlockCoins}</span>
      )}
    </motion.button>
  )
}
```

- [ ] **Step 2: Create MerchantWalker.tsx**

```tsx
// src/phases/WorldMap/MerchantWalker.tsx
import { motion } from 'framer-motion'

interface MerchantWalkerProps {
  x: number
  y: number
}

export function MerchantWalker({ x, y }: MerchantWalkerProps) {
  return (
    <motion.div
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="absolute z-20"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl"
        style={{ filter: 'drop-shadow(0 0 12px #6C5CE7)' }}
      >
        🧙
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create MarketModal.tsx**

```tsx
// src/phases/WorldMap/MarketModal.tsx
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

interface MarketModalProps {
  onClose: () => void
}

export function MarketModal({ onClose }: MarketModalProps) {
  const inventory = useGameStore((s) => s.inventory)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-3xl p-6 border-2 border-coin max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-storybook text-coin mb-4 text-center">🛒 Next Batch</h2>
        {inventory.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-white font-storybook">{item.emoji} {item.name}</span>
            <div className="text-right">
              <div className="text-coin text-sm">Worth: 🪙 {item.currentValue}</div>
              <div className="text-gray-400 text-xs">Cost: 🪙 {item.restockCost}</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} className="mt-4 w-full py-3 rounded-xl font-storybook text-white bg-gray-700">
          Close
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Create VaultModal.tsx**

```tsx
// src/phases/WorldMap/VaultModal.tsx
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

interface VaultModalProps {
  onClose: () => void
}

export function VaultModal({ onClose }: VaultModalProps) {
  const { coins, lifetimeCoins, salesHistory } = useGameStore()
  const totalProfit = salesHistory.reduce((s, r) => s + r.profit, 0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-3xl p-6 border-2 border-coin max-w-sm w-full mx-4 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-storybook text-coin mb-4 text-center">🏦 The Vault</h2>
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <div className="text-2xl font-storybook text-coin">🪙 {coins}</div>
            <div className="text-gray-400 text-xs">Current Coins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-storybook" style={{ color: totalProfit >= 0 ? '#00B894' : '#FF4757' }}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit}
            </div>
            <div className="text-gray-400 text-xs">Total Profit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-storybook text-white">{salesHistory.length}</div>
            <div className="text-gray-400 text-xs">Items Sold</div>
          </div>
        </div>
        <div className="text-gray-400 text-xs font-storybook mb-2">Recent Sales</div>
        {salesHistory.slice(-10).reverse().map((sale, i) => (
          <div key={i} className="flex justify-between py-1 border-b border-gray-800 text-sm">
            <span className="text-white">{sale.itemName}</span>
            <span className="text-coin">+{sale.soldFor}</span>
          </div>
        ))}
        <button onClick={onClose} className="mt-4 w-full py-3 rounded-xl font-storybook text-white bg-gray-700">
          Close
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 5: Create WorldMap.tsx**

```tsx
// src/phases/WorldMap/WorldMap.tsx
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LocationTile } from './LocationTile'
import { MerchantWalker } from './MerchantWalker'
import { MarketModal } from './MarketModal'
import { VaultModal } from './VaultModal'
import { useGameStore } from '../../store/gameStore'
import { MAP_LOCATIONS } from '../../data/locations'

export function WorldMap() {
  const { coins, unlockedCategories, setPhase } = useGameStore()
  const [merchantPos, setMerchantPos] = useState({ x: 50, y: 60 })
  const [openModal, setOpenModal] = useState<string | null>(null)

  function isUnlocked(locationId: string): boolean {
    const loc = MAP_LOCATIONS.find((l) => l.id === locationId)
    if (!loc) return false
    if (coins < loc.unlockCoins) return false
    if (loc.unlockCategory && !unlockedCategories.includes(loc.unlockCategory)) return false
    return true
  }

  function handleLocationClick(locationId: string) {
    const loc = MAP_LOCATIONS.find((l) => l.id === locationId)
    if (!loc) return

    setMerchantPos(loc.position)

    if (locationId === 'your-stall') {
      setTimeout(() => setPhase('shop'), 800)
    } else if (locationId === 'the-market') {
      setTimeout(() => setOpenModal('market'), 800)
    } else if (locationId === 'the-vault') {
      setTimeout(() => setOpenModal('vault'), 800)
    }
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0d1f0d 50%, #060d06 100%)',
      }}
    >
      {/* Map background texture */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle, #2d5a2d 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Street paths */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50" y1="10" x2="50" y2="90" stroke="#8B7355" strokeWidth="2" strokeDasharray="3,3" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="#8B7355" strokeWidth="2" strokeDasharray="3,3" />
      </svg>

      {/* Map label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-storybook text-coin opacity-80">
        🗺️ Merchant Town
      </div>

      {/* Coin counter */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
        <span className="text-xl">🪙</span>
        <span className="text-xl font-storybook text-coin">{coins}</span>
      </div>

      {/* Location tiles */}
      {MAP_LOCATIONS.map((loc) => (
        <LocationTile
          key={loc.id}
          location={loc}
          isUnlocked={isUnlocked(loc.id)}
          coins={coins}
          onClick={() => handleLocationClick(loc.id)}
        />
      ))}

      {/* Merchant walker */}
      <MerchantWalker x={merchantPos.x} y={merchantPos.y} />

      {/* Modals */}
      <AnimatePresence>
        {openModal === 'market' && <MarketModal onClose={() => setOpenModal(null)} />}
        {openModal === 'vault' && <VaultModal onClose={() => setOpenModal(null)} />}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/phases/WorldMap/
git commit -m "feat: world map — locations, merchant walker, market preview, vault stats"
```

---

## Task 14: Phase Router & Full Game Wiring

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wire all three phases into App.tsx**

```tsx
// src/App.tsx
import { ShopPhase } from './phases/ShopPhase/ShopPhase'
import { SessionEnd } from './phases/SessionEnd/SessionEnd'
import { WorldMap } from './phases/WorldMap/WorldMap'
import { useGameStore } from './store/gameStore'
import { AnimatePresence, motion } from 'framer-motion'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="w-screen h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
          {phase === 'shop' && <ShopPhase />}
          {phase === 'session-end' && <SessionEnd />}
          {phase === 'world-map' && <WorldMap />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Run full game in dev server**

```bash
npm run dev
```

Expected:
- Shop scene loads with building, trees, pedestrians, inventory bar
- Clicking an item spawns a bot that walks in with speech bubble and patience meter
- Price slider and Accept/Counter/Reject buttons appear
- Making a deal shows celebration and removes item from inventory
- When all items sold (or Close Shop clicked), session end screen appears
- Clicking "Explore Town" opens the world map
- Clicking "Your Stall" on the map returns to the shop

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: full phase router — shop → session-end → world-map → shop loop complete"
```

---

## Task 15: Build & Deploy Configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Verify production build succeeds**

```bash
npm run build
```

Expected: `dist/` folder created. No TypeScript errors.

- [ ] **Step 2: Create vercel.json for SPA routing**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 3: Test the built output locally**

```bash
npx serve dist
```

Expected: Game loads at `http://localhost:3000`. All phases work.

- [ ] **Step 4: Embed test — verify iframe works**

Open a plain HTML file in browser with:
```html
<!DOCTYPE html>
<html>
<body style="margin:0">
  <iframe src="http://localhost:3000" width="800" height="600" frameborder="0" />
</body>
</html>
```

Expected: Game renders and is fully playable inside the iframe.

- [ ] **Step 5: Final commit**

```bash
git add vercel.json
git commit -m "feat: add vercel.json SPA rewrite config for deployment"
```

---

## Final Test Run

- [ ] **Run all tests one final time**

```bash
npx vitest run
```

Expected: All tests pass with no errors.

- [ ] **Run build one final time**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors, `dist/` folder ready to deploy.
