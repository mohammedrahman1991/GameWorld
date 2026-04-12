// src/phases/WorldMap/WorldMap.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LocationTile } from './LocationTile'
import { MerchantWalker } from './MerchantWalker'
import { MarketModal } from './MarketModal'
import { VaultModal } from './VaultModal'
import { useGameStore } from '../../store/gameStore'
import { MAP_LOCATIONS } from '../../data/locations'

const SPEED = 0.4 // % of screen per frame

export function WorldMap() {
  const { coins, unlockedCategories, setPhase } = useGameStore()
  const [merchantPos, setMerchantPos] = useState({ x: 50, y: 60 })
  const [openModal, setOpenModal] = useState<string | null>(null)
  const posRef = useRef({ x: 50, y: 60 })
  const keysRef = useRef<Set<string>>(new Set())
  const frameRef = useRef<number>(0)

  // Keyboard movement loop
  const tick = useCallback(() => {
    const keys = keysRef.current
    let { x, y } = posRef.current
    let moved = false

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) { x = Math.max(3, x - SPEED); moved = true }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) { x = Math.min(97, x + SPEED); moved = true }
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) { y = Math.max(10, y - SPEED); moved = true }
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) { y = Math.min(92, y + SPEED); moved = true }

    if (moved) {
      posRef.current = { x, y }
      setMerchantPos({ x, y })
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key) }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Click-to-walk: click anywhere on the map to walk there
  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    posRef.current = { x, y }
    setMerchantPos({ x, y })
  }

  function isUnlocked(locationId: string): boolean {
    const loc = MAP_LOCATIONS.find((l) => l.id === locationId)
    if (!loc) return false
    if (coins < loc.unlockCoins) return false
    if (loc.unlockCategory && !unlockedCategories.includes(loc.unlockCategory)) return false
    return true
  }

  // Check if merchant is near a location (within 8% distance)
  function nearLocation(locationId: string): boolean {
    const loc = MAP_LOCATIONS.find((l) => l.id === locationId)
    if (!loc) return false
    const dx = merchantPos.x - loc.position.x
    const dy = merchantPos.y - loc.position.y
    return Math.sqrt(dx * dx + dy * dy) < 8
  }

  function handleEnter(locationId: string) {
    if (!isUnlocked(locationId) || !nearLocation(locationId)) return
    if (locationId === 'your-stall') setPhase('shop')
    else if (locationId === 'the-market') setOpenModal('market')
    else if (locationId === 'the-vault') setOpenModal('vault')
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0d1f0d 50%, #060d06 100%)' }}
      onClick={handleMapClick}
    >
      {/* Map background texture */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle, #2d5a2d 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Street paths */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50" y1="10" x2="50" y2="90" stroke="#8B7355" strokeWidth="2" strokeDasharray="3,3" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="#8B7355" strokeWidth="2" strokeDasharray="3,3" />
      </svg>

      {/* Map label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-storybook text-coin opacity-80 pointer-events-none">
        🗺️ Merchant Town
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm font-storybook pointer-events-none">
        WASD / Arrow keys to walk · Click to move · Walk up to a location to enter
      </div>

      {/* Coin counter */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-50 rounded-full px-4 py-2 pointer-events-none">
        <span className="text-xl">🪙</span>
        <span className="text-xl font-storybook text-coin">{coins}</span>
      </div>

      {/* Location tiles — clicking them walks merchant there then enters */}
      {MAP_LOCATIONS.map((loc) => {
        const unlocked = isUnlocked(loc.id)
        const near = nearLocation(loc.id)
        return (
          <LocationTile
            key={loc.id}
            location={loc}
            isUnlocked={unlocked}
            coins={coins}
            onClick={(e) => {
              e.stopPropagation()
              // Walk to the location first
              posRef.current = loc.position
              setMerchantPos(loc.position)
              if (unlocked) setTimeout(() => handleEnter(loc.id), 600)
            }}
            highlighted={near && unlocked}
          />
        )
      })}

      {/* Merchant walker */}
      <MerchantWalker x={merchantPos.x} y={merchantPos.y} />

      {/* Modals */}
      <AnimatePresence>
        {openModal === 'market' && <MarketModal onClose={() => setOpenModal(null)} />}
        {openModal === 'vault' && <VaultModal onClose={() => setOpenModal(null)} />}
      </AnimatePresence>
    </div>
  )
}
