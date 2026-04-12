// src/services/openai.ts
import OpenAI from 'openai'

type DialogueMode = 'offer' | 'ask' | 'browse' | 'counter' | 'accept' | 'reject' | 'walk'

interface DialogueParams {
  botPersonality: string
  itemName: string
  mode: DialogueMode
  offerAmount?: number
  round: number
}

function buildPrompt(params: DialogueParams): string {
  const { itemName, mode, offerAmount, round } = params
  switch (mode) {
    case 'offer':
      return `You want to buy the "${itemName}" for ${offerAmount} coins. Say so in character.`
    case 'ask':
      return `You want to know the price of "${itemName}". Ask in character.`
    case 'counter':
      return `The seller wants ${offerAmount} coins for "${itemName}". Counter with a lower amount. Round ${round} of 3.`
    case 'accept':
      return `You just agreed to buy "${itemName}" for ${offerAmount} coins. React happily in character.`
    case 'reject':
      return `The price for "${itemName}" is too high. Say you're walking away.`
    case 'walk':
      return `You ran out of patience. Say you're leaving — brief, one sentence.`
    case 'browse':
      return `You just walked into a shop. You are specifically looking for "${itemName}". Ask if they have it — in character, under 12 words.`
  }
}

export async function generateBotDialogue(params: DialogueParams): Promise<string> {
  try {
    const client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${params.botPersonality} You are in a kids market stall game. Keep ALL responses family-friendly and under 15 words.`,
        },
        { role: 'user', content: buildPrompt(params) },
      ],
      max_tokens: 60,
    })

    return response.choices[0]?.message?.content ?? 'Hmm...'
  } catch {
    return 'Hmm...'
  }
}
