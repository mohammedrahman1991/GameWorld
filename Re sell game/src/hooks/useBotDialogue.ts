// src/hooks/useBotDialogue.ts
import { useState, useCallback } from 'react'
import { generateBotDialogue } from '../services/openai'
import { speakText } from '../services/elevenlabs'
import type { BotConfig } from '../data/bots'
import type { GameItem } from '../store/gameStore'

type DialogueMode = 'offer' | 'ask' | 'browse' | 'counter' | 'accept' | 'reject' | 'walk'

interface UseBotDialogueReturn {
  dialogue: string
  isLoading: boolean
  triggerDialogue: (mode: DialogueMode, amount?: number, round?: number, itemNameOverride?: string) => Promise<void>
}

export function useBotDialogue(bot: BotConfig, item: GameItem): UseBotDialogueReturn {
  const [dialogue, setDialogue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const triggerDialogue = useCallback(
    async (mode: DialogueMode, amount?: number, round = 1, itemNameOverride?: string) => {
      setIsLoading(true)
      const text = await generateBotDialogue({
        botPersonality: bot.personality,
        itemName: itemNameOverride ?? item.name,
        mode,
        offerAmount: amount,
        round,
      })
      setDialogue(text)
      setIsLoading(false)
      speakText(text)
    },
    [bot, item]
  )

  return { dialogue, isLoading, triggerDialogue }
}
