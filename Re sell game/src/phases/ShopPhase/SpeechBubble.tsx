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
