// api/spelling-voice.js — ElevenLabs TTS for Spelling Game
// Uses "Rachel" voice: calm, clear, child-friendly
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).end();

  const { text } = req.body;
  if (!text) return res.status(400).end();

  // Rachel — calm, warm, clear female voice
  const voiceId = '21m00Tcm4TlvDq8ikWAM';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.80,          // high = calm, consistent delivery
          similarity_boost: 0.75,
          style: 0,                 // no dramatic style
          use_speaker_boost: false,
        },
      }),
    });

    if (!response.ok) return res.status(response.status).end();
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache repeated words
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).end();
  }
}
