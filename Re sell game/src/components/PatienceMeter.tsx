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
