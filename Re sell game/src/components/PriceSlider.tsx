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
