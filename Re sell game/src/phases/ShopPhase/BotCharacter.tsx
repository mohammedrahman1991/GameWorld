// src/phases/ShopPhase/BotCharacter.tsx
import { motion, AnimatePresence } from 'framer-motion'
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

// A single tear drop that falls
function Tear({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${x}%`,
        top: '30%',
        width: 6,
        height: 10,
        borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
        background: 'linear-gradient(180deg, #74b9ff, #0984e3)',
        zIndex: 20,
      }}
      initial={{ y: 0, opacity: 1, scaleY: 0.5 }}
      animate={{ y: 60, opacity: 0, scaleY: 1 }}
      transition={{ duration: 0.7, delay, repeat: Infinity, repeatDelay: 0.3, ease: 'easeIn' }}
    />
  )
}


// Floating happy words (bright, energetic)
function HappyWord({ word, offsetX, delay }: { word: string; offsetX: number; delay: number }) {
  return (
    <motion.div
      className="absolute font-storybook pointer-events-none"
      style={{
        left: '50%',
        top: '0%',
        x: offsetX,
        fontSize: '0.85rem',
        color: '#FDCB6E',
        whiteSpace: 'nowrap',
        zIndex: 20,
        textShadow: '0 0 8px #F5C842',
      }}
      initial={{ y: 0, opacity: 0, scale: 0.5 }}
      animate={{ y: -55, opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 1.0, ease: 'easeOut' }}
    >
      {word}
    </motion.div>
  )
}

export function BotCharacter({ bot, dialogue, isLoadingDialogue, patienceProgress, fromLeft }: BotCharacterProps) {
  const isSara = bot.type === 'sara'
  const isNoah = bot.type === 'noah'

  const tearCount = isSara ? 6 : 0
  const tears = Array.from({ length: tearCount }, (_, i) => ({
    x: 25 + (i * 50) / Math.max(tearCount - 1, 1),
    delay: i * 0.15,
  }))

  const happyWords = ['OMG!!', '🤩 WOW!', 'YESSS!', '🌟 AMAZING!', 'SO COOL!!']

  return (
    <motion.div
      className="flex flex-col items-center gap-2 mb-4"
      initial={{ x: fromLeft ? -200 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <AnimatePresence>
        {dialogue && <SpeechBubble text={dialogue} isLoading={isLoadingDialogue} />}
      </AnimatePresence>

      <PatienceMeter progress={patienceProgress} />

      {/* Character + effects */}
      <div className="relative flex flex-col items-center">

        {/* Noah: floating happy words */}
        {isNoah && happyWords.map((word, i) => (
          <HappyWord key={word} word={word} offsetX={i % 2 === 0 ? -60 : 20} delay={i * 0.4} />
        ))}

        {/* Tears (Sara only) */}
        {tears.map((t, i) => (
          <Tear key={i} x={t.x} delay={t.delay} />
        ))}

        {/* Main emoji */}
        <motion.div
          className="text-8xl"
          animate={
            isSara
              ? { y: [0, -6, 0, -4, 0], rotate: [-4, 4, -4, 4, 0], scale: [1, 1.08, 1, 1.05, 1] }
              : isNoah
              ? { y: [0, -12, 0, -8, 0], scale: [1, 1.15, 1, 1.1, 1], rotate: [-3, 3, -3, 3, 0] }
              : { y: [0, -4, 0] }
          }
          transition={
            isSara
              ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
              : isNoah
              ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{ filter: `drop-shadow(0 4px 12px ${bot.color}99)` }}
        >
          {bot.emoji}
        </motion.div>

        {/* Sara: tear puddle */}
        {isSara && (
          <motion.div className="absolute rounded-full"
            style={{ bottom: '-8px', width: '60px', height: '10px', background: 'radial-gradient(ellipse, rgba(116,185,255,0.5) 0%, transparent 70%)' }}
            animate={{ scaleX: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Noah: sparkles */}
        {isNoah && ['✨', '⭐', '🌟'].map((s, i) => (
          <motion.div key={i} className="absolute text-lg pointer-events-none"
            style={{ left: `${[10, 80, 50][i]}%`, top: `${[10, 20, -10][i]}%` }}
            animate={{ scale: [0, 1.2, 0], rotate: [0, 180, 360], opacity: [0, 1, 0] }}
            transition={{ duration: 1, delay: i * 0.3, repeat: Infinity, repeatDelay: 0.4 }}
          >
            {s}
          </motion.div>
        ))}
      </div>

      <span className="text-white text-sm font-storybook" style={{ textShadow: `0 0 8px ${bot.color}` }}>
        {bot.displayName}
        {isSara && ' 😭😭'}
        {isNoah && ' 🤩'}
      </span>
    </motion.div>
  )
}
