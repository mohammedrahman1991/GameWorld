// src/services/elevenlabs.ts
// Audio proxied through /api/resell-voice — keys never exposed to browser

export async function speakText(text: string): Promise<void> {
  try {
    const response = await fetch('/api/resell-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    await audio.play()
    URL.revokeObjectURL(url)
  } catch {
    // fail silently — voice is enhancement, not required
  }
}
