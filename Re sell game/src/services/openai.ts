// src/services/openai.ts
// API calls are proxied through /api/resell-dialogue — keys never exposed to browser

type DialogueMode = 'offer' | 'ask' | 'browse' | 'counter' | 'accept' | 'reject' | 'walk'

interface DialogueParams {
  botPersonality: string
  itemName: string
  mode: DialogueMode
  offerAmount?: number
  round: number
}

export async function generateBotDialogue(params: DialogueParams): Promise<string> {
  try {
    const response = await fetch('/api/resell-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!response.ok) return 'Hmm...'
    const data = await response.json()
    return data.text ?? 'Hmm...'
  } catch {
    return 'Hmm...'
  }
}
