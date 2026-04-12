// src/components/PlayerCharacter.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { MYSTIC_ITEMS, RARITY_COLOR, RARITY_GLOW } from '../data/mysticItems'
import type { MysticRarity } from '../data/mysticItems'

interface Props {
  x: number
  y: number
  facingLeft: boolean
  isMoving: boolean
  isRunning?: boolean
  zIndex?: number
}

const RARITY_ORDER: MysticRarity[] = ['legendary', 'rare', 'uncommon']

const BADGE_OFFSETS = [
  { x: -24, y: -44 },
  { x:   0, y: -56 },
  { x:  24, y: -44 },
]

export function PlayerCharacter({ x, y, facingLeft, isMoving, isRunning = false, zIndex = 10 }: Props) {
  const { secretBinder } = useGameStore()
  const [isJumping, setIsJumping] = useState(false)
  const jumpingRef = useRef(false)
  const bodyControls = useAnimation()
  const shadowControls = useAnimation()

  // Sort owned items: legendary → rare → uncommon
  const ownedItems = MYSTIC_ITEMS
    .filter(item => secretBinder.includes(item.id))
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))

  const displayItems = ownedItems.slice(0, 3)
  const highestRarity = ownedItems.length > 0 ? ownedItems[0].rarity : null
  const auraColor = highestRarity ? RARITY_COLOR[highestRarity] : null
  const auraGlow  = highestRarity ? RARITY_GLOW[highestRarity]  : null

  // Jump arc on spacebar — self-contained, no prop drilling needed
  useEffect(() => {
    async function doJump() {
      if (jumpingRef.current) return
      jumpingRef.current = true
      setIsJumping(true)

      // Arc up
      await bodyControls.start({
        y: -68,
        rotate: isRunning ? 20 : 0,
        transition: { duration: 0.28, ease: [0.2, 0, 0.4, 1] },
      })
      // Brief hang at peak
      await bodyControls.start({
        y: -72,
        transition: { duration: 0.08, ease: 'easeOut' },
      })
      // Fall down
      await bodyControls.start({
        y: 0,
        rotate: 0,
        transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
      })
      // Squash on landing
      await bodyControls.start({
        scaleY: 0.72,
        scaleX: 1.25,
        transition: { duration: 0.06 },
      })
      await bodyControls.start({
        scaleY: 1,
        scaleX: 1,
        transition: { duration: 0.1, ease: 'easeOut' },
      })

      jumpingRef.current = false
      setIsJumping(false)
    }

    // Shadow shrinks while in the air
    async function animateShadow() {
      if (!auraColor) return
      await shadowControls.start({ scaleX: 0.4, opacity: 0.25, transition: { duration: 0.36, ease: 'easeOut' } })
      await shadowControls.start({ scaleX: 1, opacity: 0.7, transition: { duration: 0.22, ease: 'easeIn' } })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault()
        doJump()
        animateShadow()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bodyControls, shadowControls, isRunning, auraColor])

  // Walk / run bob animation (only when not jumping)
  const walkAnim = isMoving
    ? isRunning
      ? { y: [0, -8, 0, -8, 0], rotate: [0, -5, 0, 5, 0] }
      : { y: [0, -4, 0] }
    : { y: 0 }

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex,
        fontSize: '2.8rem',
      }}
    >
      {/* ── Ground shadow (always shown, shrinks mid-jump) ── */}
      <motion.div
        animate={shadowControls}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 72,
          height: 24,
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)',
          zIndex: -1,
        }}
      />

      {/* ── Aura ring (only when mystic items owned) ── */}
      {auraColor && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 80,
            height: 28,
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            background: `radial-gradient(ellipse, ${auraGlow} 0%, transparent 70%)`,
            zIndex: -1,
          }}
          animate={{ scaleX: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Floating mystic item badges ── */}
      {displayItems.map((item, i) => (
        <motion.div
          key={item.id}
          className="absolute pointer-events-none select-none"
          style={{
            fontSize: '1.15rem',
            left: '50%',
            bottom: '100%',
            marginLeft: BADGE_OFFSETS[i].x,
            marginBottom: BADGE_OFFSETS[i].y,
            filter: `drop-shadow(0 0 5px ${RARITY_COLOR[item.rarity]}) drop-shadow(0 0 10px ${RARITY_COLOR[item.rarity]})`,
          }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.0 + i * 0.5, delay: i * 0.35, repeat: Infinity, ease: 'easeInOut' }}
        >
          {item.emoji}
        </motion.div>
      ))}

      {/* ── Character body (jump-controlled) ── */}
      <motion.div animate={bodyControls} style={{ display: 'inline-block', originY: 1 }}>
        {/* Walk bob wrapper — only active when not jumping */}
        <motion.div
          animate={isJumping ? { y: 0 } : walkAnim}
          transition={{ duration: isRunning ? 0.35 : 0.5, repeat: isJumping ? 0 : Infinity, ease: 'easeInOut' }}
          style={{
            display: 'inline-block',
            scaleX: facingLeft ? -1 : 1,
            filter: auraColor
              ? `drop-shadow(0 4px 8px rgba(0,0,0,0.6)) drop-shadow(0 0 8px ${auraColor}) drop-shadow(0 0 18px ${auraColor})`
              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
          }}
        >
          {isJumping ? '🧘' : isRunning && isMoving ? '🏃' : '🧑'}
        </motion.div>
      </motion.div>

      {/* ── Name tag ── */}
      <div
        className="absolute font-storybook text-xs text-center w-full"
        style={{
          bottom: -18,
          left: '50%',
          transform: 'translateX(-50%)',
          textShadow: auraColor
            ? `0 1px 4px rgba(0,0,0,0.8), 0 0 8px ${auraColor}`
            : '0 1px 4px rgba(0,0,0,0.8)',
          color: auraColor ?? 'white',
          whiteSpace: 'nowrap',
        }}
      >
        You
      </div>
    </div>
  )
}
