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
