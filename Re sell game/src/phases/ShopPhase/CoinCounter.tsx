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
