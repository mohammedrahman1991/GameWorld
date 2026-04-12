// tests/services/openai.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateBotDialogue } from '../../src/services/openai'

vi.mock('openai', () => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: 'I will pay 50 coins for that!' } }],
  })
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create } },
    })),
  }
})

describe('generateBotDialogue', () => {
  it('returns a dialogue string', async () => {
    const result = await generateBotDialogue({
      botPersonality: 'You are an excited kid.',
      itemName: 'Ruby',
      mode: 'offer',
      offerAmount: 50,
      round: 1,
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns fallback string on error', async () => {
    const openaiModule = await import('openai')
    const mockCreate = vi.fn().mockRejectedValueOnce(new Error('Network error'))
    vi.mocked(openaiModule.default).mockImplementationOnce(() => ({
      chat: { completions: { create: mockCreate } },
    }) as any)
    const result = await generateBotDialogue({
      botPersonality: 'You are an excited kid.',
      itemName: 'Ruby',
      mode: 'offer',
      offerAmount: 50,
      round: 1,
    })
    expect(result).toBe('Hmm...')
  })
})
