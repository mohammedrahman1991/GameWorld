require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3021;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ElevenLabs TTS proxy (keeps API key server-side) ─────────────────────
app.post('/api/sound', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) {
    console.error('ElevenLabs error:', err.response?.status, err.message);
    res.status(500).json({ error: 'Sound generation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🦸 Swing Hero running at http://localhost:${PORT}\n`);
});
