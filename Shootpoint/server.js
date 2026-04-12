require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy: OpenAI kill commentary
app.post('/api/commentary', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.json({ text: '' });
  try {
    const { default: fetch } = await import('node-fetch');
    const { killCount, weapon } = req.body;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a hype battle royale commentator. 1 short sentence, max 12 words.' },
          { role: 'user', content: `Player got ${killCount} kills with ${weapon}. React!` }
        ],
        max_tokens: 40
      })
    });
    const data = await resp.json();
    res.json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    res.json({ text: '' });
  }
});

// Proxy: ElevenLabs TTS
app.post('/api/voice', async (req, res) => {
  if (!process.env.ELEVENLABS_API_KEY) return res.status(404).end();
  try {
    const { default: fetch } = await import('node-fetch');
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });
    res.set('Content-Type', 'audio/mpeg');
    resp.body.pipe(res);
  } catch (e) {
    res.status(500).end();
  }
});

app.listen(PORT, () => console.log(`Shootpoint running → http://localhost:${PORT}`));
