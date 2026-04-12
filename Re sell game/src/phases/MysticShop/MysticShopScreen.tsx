// src/phases/MysticShop/MysticShopScreen.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { MYSTIC_ITEMS, RARITY_COLOR, RARITY_GLOW } from '../../data/mysticItems'
import type { MysticItem, MysticCategory } from '../../data/mysticItems'

const CATEGORY_LABELS: Record<MysticCategory | 'all', string> = {
  all: '✨ All',
  weapon: '⚔️ Weapons',
  ability: '💨 Abilities',
  magic: '🔮 Magic',
  treasure: '👑 Treasure',
}

const CATEGORIES = ['all', 'weapon', 'ability', 'magic', 'treasure'] as const

// Floating sparkle particle
function Sparkle({ x, y, delay }: { x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none text-lg select-none"
      style={{ left: x, top: y, zIndex: 0 }}
      animate={{ y: [0, -18, 0], opacity: [0.2, 0.9, 0.2], scale: [0.7, 1.2, 0.7] }}
      transition={{ duration: 3 + delay, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {['✨', '⭐', '🌟', '💫'][Math.floor(delay * 7) % 4]}
    </motion.div>
  )
}

export function MysticShopScreen() {
  const { setPhase, starShards, secretBinder, spendStarShards, collectBinderItem } = useGameStore()
  const [tab, setTab] = useState<'shop' | 'binder'>('shop')
  const [filter, setFilter] = useState<MysticCategory | 'all'>('all')
  const [selected, setSelected] = useState<MysticItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [justBought, setJustBought] = useState<string | null>(null)

  const filteredItems = MYSTIC_ITEMS.filter(
    item => filter === 'all' || item.category === filter
  )

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  function handleBuy(item: MysticItem) {
    if (secretBinder.includes(item.id)) {
      showToast('Already in your Binder! 📖')
      return
    }
    if (starShards < item.cost) {
      showToast(`Need ⭐ ${item.cost} Star Shards — sell more items!`)
      return
    }
    spendStarShards(item.cost)
    collectBinderItem(item.id)
    setJustBought(item.id)
    setTimeout(() => setJustBought(null), 1200)
    showToast(`${item.emoji} ${item.name} added to your Binder!`)
    setSelected(null)
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #2d0057 0%, #1a0038 40%, #0d0020 100%)' }}
    >
      {/* Background sparkles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <Sparkle
          key={i}
          x={`${(i * 17 + 5) % 95}%`}
          y={`${(i * 23 + 10) % 80}%`}
          delay={i * 0.4}
        />
      ))}

      {/* ── HUD ── */}
      <div
        className="relative z-20 flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', borderBottom: '1px solid rgba(108,92,231,0.4)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl font-storybook" style={{ color: '#E0D0FF' }}>🔮 Mystic Shop</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Star Shards counter */}
          <motion.div
            className="flex items-center gap-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(253,203,110,0.15)', border: '1px solid #FDCB6E' }}
            animate={{ boxShadow: ['0 0 6px rgba(253,203,110,0.3)', '0 0 14px rgba(253,203,110,0.6)', '0 0 6px rgba(253,203,110,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span className="text-lg">⭐</span>
            <span className="font-storybook text-lg" style={{ color: '#FDCB6E' }}>{starShards}</span>
            <span className="font-storybook text-xs" style={{ color: '#FDCB6E88' }}>Star Shards</span>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPhase('world-map')}
            className="px-4 py-1 rounded-full font-storybook text-sm border"
            style={{ borderColor: '#6C5CE7', color: '#a29bfe', background: 'rgba(108,92,231,0.15)' }}
          >
            ← Back to Town
          </motion.button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="relative z-10 flex gap-0 flex-shrink-0 px-5 pt-4 pb-0">
        {(['shop', 'binder'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-6 py-2 font-storybook text-sm rounded-t-xl transition-all"
            style={{
              background: tab === t ? 'rgba(108,92,231,0.3)' : 'rgba(0,0,0,0.2)',
              color: tab === t ? '#E0D0FF' : '#9980cc',
              border: '1px solid rgba(108,92,231,0.35)',
              borderBottom: tab === t ? '1px solid rgba(108,92,231,0.0)' : '1px solid rgba(108,92,231,0.35)',
            }}
          >
            {t === 'shop' ? '🛒 Mystic Shop' : `📖 Secret Binder (${secretBinder.length}/30)`}
          </button>
        ))}
        <div className="flex-1 border-b" style={{ borderColor: 'rgba(108,92,231,0.35)' }} />
      </div>

      {/* ── SHOP TAB ── */}
      {tab === 'shop' && (
        <div className="relative z-10 flex flex-col flex-1 min-h-0 px-5 pb-4">
          {/* How to earn shards */}
          <div className="text-center py-2 font-storybook text-xs" style={{ color: '#9980cc' }}>
            ⭐ Earn 1 Star Shard for every 5 items you sell in your shop!
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap pb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-3 py-1 rounded-full font-storybook text-xs transition-all"
                style={{
                  background: filter === cat ? 'rgba(108,92,231,0.5)' : 'rgba(0,0,0,0.3)',
                  color: filter === cat ? '#E0D0FF' : '#9980cc',
                  border: `1px solid ${filter === cat ? '#6C5CE7' : 'rgba(108,92,231,0.25)'}`,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
              {filteredItems.map(item => {
                const owned = secretBinder.includes(item.id)
                const canAfford = starShards >= item.cost
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.04, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(item)}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl text-center"
                    style={{
                      background: owned
                        ? `linear-gradient(135deg, ${RARITY_GLOW[item.rarity]}, rgba(0,0,0,0.5))`
                        : 'rgba(0,0,0,0.35)',
                      border: `2px solid ${owned ? RARITY_COLOR[item.rarity] : 'rgba(108,92,231,0.25)'}`,
                      boxShadow: owned ? `0 0 12px ${RARITY_GLOW[item.rarity]}` : 'none',
                    }}
                  >
                    {owned && (
                      <div className="absolute top-1 right-1 text-xs" style={{ color: RARITY_COLOR[item.rarity] }}>✔</div>
                    )}
                    <motion.div
                      className="text-4xl"
                      animate={justBought === item.id ? { scale: [1, 1.6, 1], rotate: [0, 15, -15, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {item.emoji}
                    </motion.div>
                    <div className="font-storybook text-xs leading-tight" style={{ color: '#E0D0FF' }}>{item.name}</div>
                    <div
                      className="text-xs font-storybook px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.4)', color: RARITY_COLOR[item.rarity], border: `1px solid ${RARITY_COLOR[item.rarity]}55` }}
                    >
                      {item.rarity}
                    </div>
                    <div
                      className="font-storybook text-sm px-3 py-0.5 rounded-full"
                      style={{
                        background: owned ? 'rgba(0,184,148,0.2)' : canAfford ? 'rgba(253,203,110,0.15)' : 'rgba(0,0,0,0.3)',
                        color: owned ? '#00B894' : canAfford ? '#FDCB6E' : '#666',
                        border: `1px solid ${owned ? '#00B89455' : canAfford ? '#FDCB6E55' : '#333'}`,
                      }}
                    >
                      {owned ? '✅ Collected' : `⭐ ${item.cost}`}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── BINDER TAB ── */}
      {tab === 'binder' && (
        <div className="relative z-10 flex flex-col flex-1 min-h-0 px-5 pb-4">
          {/* Progress bar */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-storybook text-xs" style={{ color: '#9980cc' }}>Collection Progress</span>
              <span className="font-storybook text-xs" style={{ color: '#FDCB6E' }}>{secretBinder.length} / 30</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #6C5CE7, #FDCB6E)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(secretBinder.length / 30) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            {secretBinder.length === 30 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-center mt-2 font-storybook text-sm"
                style={{ color: '#FDCB6E' }}
              >
                🏆 LEGENDARY COLLECTOR — You found them all!
              </motion.div>
            )}
          </div>

          {/* Binder grid — all 30 items, locked or unlocked */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
              {MYSTIC_ITEMS.map((item, i) => {
                const owned = secretBinder.includes(item.id)
                return (
                  <motion.button
                    key={item.id}
                    whileHover={owned ? { scale: 1.06, y: -3 } : { scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => owned ? setSelected(item) : setTab('shop')}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center relative"
                    style={{
                      background: owned
                        ? `linear-gradient(135deg, ${RARITY_GLOW[item.rarity]}, rgba(0,0,0,0.6))`
                        : 'rgba(0,0,0,0.4)',
                      border: `2px solid ${owned ? RARITY_COLOR[item.rarity] : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: owned ? `0 0 14px ${RARITY_GLOW[item.rarity]}` : 'none',
                      filter: owned ? 'none' : 'grayscale(1)',
                      opacity: owned ? 1 : 0.55,
                    }}
                  >
                    <div className="text-3xl">{owned ? item.emoji : '🔒'}</div>
                    <div
                      className="font-storybook leading-tight"
                      style={{ fontSize: '9px', color: owned ? '#E0D0FF' : '#666' }}
                    >
                      {owned ? item.name : `#${String(i + 1).padStart(2, '0')}`}
                    </div>
                    {owned && (
                      <div
                        className="text-xs font-storybook"
                        style={{ color: RARITY_COLOR[item.rarity], fontSize: '8px' }}
                      >
                        {item.rarity}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ITEM DETAIL MODAL ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a0038 0%, #2d0057 100%)',
                border: `2px solid ${RARITY_COLOR[selected.rarity]}`,
                boxShadow: `0 0 40px ${RARITY_GLOW[selected.rarity]}`,
              }}
            >
              {/* Glow ring behind emoji */}
              <div
                className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl pointer-events-none"
                style={{ background: RARITY_GLOW[selected.rarity] }}
              />
              <motion.div
                className="text-7xl relative z-10"
                animate={{ y: [0, -8, 0], rotate: [0, 4, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {selected.emoji}
              </motion.div>
              <div className="font-storybook text-2xl" style={{ color: '#E0D0FF' }}>{selected.name}</div>
              <div
                className="px-3 py-1 rounded-full font-storybook text-xs"
                style={{ background: `${RARITY_COLOR[selected.rarity]}22`, color: RARITY_COLOR[selected.rarity], border: `1px solid ${RARITY_COLOR[selected.rarity]}55` }}
              >
                {selected.rarity.toUpperCase()} · {CATEGORY_LABELS[selected.category]}
              </div>
              <p className="font-storybook text-sm leading-relaxed" style={{ color: '#c8b8e8' }}>
                {selected.description}
              </p>

              {secretBinder.includes(selected.id) ? (
                <div className="font-storybook text-base px-5 py-2 rounded-full" style={{ background: 'rgba(0,184,148,0.2)', color: '#00B894', border: '1px solid #00B89455' }}>
                  ✅ In your Binder!
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="font-storybook text-sm" style={{ color: '#9980cc' }}>
                    You have <span style={{ color: '#FDCB6E' }}>⭐ {starShards}</span> Star Shards
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleBuy(selected)}
                    disabled={starShards < selected.cost}
                    className="w-full py-3 rounded-2xl font-storybook text-base transition-all"
                    style={{
                      background: starShards >= selected.cost
                        ? `linear-gradient(135deg, ${RARITY_COLOR[selected.rarity]}, #6C5CE7)`
                        : 'rgba(0,0,0,0.4)',
                      color: starShards >= selected.cost ? 'white' : '#555',
                      cursor: starShards >= selected.cost ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {starShards >= selected.cost ? `⭐ Collect for ${selected.cost} Shards` : `Need ⭐ ${selected.cost} Shards`}
                  </motion.button>
                </div>
              )}
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-300 text-sm font-storybook">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 font-storybook px-6 py-3 rounded-full text-sm z-50"
            style={{ background: 'rgba(108,92,231,0.9)', color: '#E0D0FF', border: '1px solid #6C5CE7' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
