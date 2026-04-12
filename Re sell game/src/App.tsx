// src/App.tsx
import { ShopPhase } from './phases/ShopPhase/ShopPhase'
import { SessionEnd } from './phases/SessionEnd/SessionEnd'
import { TownScreen } from './phases/Town/TownScreen'
import { VillageScreen } from './phases/Village/VillageScreen'
import { MyHouseScreen } from './phases/MyHouse/MyHouseScreen'
import { MysticShopScreen } from './phases/MysticShop/MysticShopScreen'
import { useGameStore } from './store/gameStore'
import { AnimatePresence, motion } from 'framer-motion'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="w-screen h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
          {phase === 'shop' && <ShopPhase />}
          {phase === 'session-end' && <SessionEnd />}
          {phase === 'world-map' && <TownScreen />}
          {phase === 'village' && <VillageScreen />}
          {phase === 'my-house' && <MyHouseScreen />}
          {phase === 'mystic-shop' && <MysticShopScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
