/**
 * Zayn's World — TTS Proxy Server
 * Proxies text to ElevenLabs so the API key stays server-side.
 * Run: node tts-proxy.js
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Parse .env ─────────────────────────────────────────────────
const env = {};
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .forEach(line => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const idx = t.indexOf('=');
      if (idx < 0) return;
      env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
    });
} catch (_) { /* .env missing, will warn below */ }

const API_KEY  = env.ELEVENLABS_API_KEY;
const VOICE_ID = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const PORT     = 3025;

if (!API_KEY) {
  console.error('❌  ELEVENLABS_API_KEY not found in .env');
  process.exit(1);
}

// ── Server ─────────────────────────────────────────────────────
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/speak') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      let text = '';
      try { text = JSON.parse(body).text; } catch (_) {}
      if (!text) { res.writeHead(400); res.end('No text'); return; }

      console.log(`🔊 Speaking: "${text.slice(0, 60)}..."`);

      const payload = JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.48, similarity_boost: 0.76, speed: 1.05 },
      });

      const opts = {
        hostname: 'api.elevenlabs.io',
        path:     `/v1/text-to-speech/${VOICE_ID}`,
        method:   'POST',
        headers: {
          'xi-api-key':     API_KEY,
          'Content-Type':   'application/json',
          'Accept':         'audio/mpeg',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const ereq = https.request(opts, eres => {
        if (eres.statusCode !== 200) {
          console.error(`ElevenLabs ${eres.statusCode}`);
          res.writeHead(500); res.end(`ElevenLabs error ${eres.statusCode}`); return;
        }
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        eres.pipe(res);
      });
      ereq.on('error', e => { console.error(e.message); res.writeHead(500); res.end(e.message); });
      ereq.write(payload);
      ereq.end();
    });
  } else {
    res.writeHead(404); res.end();
  }
}).listen(PORT, () => {
  console.log(`✅  TTS proxy running at http://localhost:${PORT}`);
  console.log(`   Voice: ${VOICE_ID}`);
});
