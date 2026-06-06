// src/phases/SessionEnd/SessionEnd.tsx
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { generateSessionInventory } from '../../data/items'
import { UNLOCK_MILESTONES } from '../../data/items'

export function SessionEnd() {
  const { sessionSales, coins, lifetimeCoins, totalSalesCount, setPhase, clearSessionSales, setInventory, spendCoins, unlockedCategories, unlockCategory, addStarShards } = useGameStore()

  const totalProfit = sessionSales.reduce((sum, s) => sum + s.profit, 0)
  const totalRevenue = sessionSales.reduce((sum, s) => sum + s.soldFor, 0)
  const nextInventory = generateSessionInventory(unlockedCategories)
  const restockCost = nextInventory.reduce((sum, item) => sum + item.restockCost, 0)

  // How many 5-sale milestones did we cross this session?
  const prevCount = totalSalesCount - sessionSales.length
  const shardsEarned = Math.floor(totalSalesCount / 5) - Math.floor(prevCount / 5)

  function handleContinue() {
    const newCategories = [...unlockedCategories]
    UNLOCK_MILESTONES.forEach(({ coins: threshold, category }) => {
      if (lifetimeCoins >= threshold && !newCategories.includes(category)) {
        unlockCategory(category)
        newCategories.push(category)
      }
    })
    if (shardsEarned > 0) addStarShards(shardsEarned)
    const nextInventory = generateSessionInventory(newCategories)
    const restockCost = nextInventory.reduce((sum, item) => sum + item.restockCost, 0)
    spendCoins(restockCost)
    setInventory(nextInventory)
    clearSessionSales()
    setPhase('world-map')
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 p-8"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>

      <motion.h1
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-storybook text-coin"
      >
        🎉 Session Complete!
      </motion.h1>

      {/* Sales breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-black bg-opacity-40 rounded-2xl p-4 border border-gray-700 overflow-y-auto max-h-64"
      >
        {sessionSales.length === 0 ? (
          <p className="text-gray-400 text-center font-storybook">No sales this session.</p>
        ) : (
          sessionSales.map((sale, i) => (
            <motion.div
              key={sale.itemId}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
              className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0"
            >
              <span className="text-white font-storybook">{sale.itemName}</span>
              <div className="text-right">
                <div className="text-coin text-sm">Sold: 🪙 {sale.soldFor}</div>
                <div className="text-xs" style={{ color: sale.profit >= 0 ? '#00B894' : '#FF4757' }}>
                  Profit: {sale.profit >= 0 ? '+' : ''}{sale.profit}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Totals */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-8 text-center"
      >
        <div>
          <div className="text-3xl font-storybook text-coin">🪙 {totalRevenue}</div>
          <div className="text-gray-400 text-sm">Revenue</div>
        </div>
        <div>
          <div className="text-3xl font-storybook" style={{ color: totalProfit >= 0 ? '#00B894' : '#FF4757' }}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit}
          </div>
          <div className="text-gray-400 text-sm">Profit</div>
        </div>
        <div>
          <div className="text-3xl font-storybook text-coin">🪙 {coins}</div>
          <div className="text-gray-400 text-sm">Total Coins</div>
        </div>
        <div>
          <div className="text-3xl font-storybook" style={{ color: '#FF4757' }}>-{restockCost}</div>
          <div className="text-gray-400 text-sm">Restock Cost</div>
        </div>
      </motion.div>

      {/* Star Shard reward */}
      {shardsEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
          className="w-full max-w-md rounded-2xl p-4 text-center flex flex-col items-center gap-2"
          style={{ background: 'linear-gradient(135deg, rgba(253,203,110,0.18), rgba(108,92,231,0.18))', border: '2px solid #FDCB6E88', boxShadow: '0 0 24px rgba(253,203,110,0.25)' }}
        >
          <motion.div
            className="text-4xl"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.7, repeat: 2 }}
          >
            ⭐
          </motion.div>
          <div className="font-storybook text-xl" style={{ color: '#FDCB6E' }}>
            You earned {shardsEarned} Star Shard{shardsEarned > 1 ? 's' : ''}!
          </div>
          <div className="font-storybook text-xs" style={{ color: '#c8b8e8' }}>
            Every 5 sales = 1 Star Shard · Spend them at the 🔮 Mystic Shop!
          </div>
          <div className="font-storybook text-xs" style={{ color: '#9980cc' }}>
            Total sales: {totalSalesCount} · Next shard at sale #{Math.ceil(totalSalesCount / 5) * 5 + 1}
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleContinue}
          className="px-10 py-4 rounded-2xl text-2xl font-storybook text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #a855f7)' }}
        >
          Explore Town → (spends 🪙 {restockCost} to restock)
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const w = window as any
            if (w.WackyShare) w.WackyShare.show('Re Sell Game', `I made 🪙${totalProfit >= 0 ? '+' : ''}${totalProfit} profit (🪙${totalRevenue} revenue) in Re Sell Game!`, 'https://wackybrains.com/Re%20sell%20game/')
          }}
          className="px-8 py-4 rounded-2xl text-xl font-storybook text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)' }}
        >
          ⬆ Share Result
        </motion.button>
      </div>
    </div>
  )
}
