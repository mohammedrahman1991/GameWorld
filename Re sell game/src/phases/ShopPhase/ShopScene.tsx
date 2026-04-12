// src/phases/ShopPhase/ShopScene.tsx
import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface ShopSceneProps {
  children: React.ReactNode
  floor?: 1 | 2 | 3
}

// One animated raindrop
function RainDrop({ x, delay, duration }: { x: number; delay: number; duration: number }) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${x}%`,
        top: '-4px',
        width: '1.5px',
        height: '14px',
        background: 'linear-gradient(180deg, transparent, rgba(160,210,255,0.7))',
        borderRadius: '2px',
      }}
      initial={{ y: -14, opacity: 0.7 }}
      animate={{ y: 220, opacity: 0 }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  )
}

// Rain layer rendered inside the window rect
function RainWindow() {
  const drops = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 0.5 + Math.random() * 0.5,
      })),
    []
  )

  return (
    <div
      className="absolute overflow-hidden rounded-lg"
      style={{
        left: '4%',
        top: '8%',
        width: '18%',
        height: '38%',
        background: 'linear-gradient(180deg, #1a2a40 0%, #2a3d5a 60%, #1e2d42 100%)',
        border: '6px solid #5a3e2b',
        boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)',
      }}
    >
      {/* Glass sheen */}
      <div className="absolute inset-0 opacity-10"
        style={{ background: 'linear-gradient(135deg, white 0%, transparent 40%)' }} />
      {/* Rain drops */}
      {drops.map((d, i) => (
        <RainDrop key={i} x={d.x} delay={d.delay} duration={d.duration} />
      ))}
      {/* Window cross frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 bottom-0" style={{ left: '50%', width: '5px', background: '#5a3e2b', transform: 'translateX(-50%)' }} />
        <div className="absolute left-0 right-0" style={{ top: '48%', height: '5px', background: '#5a3e2b', transform: 'translateY(-50%)' }} />
      </div>
      {/* Rain on glass streaks */}
      <div className="absolute inset-0 opacity-20"
        style={{ background: 'repeating-linear-gradient(175deg, transparent 0px, transparent 8px, rgba(160,210,255,0.3) 9px, transparent 10px)' }} />
    </div>
  )
}

// Customer that walks in through the door
function CustomerWalker({ delay }: { delay: number }) {
  const emoji = useMemo(
    () => ['🚶', '🚶‍♀️', '👴', '👩', '🧑'][Math.floor(Math.random() * 5)],
    []
  )
  return (
    <motion.div
      className="absolute text-2xl"
      style={{ bottom: '22%', right: '14%', zIndex: 1 }}
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: [80, 0, 0, 80], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 10, delay, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
    >
      {emoji}
    </motion.div>
  )
}

const FLOOR_THEMES = {
  1: {
    wall: 'linear-gradient(180deg, #4a2e1a 0%, #5a3822 100%)',
    wallBorder: '#3a2010',
    floor: 'linear-gradient(180deg, #8B5E3C 0%, #6B4423 100%)',
    bg: '#2d1a0e',
    stripeColor: '#F5C842',
    label: '1F — Shop Floor',
    shelfItems: ['💎', '🔴', '⚔️', '🥇', '🔮', '🏺', '🌋', '👑'],
    shelfItems2: ['🛢️', '📈', '🪨', '💚', '🌑', '⛏️', '⚡', '🚀'],
  },
  2: {
    wall: 'linear-gradient(180deg, #1a2a3a 0%, #1e3248 100%)',
    wallBorder: '#0f1e2e',
    floor: 'linear-gradient(180deg, #2a3a4a 0%, #1a2a38 100%)',
    bg: '#0d1a28',
    stripeColor: '#74B9FF',
    label: '2F — Storage',
    shelfItems: ['📦', '🗃️', '📦', '🗃️', '📦', '🗃️', '📦', '🗃️'],
    shelfItems2: ['🧰', '🔧', '🗜️', '📋', '🧰', '🔧', '🗜️', '📋'],
  },
  3: {
    wall: 'linear-gradient(180deg, #1a1a2e 0%, #2a1a3e 100%)',
    wallBorder: '#0f0f20',
    floor: 'linear-gradient(180deg, #2a1a3a 0%, #1a0e28 100%)',
    bg: '#0d0d1e',
    stripeColor: '#a855f7',
    label: '3F — Penthouse',
    shelfItems: ['🏆', '👑', '💍', '🌟', '🏅', '🎖️', '✨', '💎'],
    shelfItems2: ['🌙', '⭐', '🌟', '💫', '🌙', '⭐', '🌟', '💫'],
  },
}

export function ShopScene({ children, floor = 1 }: ShopSceneProps) {
  const theme = FLOOR_THEMES[floor]

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: theme.bg }}
    >
      {/* ── BACK WALL ── */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '58%',
          background: theme.wall,
          borderBottom: `6px solid ${theme.wallBorder}`,
        }}
      />

      {/* Wallpaper stripes */}
      <div
        className="absolute top-0 left-0 right-0 opacity-15"
        style={{
          height: '58%',
          backgroundImage: `repeating-linear-gradient(90deg, ${theme.stripeColor} 0px, ${theme.stripeColor} 2px, transparent 2px, transparent 40px)`,
        }}
      />

      {/* Rain window (left side) */}
      <RainWindow />

      {/* ── SHELVES on back wall ── */}
      {/* Shelf 1 (top) */}
      <div className="absolute left-0 right-0" style={{ top: '12%', height: '6px', background: '#7a5030', boxShadow: '0 3px 6px rgba(0,0,0,0.4)' }} />
      <div className="absolute flex gap-3 items-end" style={{ top: '5%', left: '28%' }}>
        {theme.shelfItems.map((e, i) => (
          <span key={i} className="text-xl drop-shadow-lg" style={{ opacity: 0.9 }}>{e}</span>
        ))}
      </div>

      {/* Shelf 2 (middle) */}
      <div className="absolute left-0 right-0" style={{ top: '28%', height: '6px', background: '#7a5030', boxShadow: '0 3px 6px rgba(0,0,0,0.4)' }} />
      <div className="absolute flex gap-3 items-end" style={{ top: '21%', left: '28%' }}>
        {theme.shelfItems2.map((e, i) => (
          <span key={i} className="text-xl drop-shadow-lg" style={{ opacity: 0.9 }}>{e}</span>
        ))}
      </div>

      {/* Sign above door + door — only on floor 1 */}
      {floor === 1 && (
        <>
          <div
            className="absolute font-storybook text-coin text-sm px-4 py-1 rounded-lg"
            style={{ right: '8%', top: '6%', background: '#3a2010', border: '2px solid #8B6914' }}
          >
            🚪 Door
          </div>
          <div
            className="absolute rounded-t-xl"
            style={{
              right: '8%',
              top: '16%',
              width: '9%',
              height: '40%',
              background: 'linear-gradient(180deg, #6B3A2A 0%, #4a2010 100%)',
              border: '5px solid #3a2010',
              borderBottom: 'none',
              boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.4)',
            }}
          >
            <div className="absolute w-3 h-3 rounded-full" style={{ left: '15%', top: '55%', background: '#F5C842' }} />
          </div>
        </>
      )}

      {/* Floor label */}
      <div
        className="absolute font-storybook text-xs px-3 py-1 rounded-full opacity-60"
        style={{ top: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: theme.stripeColor, whiteSpace: 'nowrap' }}
      >
        {theme.label}
      </div>

      {/* ── FLOOR ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          top: '58%',
          background: theme.floor,
        }}
      >
        {/* Floor planks */}
        {[0, 14, 28, 42, 56, 70, 84].map((pos) => (
          <div
            key={pos}
            className="absolute left-0 right-0"
            style={{ top: `${pos}%`, height: '2px', background: 'rgba(0,0,0,0.25)' }}
          />
        ))}
        {/* Floor shine */}
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)' }} />
      </div>

      {/* ── COUNTER / TABLE ── */}
      <div
        className="absolute"
        style={{
          bottom: '36%',
          left: '22%',
          right: '22%',
          height: '8px',
          background: '#5a3010',
          borderRadius: '4px 4px 0 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 3,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '28%',
          left: '24%',
          right: '24%',
          height: '8%',
          background: 'linear-gradient(180deg, #6B3A1A 0%, #4a2808 100%)',
          border: '3px solid #3a2010',
          borderTop: 'none',
          zIndex: 3,
        }}
      />

      {/* Hanging lantern */}
      <motion.div
        className="absolute text-4xl"
        style={{ top: '1%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 }}
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🏮
      </motion.div>

      {/* Warm ceiling light glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: '30%',
          right: '30%',
          height: '40%',
          background: 'radial-gradient(ellipse at top, rgba(245,200,80,0.12) 0%, transparent 70%)',
          zIndex: 2,
        }}
      />

      {/* Background customer walkers */}
      <CustomerWalker delay={3} />
      <CustomerWalker delay={8} />

      {/* Game content (bot, negotiation UI, inventory) */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4" style={{ zIndex: 10 }}>
        {children}
      </div>
    </div>
  )
}
