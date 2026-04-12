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
