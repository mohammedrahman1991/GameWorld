// src/phases/Town/TownScreen.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { BUY_SHOPS } from '../../data/shops'
import type { BuyShop, ShopItem } from '../../data/shops'
import { PlayerCharacter } from '../../components/PlayerCharacter'

// Walking pedestrian on the street
function Pedestrian({ delay, fromLeft, bottom }: { delay: number; fromLeft: boolean; bottom: string }) {
  const emoji = useMemo(
    () => ['🚶', '🚶‍♀️', '👴', '👩', '🧑', '🏃', '👧', '👦'][Math.floor(Math.random() * 8)],
    []
  )
  return (
    <motion.div
      className="absolute text-3xl pointer-events-none"
      style={{ bottom, zIndex: 3 }}
      initial={{ x: fromLeft ? -80 : '110vw' }}
      animate={{ x: fromLeft ? '110vw' : -80 }}
      transition={{ duration: fromLeft ? 14 : 11, delay, repeat: Infinity, ease: 'linear' }}
    >
      {emoji}
    </motion.div>
  )
}

// A cloud drifting across the sky
function Cloud({ top, delay, size }: { top: string; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none opacity-80 text-white font-bold"
      style={{ top, fontSize: size, zIndex: 1 }}
      initial={{ x: '-15vw' }}
      animate={{ x: '115vw' }}
      transition={{ duration: 40 + delay * 5, delay, repeat: Infinity, ease: 'linear' }}
    >
      ☁️
    </motion.div>
  )
}

const rarityColor = { common: '#B2BEC3', rare: '#74B9FF', legendary: '#FDCB6E' }

export function TownScreen() {
  const { coins, starShards, spendCoins, setPhase, inventory, setInventory } = useGameStore()
  const [showMarket, setShowMarket] = useState(false)
  function openMarket() { keysRef.current.clear(); setShowMarket(true) }
  function openStall(shop: BuyShop) { keysRef.current.clear(); setSelectedShop(shop) }
  const [selectedShop, setSelectedShop] = useState<BuyShop | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // Player character movement
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 78 })
  const [facingLeft, setFacingLeft] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const posRef = useRef({ x: 50, y: 78 })
  const keysRef = useRef<Set<string>>(new Set())
  const frameRef = useRef<number>(0)
  const isRunningRef = useRef(false)
  isRunningRef.current = isRunning
  const modalOpenRef = useRef(false)
  modalOpenRef.current = showMarket || selectedShop !== null

  const tick = useCallback(() => {
    const keys = keysRef.current
    let { x, y } = posRef.current
    const speed = isRunningRef.current ? 0.55 : 0.28
    let moved = false
    let newFacing = null as boolean | null

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) { x = Math.max(2, x - speed); moved = true; newFacing = true }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x = Math.min(98, x + speed); moved = true; newFacing = false }
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
    const down = (e: KeyboardEvent) => {
      if (modalOpenRef.current) return
      keysRef.current.add(e.key)
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function buyItem(item: ShopItem) {
    if (coins < item.buyPrice) {
      showToast(`Need 🪙 ${item.buyPrice} — only have 🪙 ${coins}`)
      return
    }
    spendCoins(item.buyPrice)
    setInventory([...inventory, {
      id: `${item.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: item.name,
      category: item.category,
      baseValue: item.baseValue,
      restockCost: item.buyPrice,
      currentValue: item.baseValue,
      emoji: item.emoji,
      rarity: item.rarity,
    }])
    showToast(`Bought ${item.emoji} ${item.name} for 🪙 ${item.buyPrice}!`)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">

      {/* ── SKY ── */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #B8D9F0 55%, #C8B89A 70%, #A0826D 100%)' }} />

      {/* Sun */}
      <motion.div
        className="absolute text-5xl pointer-events-none"
        style={{ top: '6%', right: '12%', zIndex: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☀️
      </motion.div>

      {/* Clouds */}
      <Cloud top="8%" delay={0} size={40} />
      <Cloud top="14%" delay={6} size={28} />
      <Cloud top="5%" delay={14} size={50} />

      {/* ── BACKGROUND BUILDINGS (city skyline) ── */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Far left building */}
        <div className="absolute" style={{ left: '2%', bottom: '35%', width: '10%', height: '28%', background: '#8B9BAE', borderRadius: '4px 4px 0 0', opacity: 0.6 }}>
          {[20, 50, 80].map(p => (
            <div key={p} className="absolute w-4 h-5 rounded-sm" style={{ left: `${p}%`, top: '20%', transform: 'translateX(-50%)', background: '#6B8BA4', opacity: 0.7 }} />
          ))}
        </div>
        {/* Right background buildings */}
        <div className="absolute" style={{ right: '3%', bottom: '35%', width: '8%', height: '22%', background: '#9BAAB8', borderRadius: '4px 4px 0 0', opacity: 0.5 }} />
        <div className="absolute" style={{ right: '12%', bottom: '35%', width: '6%', height: '18%', background: '#B0BEC5', borderRadius: '4px 4px 0 0', opacity: 0.5 }} />
      </div>

      {/* ── PLAYER'S 3-FLOOR BUILDING (center) ── */}
      <div className="absolute pointer-events-none" style={{ left: '28%', right: '28%', bottom: '35%', zIndex: 2 }}>
        {/* Floor 3 */}
        <div className="w-full" style={{ height: '80px', background: 'linear-gradient(180deg, #F0DEC0 0%, #E0C8A0 100%)', borderBottom: '4px solid #8B6914' }}>
          {[20, 50, 80].map(p => (
            <div key={p} className="absolute w-8 h-10 rounded-t-md" style={{ left: `${p}%`, top: '15%', transform: 'translateX(-50%)', background: '#87CEEB', border: '3px solid #8B6914' }} />
          ))}
        </div>
        {/* Floor 2 */}
        <div className="w-full" style={{ height: '80px', background: 'linear-gradient(180deg, #E8D5B7 0%, #D8C4A0 100%)', borderBottom: '4px solid #8B6914' }}>
          {[20, 50, 80].map(p => (
            <div key={p} className="absolute w-8 h-10 rounded-t-md" style={{ left: `${p}%`, top: '15%', transform: 'translateX(-50%)', background: '#87CEEB', border: '3px solid #8B6914' }} />
          ))}
        </div>
        {/* Floor 1 — with door and awning */}
        <div className="w-full relative" style={{ height: '80px', background: 'linear-gradient(180deg, #D4B896 0%, #C8A882 100%)', borderBottom: '4px solid #8B6914' }}>
          {/* Shop sign */}
          <div className="absolute font-storybook text-xs px-3 py-0.5 rounded" style={{ left: '50%', top: '8%', transform: 'translateX(-50%)', background: '#8B6914', color: '#F5C842', whiteSpace: 'nowrap' }}>
            🏪 My Shop
          </div>
          {/* Door */}
          <div className="absolute rounded-t-lg" style={{ left: '50%', bottom: 0, transform: 'translateX(-50%)', width: '22%', height: '70%', background: '#6B3A2A', border: '3px solid #3a2010' }}>
            <div className="absolute w-2 h-2 rounded-full" style={{ right: '20%', top: '55%', background: '#F5C842' }} />
          </div>
          {/* Awning */}
          <div className="absolute" style={{ left: '18%', right: '18%', bottom: 0, height: '22px', background: 'repeating-linear-gradient(90deg,#C0392B 0px,#C0392B 14px,#F5F5F5 14px,#F5F5F5 28px)', borderRadius: '4px 4px 0 0' }} />
        </div>
      </div>

      {/* ── TREES ── */}
      <div className="absolute text-7xl pointer-events-none" style={{ left: '5%', bottom: '34%', zIndex: 3 }}>🌳</div>
      <div className="absolute text-6xl pointer-events-none" style={{ left: '20%', bottom: '33%', zIndex: 3 }}>🌲</div>
      <div className="absolute text-7xl pointer-events-none" style={{ right: '6%', bottom: '35%', zIndex: 3 }}>🌳</div>
      <div className="absolute text-5xl pointer-events-none" style={{ right: '22%', bottom: '32%', zIndex: 3 }}>🌲</div>

      {/* ── SIDEWALK ── */}
      <div className="absolute left-0 right-0" style={{ bottom: 0, height: '35%', background: 'linear-gradient(180deg, #C8B89A 0%, #B0A080 100%)', zIndex: 2 }}>
        {/* Pavement lines */}
        {[10, 25, 40, 55, 70, 85].map(p => (
          <div key={p} className="absolute top-0 bottom-0 w-px opacity-20" style={{ left: `${p}%`, background: '#8B7355' }} />
        ))}
        <div className="absolute left-0 right-0 h-1 opacity-30" style={{ top: 0, background: '#8B7355' }} />
      </div>

      {/* Pedestrians */}
      <Pedestrian delay={0} fromLeft={true} bottom="36%" />
      <Pedestrian delay={4} fromLeft={false} bottom="37%" />
      <Pedestrian delay={8} fromLeft={true} bottom="35%" />
      <Pedestrian delay={12} fromLeft={false} bottom="38%" />

      {/* ── PLAYER CHARACTER ── */}
      <PlayerCharacter
        x={playerPos.x}
        y={playerPos.y}
        facingLeft={facingLeft}
        isMoving={isMoving}
        isRunning={isRunning}
        zIndex={10}
      />

      {/* Controls hint */}
      <div className="absolute pointer-events-none font-storybook text-xs text-gray-400"
        style={{ bottom: '22%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 5 }}>
        WASD / Arrow keys to move
      </div>

      {/* ── HUD (top bar) ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
        <span className="text-xl font-storybook text-coin">🏙️ Merchant Town</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black bg-opacity-40 rounded-full px-3 py-1">
            <span>🪙</span>
            <span className="font-storybook text-coin">{coins}</span>
          </div>
          {starShards > 0 && (
            <div className="flex items-center gap-1 rounded-full px-3 py-1" style={{ background: 'rgba(253,203,110,0.15)', border: '1px solid #FDCB6E88' }}>
              <span>⭐</span>
              <span className="font-storybook" style={{ color: '#FDCB6E' }}>{starShards}</span>
            </div>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsRunning(r => !r)}
            className="px-3 py-1 rounded-full border font-storybook text-sm"
            style={{ borderColor: isRunning ? '#FF7675' : '#00B894', color: isRunning ? '#FF7675' : '#00B894', background: 'rgba(0,0,0,0.3)' }}>
            {isRunning ? '🏃 Run' : '🚶 Walk'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="px-3 py-1 rounded-full border font-storybook text-sm"
            style={{ borderColor: saved ? '#00B894' : '#555', color: saved ? '#00B894' : '#aaa', background: 'rgba(0,0,0,0.3)' }}>
            {saved ? '✅ Saved!' : '💾 Save'}
          </motion.button>
        </div>
      </div>

      {/* ── ACTION BUTTONS (bottom) ── */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-wrap items-center justify-center gap-3 z-20 px-4">
        <motion.button
          whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPhase('shop')}
          className="px-6 py-3 rounded-2xl font-storybook text-white shadow-xl text-base"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #a855f7)', boxShadow: '0 4px 20px rgba(108,92,231,0.5)' }}>
          🏪 Go Inside My Shop
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPhase('my-house')}
          className="px-6 py-3 rounded-2xl font-storybook text-white shadow-xl text-base"
          style={{ background: 'linear-gradient(135deg, #E17055, #d63031)', boxShadow: '0 4px 20px rgba(225,112,85,0.5)' }}>
          🏠 Go to My House
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPhase('village')}
          className="px-6 py-3 rounded-2xl font-storybook text-white shadow-xl text-base"
          style={{ background: 'linear-gradient(135deg, #00B894, #00cec9)', boxShadow: '0 4px 20px rgba(0,184,148,0.5)' }}>
          🏘️ Visit Village
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.95 }}
          onClick={() => openMarket()}
          className="px-6 py-3 rounded-2xl font-storybook text-white shadow-xl text-base"
          style={{ background: 'linear-gradient(135deg, #FDCB6E, #e17055)', boxShadow: '0 4px 20px rgba(253,203,110,0.4)' }}>
          🛒 Browse Market
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.07, y: -2 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPhase('mystic-shop')}
          className="px-6 py-3 rounded-2xl font-storybook text-white shadow-xl text-base"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #2d0057)', boxShadow: '0 4px 20px rgba(108,92,231,0.5)' }}>
          🔮 Mystic Shop {starShards > 0 ? `· ⭐ ${starShards}` : ''}
        </motion.button>
      </div>

      {/* ── MARKET MODAL ── */}
      <AnimatePresence>
        {showMarket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col"
            style={{ background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0d1f0d 50%, #060d06 100%)' }}
          >
            {/* Market header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <span className="text-2xl font-storybook text-coin">🛒 Market</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-black bg-opacity-40 rounded-full px-3 py-1">
                  <span>🪙</span><span className="font-storybook text-coin">{coins}</span>
                </div>
                {inventory.length > 0 && (
                  <span className="text-xs font-storybook text-coin">{inventory.length} in bag</span>
                )}
                <button onClick={() => setShowMarket(false)}
                  className="text-gray-400 hover:text-white text-3xl leading-none font-storybook">×</button>
              </div>
            </div>
            {/* Shop grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {BUY_SHOPS.map((shop) => (
                  <motion.button key={shop.id}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openStall(shop)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2"
                    style={{ borderColor: shop.color, background: `${shop.color}18` }}>
                    <span className="text-4xl">{shop.emoji}</span>
                    <span className="text-white font-storybook text-sm text-center leading-tight">{shop.name}</span>
                    <div className="flex flex-col gap-1 w-full mt-1">
                      {shop.items.slice(0, 2).map(item => (
                        <div key={item.name} className="flex items-center justify-between w-full px-1">
                          <span className="text-xs text-gray-300">{item.emoji} {item.name}</span>
                          <span className="text-xs font-storybook text-coin">🪙{item.buyPrice}</span>
                        </div>
                      ))}
                    </div>
                    {shop.items.length > 2 && (
                      <span className="text-xs" style={{ color: shop.color }}>+{shop.items.length - 2} more</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHOP DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedShop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedShop(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border-2 p-6 flex flex-col gap-4"
              style={{ background: '#111', borderColor: selectedShop.color, maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedShop.emoji}</span>
                  <div>
                    <div className="text-white font-storybook text-xl">{selectedShop.name}</div>
                    <div className="text-gray-400 text-xs">{selectedShop.description}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedShop(null)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="text-right text-coin font-storybook text-sm">🪙 {coins} available</div>
              <div className="flex flex-col gap-3">
                {selectedShop.items.map((item) => {
                  const canAfford = coins >= item.buyPrice
                  return (
                    <motion.button key={item.name}
                      whileHover={canAfford ? { scale: 1.02 } : {}}
                      whileTap={canAfford ? { scale: 0.98 } : {}}
                      onClick={() => canAfford && buyItem(item)}
                      className="flex items-center justify-between p-3 rounded-xl border transition-all"
                      style={{
                        borderColor: canAfford ? rarityColor[item.rarity] : '#333',
                        background: canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                        opacity: canAfford ? 1 : 0.5,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="text-left">
                          <div className="text-white font-storybook text-sm">{item.name}</div>
                          <div className="text-xs" style={{ color: rarityColor[item.rarity] }}>
                            {item.rarity} · sells ~🪙 {item.baseValue}
                          </div>
                        </div>
                      </div>
                      <div className="font-storybook text-sm px-3 py-1 rounded-full"
                        style={{ background: canAfford ? selectedShop.color + '33' : '#222', color: canAfford ? selectedShop.color : '#555' }}>
                        🪙 {item.buyPrice}
                      </div>
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
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black bg-opacity-90 text-white font-storybook px-6 py-3 rounded-full border border-gray-700 text-sm z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
