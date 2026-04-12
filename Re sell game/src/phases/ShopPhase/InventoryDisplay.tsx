// src/phases/ShopPhase/InventoryDisplay.tsx
import { motion } from 'framer-motion'
import type { GameItem } from '../../store/gameStore'

interface InventoryDisplayProps {
  items: GameItem[]
  activeItemId: string | null
  wantedItemId?: string | null
  onSelectItem: (item: GameItem) => void
}

export function InventoryDisplay({ items, activeItemId, wantedItemId, onSelectItem }: InventoryDisplayProps) {
  return (
    <div className="flex gap-3 p-3 rounded-xl shadow-xl border-4 border-amber-900 mb-2"
      style={{ background: 'linear-gradient(180deg, #8B5E3C 0%, #6B4423 100%)' }}>
      {items.map((item) => {
        const isActive = activeItemId === item.id
        const isWanted = !isActive && wantedItemId === item.id
        return (
          <motion.button
            key={item.id}
            onClick={() => onSelectItem(item)}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            animate={isWanted ? { y: [0, -6, 0] } : {}}
            transition={isWanted ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
            className="flex flex-col items-center p-2 rounded-lg transition-all relative"
            style={{
              background: isActive
                ? 'rgba(245,200,66,0.3)'
                : isWanted
                ? 'rgba(0,184,148,0.25)'
                : 'rgba(0,0,0,0.2)',
              outline: isActive
                ? '2px solid #F5C842'
                : isWanted
                ? '2px solid #00B894'
                : 'none',
            }}
          >
            {isWanted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs">⬇️</span>
            )}
            <span className="text-4xl">{item.emoji}</span>
            <span className="text-white text-xs font-storybook mt-1">{item.name}</span>
            <span className="text-coin text-xs">🪙 {item.currentValue}</span>
          </motion.button>
        )
      })}
      {items.length === 0 && (
        <div className="text-gray-400 font-storybook px-4 py-2">All sold!</div>
      )}
    </div>
  )
}
