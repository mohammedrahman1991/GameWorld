// src/phases/Village/VillageScreen.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { PlayerCharacter } from '../../components/PlayerCharacter'

// A villager NPC walking around
function Villager({ delay, fromLeft, bottom }: { delay: number; fromLeft: boolean; bottom: string }) {
  const emoji = useMemo(() => ['👩‍🌾', '👨‍🌾', '🧑‍🤝‍🧑', '👴', '👵', '🧑'][Math.floor(Math.random() * 6)], [])
  return (
    <motion.div className="absolute text-3xl pointer-events-none" style={{ bottom, zIndex: 4 }}
      initial={{ x: fromLeft ? -80 : '110vw' }}
      animate={{ x: fromLeft ? '110vw' : -80 }}
      transition={{ duration: fromLeft ? 16 : 13, delay, repeat: Infinity, ease: 'linear' }}>
      {emoji}
    </motion.div>
  )
}

// A village market stall NPC that stands still and sells
interface VillageStall {
  id: string
  name: string
  emoji: string
  ownerEmoji: string
  color: string
  left: string
  bottom: string
  description: string
  items: { name: string; emoji: string; price: number }[]
}

const VILLAGE_STALLS: VillageStall[] = [
  {
    id: 'farmer', name: "Farmer Joe's", emoji: '🌽', ownerEmoji: '👨‍🌾', color: '#00B894',
    left: '12%', bottom: '34%', description: 'Fresh produce & herbs',
    items: [
      { name: 'Magic Herb', emoji: '🌿', price: 12 },
      { name: 'Golden Corn', emoji: '🌽', price: 8 },
      { name: 'Mystery Mushroom', emoji: '🍄', price: 20 },
    ],
  },
  {
    id: 'blacksmith', name: "Meg's Forge", emoji: '⚒️', ownerEmoji: '👩‍🔧', color: '#E17055',
    left: '35%', bottom: '34%', description: 'Crafted goods & tools',
    items: [
      { name: 'Iron Key', emoji: '🗝️', price: 35 },
      { name: 'Lucky Horseshoe', emoji: '🧲', price: 22 },
      { name: 'Copper Bell', emoji: '🔔', price: 18 },
    ],
  },
  {
    id: 'wizard', name: "Zara's Magic", emoji: '🔮', ownerEmoji: '🧙‍♀️', color: '#6C5CE7',
    left: '58%', bottom: '34%', description: 'Potions & enchanted items',
    items: [
      { name: 'Luck Potion', emoji: '🧪', price: 50 },
      { name: 'Star Dust', emoji: '✨', price: 40 },
      { name: 'Dragon Egg', emoji: '🥚', price: 90 },
    ],
  },
  {
    id: 'baker', name: "Tom's Bakery", emoji: '🍞', ownerEmoji: '👨‍🍳', color: '#FDCB6E',
    left: '78%', bottom: '34%', description: 'Baked goods & sweets',
    items: [
      { name: 'Magic Bread', emoji: '🍞', price: 10 },
      { name: 'Golden Cake', emoji: '🎂', price: 25 },
      { name: 'Star Cookie', emoji: '🍪', price: 15 },
    ],
  },
]

// House on the village backdrop
function VillageHouse({ left, color, emoji }: { left: string; color: string; emoji: string }) {
  return (
    <div className="absolute pointer-events-none" style={{ left, bottom: '34%', zIndex: 2 }}>
      {/* Roof */}
      <div style={{ width: 0, height: 0, borderLeft: '32px solid transparent', borderRight: '32px solid transparent', borderBottom: `28px solid ${color}`, marginBottom: '-2px' }} />
      {/* Walls */}
      <div style={{ width: '64px', height: '44px', background: '#D4C5A9', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
        {emoji}
      </div>
    </div>
  )
}

function Cloud({ top, delay, size }: { top: string; delay: number; size: number }) {
  return (
    <motion.div className="absolute pointer-events-none opacity-70" style={{ top, fontSize: size, zIndex: 1 }}
      initial={{ x: '-15vw' }} animate={{ x: '115vw' }}
      transition={{ duration: 45 + delay * 4, delay, repeat: Infinity, ease: 'linear' }}>☁️</motion.div>
  )
}

export function VillageScreen() {
  const { coins, spendCoins, setPhase, inventory, setInventory } = useGameStore()
  const [selectedStall, setSelectedStall] = useState<VillageStall | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 78 })
  const [facingLeft, setFacingLeft] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const isRunningRef = useRef(false)
  const posRef = useRef({ x: 50, y: 78 })
  const keysRef = useRef<Set<string>>(new Set())
  const frameRef = useRef<number>(0)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  function buyVillageItem(item: { name: string; emoji: string; price: number }) {
    if (coins < item.price) { showToast(`Need 🪙 ${item.price}!`); return }
    spendCoins(item.price)
    setInventory([...inventory, {
      id: `${item.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: item.name,
      category: 'resources' as const,
      baseValue: Math.round(item.price * 1.6),
      restockCost: item.price,
      currentValue: Math.round(item.price * 1.6),
      emoji: item.emoji,
      rarity: item.price >= 50 ? 'rare' as const : 'common' as const,
    }])
    showToast(`Got ${item.emoji} ${item.name} for 🪙 ${item.price}!`)
  }

  const tick = useCallback(() => {
    const keys = keysRef.current
    let { x, y } = posRef.current
    const speed = isRunningRef.current ? 0.6 : 0.3
    let moved = false
    let newFacing: boolean | null = null
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) { x = Math.max(2, x - speed); moved = true; newFacing = true }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x = Math.min(98, x + speed); moved = true; newFacing = false }
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) { y = Math.max(63, y - speed); moved = true }
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) { y = Math.min(90, y + speed); moved = true }
    if (moved) { posRef.current = { x, y }; setPlayerPos({ x, y }); if (newFacing !== null) setFacingLeft(newFacing); setIsMoving(true) }
    else setIsMoving(false)
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (!selectedStall) keysRef.current.add(e.key) }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selectedStall])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Sky — warm village sky */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #FFF3CD 0%, #FFE082 25%, #FFCC02 35%, #C8B89A 65%, #A8926A 100%)' }} />

      {/* Sun */}
      <motion.div className="absolute text-5xl pointer-events-none" style={{ top: '5%', left: '10%', zIndex: 1 }}
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 5, repeat: Infinity }}>☀️</motion.div>

      <Cloud top="6%" delay={0} size={38} />
      <Cloud top="12%" delay={8} size={26} />
      <Cloud top="4%" delay={18} size={48} />

      {/* Green hills background */}
      <div className="absolute pointer-events-none" style={{ bottom: '32%', left: '-5%', right: '-5%', height: '20%', background: '#5D8A3C', borderRadius: '60% 60% 0 0', zIndex: 1 }} />
      <div className="absolute pointer-events-none" style={{ bottom: '30%', left: '40%', right: '-10%', height: '18%', background: '#4A7A2C', borderRadius: '60% 60% 0 0', zIndex: 1 }} />

      {/* Background village houses */}
      <VillageHouse left="5%" color="#E17055" emoji="🏠" />
      <VillageHouse left="22%" color="#6C5CE7" emoji="🏡" />
      <VillageHouse left="70%" color="#00B894" emoji="🏠" />
      <VillageHouse left="86%" color="#FDCB6E" emoji="🏡" />

      {/* Trees */}
      <div className="absolute text-6xl pointer-events-none" style={{ left: '2%', bottom: '33%', zIndex: 3 }}>🌳</div>
      <div className="absolute text-5xl pointer-events-none" style={{ left: '30%', bottom: '32%', zIndex: 3 }}>🌲</div>
      <div className="absolute text-6xl pointer-events-none" style={{ right: '3%', bottom: '34%', zIndex: 3 }}>🌳</div>
      <div className="absolute text-4xl pointer-events-none" style={{ right: '28%', bottom: '33%', zIndex: 3 }}>🌿</div>

      {/* Village stalls */}
      {VILLAGE_STALLS.map(stall => (
        <motion.button key={stall.id}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setSelectedStall(stall)}
          className="absolute flex flex-col items-center"
          style={{ left: stall.left, bottom: stall.bottom, zIndex: 5 }}
        >
          {/* Stall awning */}
          <div className="font-storybook text-xs px-2 py-0.5 rounded-t-lg text-white" style={{ background: stall.color }}>
            {stall.emoji} {stall.name}
          </div>
          <div className="flex items-end gap-2 px-3 pt-1 pb-2 rounded-b-lg border-2" style={{ background: '#FFF8E7', borderColor: stall.color }}>
            <span className="text-2xl">{stall.ownerEmoji}</span>
            <div className="flex flex-col gap-0.5">
              {stall.items.slice(0, 2).map(i => (
                <span key={i.name} className="text-xs font-storybook text-gray-700">{i.emoji} 🪙{i.price}</span>
              ))}
            </div>
          </div>
        </motion.button>
      ))}

      {/* Dirt path */}
      <div className="absolute left-0 right-0" style={{ bottom: 0, height: '35%', background: 'linear-gradient(180deg, #C4A265 0%, #A8885A 100%)', zIndex: 2 }}>
        {/* Path texture */}
        <div className="absolute left-0 right-0 h-1 opacity-20" style={{ top: 0, background: '#8B6914' }} />
        {[15, 35, 55, 75].map(p => (
          <div key={p} className="absolute top-4 w-8 h-2 rounded-full opacity-30" style={{ left: `${p}%`, background: '#8B6914' }} />
        ))}
      </div>

      {/* Villagers walking */}
      <Villager delay={0} fromLeft={true} bottom="36%" />
      <Villager delay={5} fromLeft={false} bottom="37%" />
      <Villager delay={10} fromLeft={true} bottom="35%" />

      {/* Player character */}
      <PlayerCharacter
        x={playerPos.x}
        y={playerPos.y}
        facingLeft={facingLeft}
        isMoving={isMoving}
        isRunning={isRunning}
        zIndex={10}
      />

      {/* Walk / Run toggle */}
      <div className="absolute flex items-center gap-2 z-20" style={{ bottom: '16px', right: '20px' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setIsRunning(false); isRunningRef.current = false }}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: !isRunning ? '#5D4037' : '#bbb', color: !isRunning ? '#5D4037' : '#999', background: !isRunning ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.15)' }}>
          🚶 Walk
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setIsRunning(true); isRunningRef.current = true }}
          className="px-4 py-2 rounded-full font-storybook text-sm border transition-all"
          style={{ borderColor: isRunning ? '#FF4757' : '#bbb', color: isRunning ? '#FF4757' : '#999', background: isRunning ? 'rgba(255,71,87,0.15)' : 'rgba(0,0,0,0.15)' }}>
          🏃 Run
        </motion.button>
      </div>

      {/* Controls hint */}
      <div className="absolute pointer-events-none font-storybook text-xs text-gray-600"
        style={{ bottom: '22%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 5 }}>
        WASD / Arrow keys · Click a stall to buy
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20"
        style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}>
        <span className="text-xl font-storybook" style={{ color: '#5D4037' }}>🏘️ The Village</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black bg-opacity-30 rounded-full px-3 py-1">
            <span>🪙</span><span className="font-storybook text-coin">{coins}</span>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPhase('world-map')}
            className="px-4 py-1 rounded-full font-storybook text-sm border"
            style={{ borderColor: '#00B894', color: '#00B894', background: 'rgba(0,0,0,0.2)' }}>
            ← Back to Town
          </motion.button>
        </div>
      </div>

      {/* Stall modal */}
      <AnimatePresence>
        {selectedStall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-40 p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelectedStall(null)}>
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border-4 p-6 flex flex-col gap-4"
              style={{ background: '#FFF8E7', borderColor: selectedStall.color }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedStall.ownerEmoji}</span>
                  <div>
                    <div className="font-storybook text-xl" style={{ color: selectedStall.color }}>{selectedStall.name}</div>
                    <div className="text-gray-500 text-xs">{selectedStall.description}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedStall(null)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
              </div>
              <div className="text-right font-storybook text-sm text-gray-600">🪙 {coins} available</div>
              <div className="flex flex-col gap-3">
                {selectedStall.items.map(item => {
                  const canAfford = coins >= item.price
                  return (
                    <motion.button key={item.name}
                      whileHover={canAfford ? { scale: 1.03 } : {}}
                      whileTap={canAfford ? { scale: 0.97 } : {}}
                      onClick={() => canAfford && buyVillageItem(item)}
                      className="flex items-center justify-between p-3 rounded-2xl border-2 transition-all"
                      style={{ borderColor: canAfford ? selectedStall.color : '#ddd', background: canAfford ? 'white' : '#f5f5f5', opacity: canAfford ? 1 : 0.5, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="font-storybook text-gray-800">{item.name}</span>
                      </div>
                      <span className="font-storybook text-sm px-3 py-1 rounded-full text-white" style={{ background: selectedStall.color }}>🪙 {item.price}</span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 text-white font-storybook px-6 py-3 rounded-full text-sm z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
