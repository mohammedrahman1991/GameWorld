// tests/services/elevenlabs.test.ts
import { describe, it, expect, vi } from 'vitest'
import { speakText } from '../../src/services/elevenlabs'

describe('speakText', () => {
  it('resolves without error when fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' })),
    } as any)
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.revokeObjectURL = vi.fn()

    const mockPlay = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(global, 'Audio' as any).mockImplementation(() => ({ play: mockPlay }))

    await expect(speakText('Hello!')).resolves.toBeUndefined()
  })

  it('resolves silently when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any)
    await expect(speakText('Hello!')).resolves.toBeUndefined()
  })
})
