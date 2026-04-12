import { Suspense } from 'react'
import useGameStore from './store/useGameStore'
import HouseSelect from './screens/HouseSelect'
import GameScreen from './screens/GameScreen'

export default function App() {
  const selectedHouse = useGameStore((s) => s.selectedHouse)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {selectedHouse === null ? (
        <Suspense fallback={<div style={{ color: '#fff', padding: 20 }}>Loading...</div>}>
          <HouseSelect />
        </Suspense>
      ) : (
        <Suspense fallback={<div style={{ color: '#fff', padding: 20 }}>Loading...</div>}>
          <GameScreen />
        </Suspense>
      )}
    </div>
  )
}
