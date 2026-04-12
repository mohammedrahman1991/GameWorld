// src/phases/MyHouse/MyHouseScreen.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { PlayerCharacter } from '../../components/PlayerCharacter'

type HouseFloor = 1 | 2 | 3

const FLOOR_DATA = {
  1: {
    name: 'Ground Floor',
    rooms: ['🛋️ Living Room', '🍳 Kitchen', '🛏️ My Room'],
    bg: 'linear-gradient(180deg, #3E2723 0%, #4E342E 100%)',
    wallColor: '#6D4C41',
    floorColor: 'linear-gradient(180deg, #795548 0%, #5D4037 100%)',
    accent: '#FFCCBC',
    description: 'Your cozy home floor',
    furniture: [
      { emoji: '🛋️', label: 'Sofa', left: '15%', bottom: '42%' },
      { emoji: '📺', label: 'TV', left: '45%', bottom: '50%' },
      { emoji: '🪴', label: 'Plant', left: '78%', bottom: '42%' },
      { emoji: '🍳', label: 'Stove', left: '62%', bottom: '42%' },
      { emoji: '🪑', label: 'Chair', left: '28%', bottom: '42%' },
      { emoji: '🐱', label: 'Cat', left: '38%', bottom: '40%' },
    ],
  },
  2: {
    name: '2nd Floor',
    rooms: ['🎮 Game Room', '📚 Study'],
    bg: 'linear-gradient(180deg, #1A237E 0%, #283593 100%)',
    wallColor: '#3949AB',
    floorColor: 'linear-gradient(180deg, #5C6BC0 0%, #3949AB 100%)',
    accent: '#C5CAE9',
    description: 'Fun & chill floor',
    furniture: [
      { emoji: '🎮', label: 'Console', left: '18%', bottom: '44%' },
      { emoji: '🖥️', label: 'PC', left: '55%', bottom: '44%' },
      { emoji: '📚', label: 'Bookshelf', left: '78%', bottom: '44%' },
      { emoji: '🛋️', label: 'Bean Bag', left: '35%', bottom: '42%' },
      { emoji: '🏆', label: 'Trophy', left: '70%', bottom: '55%' },
      { emoji: '⭐', label: 'Star', left: '25%', bottom: '55%' },
    ],
  },
  3: {
    name: 'Rooftop',
    rooms: ['🌟 Rooftop Terrace'],
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    wallColor: '#0F3460',
    floorColor: 'linear-gradient(180deg, #2a2a4a 0%, #1a1a30 100%)',
    accent: '#E0E0FF',
    description: 'Under the stars',
    furniture: [
      { emoji: '🌙', label: 'Moon', left: '75%', bottom: '65%' },
      { emoji: '⭐', label: 'Star', left: '20%', bottom: '70%' },
      { emoji: '🌟', label: 'Star', left: '55%', bottom: '75%' },
      { emoji: '🔭', label: 'Telescope', left: '65%', bottom: '44%' },
      { emoji: '☕', label: 'Coffee', left: '30%', bottom: '44%' },
      { emoji: '🪑', label: 'Deck chair', left: '42%', bottom: '42%' },
    ],
  },
}

export function MyHouseScreen() {
  const { setPhase, coins } = useGameStore()
  const [floor, setFloor] = useState<HouseFloor>(1)
  const theme = FLOOR_DATA[floor]

  // Player movement
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 78 })
  const [facingLeft, setFacingLeft] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const isRunningRef = useRef(false)
  const posRef = useRef({ x: 50, y: 78 })
  const keysRef = useRef<Set<string>>(new Set())
  const frameRef = useRef<number>(0)

  // Reset player to center when switching floors
  useEffect(() => {
    posRef.current = { x: 50, y: 78 }
    setPlayerPos({ x: 50, y: 78 })
  }, [floor])

  const tick = useCallback(() => {
    const keys = keysRef.current
    let { x, y } = posRef.current
    const speed = isRunningRef.current ? 0.6 : 0.3
    let moved = false
    let newFacing: boolean | null = null
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) { x = Math.max(4, x - speed); moved = true; newFacing = true }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x = Math.min(96, x + speed); moved = true; newFacing = false }
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) { y = Math.max(63, y - speed); moved = true }
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) { y = Math.min(90, y + speed); moved = true }
    if (moved) {
      posRef.current = { x, y }
      setPlayerPos({ x, y })
      if (newFacing !== null) setFacingLeft(newFacing)
      setIsMoving(true)
    } else {
      setIsMoving(false)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick])

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key)
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: theme.bg }}>

      {/* Back wall */}
      <div className="absolute top-0 left-0 right-0" style={{ height: '60%', background: theme.wallColor }} />

      {/* Wallpaper pattern */}
      <div className="absolute top-0 left-0 right-0 opacity-10"
        style={{ height: '60%', backgroundImage: `repeating-linear-gradient(90deg, ${theme.accent} 0px, ${theme.accent} 1px, transparent 1px, transparent 35px)` }} />

      {/* Window (left) */}
      <div className="absolute rounded-t-xl overflow-hidden"
        style={{ left: '6%', top: '8%', width: '14%', height: '32%', background: floor === 3 ? 'linear-gradient(180deg,#0d0d2e,#1a1a4e)' : 'linear-gradient(180deg,#87CEEB,#B8E4F8)', border: '6px solid #5a3e2b' }}>
        {/* Window cross */}
        <div className="absolute inset-0">
          <div className="absolute top-0 bottom-0" style={{ left: '50%', width: '5px', background: '#5a3e2b', transform: 'translateX(-50%)' }} />
          <div className="absolute left-0 right-0" style={{ top: '48%', height: '5px', background: '#5a3e2b' }} />
        </div>
        {/* Stars in rooftop window */}
        {floor === 3 && ['⭐', '🌟', '✨'].map((s, i) => (
          <motion.div key={i} className="absolute text-sm"
            style={{ left: `${[15, 55, 35][i]}%`, top: `${[20, 50, 70][i]}%` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, delay: i * 0.7, repeat: Infinity }}>
            {s}
          </motion.div>
        ))}
      </div>

      {/* Window (right) — only on floors 1 & 2 */}
      {floor !== 3 && (
        <div className="absolute rounded-t-xl overflow-hidden"
          style={{ right: '6%', top: '8%', width: '14%', height: '32%', background: 'linear-gradient(180deg,#87CEEB,#B8E4F8)', border: '6px solid #5a3e2b' }}>
          <div className="absolute inset-0">
            <div className="absolute top-0 bottom-0" style={{ left: '50%', width: '5px', background: '#5a3e2b', transform: 'translateX(-50%)' }} />
            <div className="absolute left-0 right-0" style={{ top: '48%', height: '5px', background: '#5a3e2b' }} />
          </div>
        </div>
      )}

      {/* Floor 1 only: door */}
      {floor === 1 && (
        <div className="absolute rounded-t-xl"
          style={{ right: '8%', top: '20%', width: '9%', height: '38%', background: 'linear-gradient(180deg,#6B3A2A,#4a2010)', border: '5px solid #3a2010', borderBottom: 'none', boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.4)' }}>
          <div className="absolute w-3 h-3 rounded-full" style={{ left: '15%', top: '55%', background: '#F5C842' }} />
        </div>
      )}

      {/* Rooftop: moon + stars */}
      {floor === 3 && (
        <>
          <motion.div className="absolute text-5xl pointer-events-none" style={{ right: '10%', top: '5%', zIndex: 1 }}
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>🌕</motion.div>
          {['✨', '⭐', '🌟', '💫', '✨'].map((s, i) => (
            <motion.div key={i} className="absolute pointer-events-none"
              style={{ left: `${[10, 30, 55, 70, 85][i]}%`, top: `${[8, 4, 10, 6, 12][i]}%`, fontSize: `${[18, 24, 20, 16, 22][i]}px`, zIndex: 1 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.5, delay: i * 0.5, repeat: Infinity }}>
              {s}
            </motion.div>
          ))}
        </>
      )}

      {/* Furniture */}
      {theme.furniture.map(f => (
        <motion.div key={f.label} className="absolute pointer-events-none"
          style={{ left: f.left, bottom: f.bottom, fontSize: '2.2rem', zIndex: 4 }}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' }}>
          {f.emoji}
        </motion.div>
      ))}

      {/* Hanging lamp */}
      <motion.div className="absolute text-4xl pointer-events-none"
        style={{ top: '2%', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        {floor === 3 ? '🏮' : floor === 2 ? '💡' : '🪔'}
      </motion.div>

      {/* Floor */}
      <div className="absolute bottom-0 left-0 right-0" style={{ top: '60%', background: theme.floorColor, zIndex: 2 }}>
        {[0, 14, 28, 42, 56, 70, 84].map(p => (
          <div key={p} className="absolute left-0 right-0" style={{ top: `${p}%`, height: '2px', background: 'rgba(0,0,0,0.2)' }} />
        ))}
      </div>

      {/* Room labels */}
      <div className="absolute flex gap-3 pointer-events-none" style={{ top: '62%', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
        {theme.rooms.map(room => (
          <div key={room} className="font-storybook text-xs px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.4)', color: theme.accent, border: `1px solid ${theme.accent}40` }}>
            {room}
          </div>
        ))}
      </div>

      {/* Floor label top center */}
      <div className="absolute font-storybook text-sm pointer-events-none"
        style={{ top: '10px', left: '50%', transform: 'translateX(-50%)', color: theme.accent, textShadow: '0 1px 4px rgba(0,0,0,0.5)', zIndex: 10 }}>
        {theme.name} — {theme.description}
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
        <span className="text-xl font-storybook" style={{ color: theme.accent }}>🏠 My House</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black bg-opacity-40 rounded-full px-3 py-1">
            <span>🪙</span><span className="font-storybook text-coin">{coins}</span>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPhase('world-map')}
            className="px-4 py-1 rounded-full font-storybook text-sm border"
            style={{ borderColor: '#00B894', color: '#00B894', background: 'rgba(0,0,0,0.3)' }}>
            🚪 Go Outside
          </motion.button>
        </div>
      </div>

      {/* Player character */}
      <PlayerCharacter
        x={playerPos.x}
        y={playerPos.y}
        facingLeft={facingLeft}
        isMoving={isMoving}
        isRunning={isRunning}
        zIndex={10}
      />

      {/* Controls hint */}
      <div className="absolute pointer-events-none font-storybook text-xs"
        style={{ bottom: '14%', left: '50%', transform: 'translateX(-50%)', color: theme.accent, opacity: 0.5, whiteSpace: 'nowrap', zIndex: 5 }}>
        WASD / Arrow keys to walk
      </div>

      {/* Walk / Run toggle */}
      <div className="absolute flex items-center gap-2 z-20" style={{ bottom: '16px', right: '20px' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setIsRunning(false); isRunningRef.current = false }}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: !isRunning ? theme.accent : '#333', color: !isRunning ? theme.accent : '#777', background: !isRunning ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)' }}>
          🚶 Walk
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setIsRunning(true); isRunningRef.current = true }}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: isRunning ? '#FF4757' : '#333', color: isRunning ? '#FF4757' : '#777', background: isRunning ? 'rgba(255,71,87,0.15)' : 'rgba(0,0,0,0.4)' }}>
          🏃 Run
        </motion.button>
      </div>

      {/* Floor navigation buttons */}
      <div className="absolute flex items-center gap-3 z-20" style={{ bottom: '16px', left: '50%', transform: 'translateX(-50%)' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          disabled={floor === 1}
          onClick={() => setFloor(f => Math.max(1, f - 1) as HouseFloor)}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: floor === 1 ? '#333' : theme.accent, color: floor === 1 ? '#555' : theme.accent, background: 'rgba(0,0,0,0.4)', opacity: floor === 1 ? 0.4 : 1 }}>
          ⬇️ {floor - 1}F
        </motion.button>

        <span className="font-storybook text-sm" style={{ color: theme.accent, opacity: 0.7 }}>{floor}F</span>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          disabled={floor === 3}
          onClick={() => setFloor(f => Math.min(3, f + 1) as HouseFloor)}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: floor === 3 ? '#333' : theme.accent, color: floor === 3 ? '#555' : theme.accent, background: 'rgba(0,0,0,0.4)', opacity: floor === 3 ? 0.4 : 1 }}>
          ⬆️ {floor + 1}F
        </motion.button>
      </div>
    </div>
  )
}
