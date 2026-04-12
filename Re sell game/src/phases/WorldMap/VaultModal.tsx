// src/phases/WorldMap/VaultModal.tsx
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'

interface VaultModalProps {
  onClose: () => void
}

export function VaultModal({ onClose }: VaultModalProps) {
  const { coins, salesHistory } = useGameStore()
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
