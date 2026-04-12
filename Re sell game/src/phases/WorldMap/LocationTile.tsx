// src/phases/WorldMap/LocationTile.tsx
import { motion } from 'framer-motion'
import type { MapLocation } from '../../data/locations'

interface LocationTileProps {
  location: MapLocation
  isUnlocked: boolean
  coins: number
  highlighted?: boolean
  onClick: (e: React.MouseEvent) => void
}

export function LocationTile({ location, isUnlocked, highlighted, onClick }: LocationTileProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all"
      style={{
        position: 'absolute',
        left: `${location.position.x}%`,
        top: `${location.position.y}%`,
        transform: 'translate(-50%, -50%)',
        borderColor: highlighted ? '#00B894' : isUnlocked ? '#F5C842' : '#555',
        background: highlighted ? 'rgba(0,184,148,0.2)' : isUnlocked ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
        filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.5)',
        cursor: 'pointer',
        minWidth: '80px',
        boxShadow: highlighted ? '0 0 16px #00B894' : 'none',
      }}
      title={isUnlocked ? location.description : `Unlock at 🪙 ${location.unlockCoins} coins`}
    >
      <span className="text-3xl">{isUnlocked ? location.emoji : '🔒'}</span>
      <span className="text-white text-xs font-storybook text-center leading-tight">{location.name}</span>
      {!isUnlocked && (
        <span className="text-coin text-xs">🪙 {location.unlockCoins}</span>
      )}
    </motion.button>
  )
}
