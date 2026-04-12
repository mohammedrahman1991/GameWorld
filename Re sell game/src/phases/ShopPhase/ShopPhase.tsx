// src/phases/ShopPhase/ShopPhase.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShopScene } from './ShopScene'
import { BotCharacter } from './BotCharacter'
import { NegotiationUI } from './NegotiationUI'
import { CoinCounter } from './CoinCounter'
import { InventoryDisplay } from './InventoryDisplay'
import { useNegotiation } from '../../hooks/useNegotiation'
import { useBotDialogue } from '../../hooks/useBotDialogue'
import { usePatience } from '../../hooks/usePatience'
import { useGameStore } from '../../store/gameStore'
import { randomBot } from '../../data/bots'
import { generateSessionInventory } from '../../data/items'
import type { GameItem } from '../../store/gameStore'
import type { BotConfig } from '../../data/bots'

const EMPTY_ITEM: GameItem = {
  id: '',
  name: '',
  category: 'gems',
  baseValue: 0,
  restockCost: 0,
  currentValue: 0,
  emoji: '',
  rarity: 'common',
}

const EMPTY_BOT: BotConfig = {
  type: 'alex',
  displayName: '',
  emoji: '',
  color: '',
  personality: '',
  patienceDuration: 15,
  patienceDrainMultiplier: 1,
  acceptanceThreshold: 1,
  offerBias: 1,
}

export function ShopPhase() {
  const { coins, inventory, setInventory, recordSale, setPhase, unlockedCategories } = useGameStore()

  const [currentBot, setCurrentBot] = useState<BotConfig | null>(null)
  const [currentItem, setCurrentItem] = useState<GameItem | null>(null)
  const [wantedItem, setWantedItem] = useState<GameItem | null>(null)
  const [fromLeft, setFromLeft] = useState(true)
  const [merchantReaction, setMerchantReaction] = useState<'celebrate' | 'shrug' | null>(null)
  const [botBrowsing, setBotBrowsing] = useState(false)
  const [currentFloor, setCurrentFloor] = useState<1 | 2 | 3>(1)
  const handlingRef = useRef(false)

  // Seed inventory on mount if empty
  useEffect(() => {
    if (inventory.length === 0) {
      setInventory(generateSessionInventory(unlockedCategories))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const negotiation = useNegotiation(
    currentItem ?? EMPTY_ITEM,
    currentBot ?? EMPTY_BOT
  )

  const dialogue = useBotDialogue(
    currentBot ?? EMPTY_BOT,
    currentItem ?? EMPTY_ITEM
  )

  const onPatienceExpire = useCallback(() => {
    if (handlingRef.current) return
    handlingRef.current = true
    dialogue.triggerDialogue('walk')
    negotiation.patienceExpired()
    setMerchantReaction('shrug')
    setTimeout(() => {
      handlingRef.current = false
      nextBot()
    }, 2500)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Patience only counts down once the player has shown the bot an item
  const patience = usePatience(currentBot?.patienceDuration ?? 20, onPatienceExpire, currentBot !== null && !botBrowsing)

  // Auto-spawn a bot when there's no active bot and inventory exists
  useEffect(() => {
    if (!currentBot && inventory.length > 0) {
      const timer = setTimeout(() => {
        const bot = randomBot()
        const wanted = inventory[Math.floor(Math.random() * inventory.length)]
        setCurrentBot(bot)
        setWantedItem(wanted)
        setFromLeft(Math.random() < 0.5)
        setBotBrowsing(true)
        setTimeout(() => dialogue.triggerDialogue('browse', undefined, 1, wanted.name), 400)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [currentBot, inventory.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function nextBot() {
    setCurrentBot(null)
    setCurrentItem(null)
    setWantedItem(null)
    setBotBrowsing(false)
    setMerchantReaction(null)
  }

  // Player picks an item to show the bot
  function handleSelectItem(item: GameItem) {
    if (!currentBot || currentItem) return // already negotiating
    setCurrentItem(item)
    setBotBrowsing(false)
    // Bot now responds to the specific item shown
    const mode = Math.random() < 0.5 ? 'offer' : 'ask'
    const amount = Math.round(item.currentValue * (currentBot?.offerBias ?? 1))
    setTimeout(() => dialogue.triggerDialogue(mode, amount, 1), 300)
  }

  async function handleAccept(price: number) {
    if (!currentItem || !currentBot || handlingRef.current) return
    handlingRef.current = true
    patience.pause()
    await dialogue.triggerDialogue('accept', price, negotiation.round)
    recordSale({
      itemId: currentItem.id,
      itemName: currentItem.name,
      restockCost: currentItem.restockCost,
      soldFor: price,
      profit: price - currentItem.restockCost,
      soldAt: Date.now(),
    })
    const remainingItems = inventory.filter((i) => i.id !== currentItem.id)
    setInventory(remainingItems)
    negotiation.accept(price)
    setMerchantReaction('celebrate')
    setTimeout(() => {
      handlingRef.current = false
      nextBot()
      if (remainingItems.length === 0) {
        setTimeout(() => setPhase('session-end'), 1500)
      }
    }, 2000)
  }

  async function handleReject() {
    if (!currentBot || handlingRef.current) return
    handlingRef.current = true
    patience.pause()
    await dialogue.triggerDialogue('reject')
    negotiation.reject()
    setMerchantReaction('shrug')
    setTimeout(() => {
      handlingRef.current = false
      nextBot()
    }, 1500)
  }

  async function handleCounter(price: number) {
    if (!currentBot || !currentItem || handlingRef.current) return
    if (negotiation.botWillAccept(price)) {
      // go straight to accept — no extra dialogue call here to avoid double API call
      handleAccept(price)
    } else {
      negotiation.counter(price)
      const counterAmount = Math.round(price * 0.85)
      await dialogue.triggerDialogue('counter', counterAmount, negotiation.round + 1)
    }
  }

  return (
    <ShopScene floor={currentFloor}>
      <CoinCounter coins={coins} />

      {/* Merchant reaction */}
      <AnimatePresence>
        {merchantReaction && (
          <motion.div
            key={merchantReaction}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -30, opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 text-5xl z-30"
          >
            {merchantReaction === 'celebrate' ? '🎉' : '😔'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot */}
      <AnimatePresence>
        {currentBot && currentItem && (
          <BotCharacter
            bot={currentBot}
            dialogue={dialogue.dialogue}
            isLoadingDialogue={dialogue.isLoading}
            patienceProgress={patience.progress}
            fromLeft={fromLeft}
          />
        )}
      </AnimatePresence>

      {/* Negotiation UI */}
      <AnimatePresence>
        {currentBot && currentItem && negotiation.outcome === null && (
          <NegotiationUI
            item={currentItem}
            bot={currentBot}
            currentOffer={negotiation.currentOffer}
            mode={negotiation.mode}
            round={negotiation.round}
            onAccept={handleAccept}
            onReject={handleReject}
            onCounter={handleCounter}
            botWillAccept={negotiation.botWillAccept}
          />
        )}
      </AnimatePresence>

      {/* Prompt when bot is browsing — show what they want */}
      {botBrowsing && !currentItem && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1 mb-1"
        >
          {wantedItem && (
            <div
              className="flex items-center gap-2 px-4 py-1 rounded-full text-sm font-storybook"
              style={{ background: 'rgba(245,200,66,0.15)', border: '1px solid #F5C842', color: '#F5C842' }}
            >
              <span>{currentBot?.emoji}</span>
              <span>{currentBot?.displayName} wants:</span>
              <span>{wantedItem.emoji}</span>
              <span>{wantedItem.name}</span>
            </div>
          )}
          <div className="text-white font-storybook text-base" style={{ textShadow: '0 0 8px #F5C842' }}>
            👆 Tap the item to show them!
          </div>
        </motion.div>
      )}

      {/* Inventory */}
      <InventoryDisplay
        items={inventory}
        activeItemId={currentItem?.id ?? null}
        wantedItemId={botBrowsing ? (wantedItem?.id ?? null) : null}
        onSelectItem={handleSelectItem}
      />

      {/* Floor navigation + Close shop */}
      <div className="flex items-center gap-3 mt-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentFloor((f) => Math.max(1, f - 1) as 1 | 2 | 3)}
          disabled={currentFloor === 1}
          className="px-4 py-2 rounded-full text-sm font-storybook border transition-all"
          style={{
            borderColor: currentFloor === 1 ? '#333' : '#F5C842',
            color: currentFloor === 1 ? '#555' : '#F5C842',
            background: 'rgba(0,0,0,0.4)',
            opacity: currentFloor === 1 ? 0.4 : 1,
          }}
        >
          ⬇️ {currentFloor - 1}F
        </motion.button>

        <span className="text-white font-storybook text-sm opacity-60">{currentFloor}F</span>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentFloor((f) => Math.min(3, f + 1) as 1 | 2 | 3)}
          disabled={currentFloor === 3}
          className="px-4 py-2 rounded-full text-sm font-storybook border transition-all"
          style={{
            borderColor: currentFloor === 3 ? '#333' : '#F5C842',
            color: currentFloor === 3 ? '#555' : '#F5C842',
            background: 'rgba(0,0,0,0.4)',
            opacity: currentFloor === 3 ? 0.4 : 1,
          }}
        >
          ⬆️ {currentFloor + 1}F
        </motion.button>

        {currentFloor === 1 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPhase('world-map')}
            className="px-5 py-2 rounded-full text-sm font-storybook border transition-all"
            style={{ borderColor: '#00B894', color: '#00B894', background: 'rgba(0,184,148,0.1)' }}
          >
            🚪 Go Outside
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setPhase('session-end')}
          className="px-6 py-2 rounded-full text-sm font-storybook text-gray-300 bg-black bg-opacity-40 border border-gray-600"
        >
          Close Shop →
        </motion.button>
      </div>
    </ShopScene>
  )
}
