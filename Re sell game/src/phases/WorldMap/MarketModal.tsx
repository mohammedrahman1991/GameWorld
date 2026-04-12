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
