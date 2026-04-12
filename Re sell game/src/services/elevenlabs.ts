// src/services/elevenlabs.ts
export async function speakText(text: string): Promise<void> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID ?? 'IKne3meq5aSn9XLyUdCD'

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!response.ok) return // voice is enhancement — fail silently

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    await audio.play()
    URL.revokeObjectURL(url)
  } catch {
    // fail silently — voice is enhancement, not required
  }
}
