// src/hooks/useNegotiation.ts
import { useState, useMemo, useEffect } from 'react'
import type { GameItem } from '../store/gameStore'
import type { BotConfig } from '../data/bots'

export type NegotiationMode = 'A' | 'B'
export type NegotiationOutcome = 'deal' | 'no-deal' | null

interface NegotiationState {
  mode: NegotiationMode
  round: number
  currentOffer: number
  outcome: NegotiationOutcome
  dealPrice: number | null
  accept: (price: number) => void
  reject: () => void
  counter: (price: number) => void
  patienceExpired: () => void
  botWillAccept: (price: number) => boolean
}

export function useNegotiation(item: GameItem, bot: BotConfig): NegotiationState {
  const mode = useMemo<NegotiationMode>(() => (Math.random() < 0.5 ? 'A' : 'B'), [item.id, bot.type])
  const initialOffer = useMemo(
    () => Math.round(item.currentValue * bot.offerBias),
    [item.currentValue, bot.offerBias]
  )

  const [round, setRound] = useState(1)
  const [currentOffer, setCurrentOffer] = useState(initialOffer)
  const [outcome, setOutcome] = useState<NegotiationOutcome>(null)
  const [dealPrice, setDealPrice] = useState<number | null>(null)

  useEffect(() => {
    setRound(1)
    setCurrentOffer(initialOffer)
    setOutcome(null)
    setDealPrice(null)
  }, [item.id, bot.type, initialOffer])

  const maxAcceptablePrice = Math.round(item.currentValue * bot.acceptanceThreshold)

  function botWillAccept(price: number): boolean {
    return price <= maxAcceptablePrice
  }

  function accept(price: number) {
    setDealPrice(price)
    setOutcome('deal')
  }

  function reject() {
    setOutcome('no-deal')
  }

  function counter(playerPrice: number) {
    const nextRound = round + 1
    setCurrentOffer(playerPrice)
    setRound(nextRound)

    if (nextRound > 3) {
      // After 3 rounds, bot decides
      if (botWillAccept(playerPrice)) {
        setDealPrice(playerPrice)
        setOutcome('deal')
      } else {
        setOutcome('no-deal')
      }
    }
  }

  function patienceExpired() {
    setOutcome('no-deal')
  }

  return { mode, round, currentOffer, outcome, dealPrice, accept, reject, counter, patienceExpired, botWillAccept }
}
