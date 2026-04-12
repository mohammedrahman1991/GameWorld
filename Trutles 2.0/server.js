require('dotenv').config();
const express = require('express');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const PORT      = process.env.PORT || 4001;
const CACHE_DIR = path.join(__dirname, '.audio-cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

app.use(express.static(__dirname));

// ── Sound descriptions sent to ElevenLabs sound-generation API ──────────────
const SOUND_PROMPTS = {
  fight:       'cartoon video game announcer yelling FIGHT with energy and hype, game show style retro',
  ko:          'cartoon video game announcer yelling K O excitedly, retro arcade style',
  time:        'cartoon video game announcer saying TIME UP with urgency, arcade style',
  round1:      'cartoon video game announcer saying Round 1 with enthusiasm, retro game',
  round2:      'cartoon video game announcer saying Round 2 with enthusiasm, retro game',
  round3:      'cartoon video game announcer saying Round 3 Final Round intense energy',
  p1wins:      'cartoon video game announcer saying Player 1 Wins with celebration fanfare',
  p2wins:      'cartoon video game announcer saying Player 2 Wins with celebration fanfare',
  pow:         'cartoon character yelling POW during a comic book punch, energetic funny',
  bam:         'cartoon character yelling BAM during an impact, comic book style energetic',
  gotem:       "cartoon character yelling GOT EM excitedly after landing a hit, funny",
  smash:       'cartoon impact SMASH sound effect, comic book style',
  slice:       'cartoon character yelling SLICE with a swoosh, energetic',
  dice:        'cartoon impact sound DICE quick energetic cartoon voice',
  kapow:       'cartoon superhero sound KA POW big comic book impact, over the top',
  wham:        'cartoon impact WHAM sound effect, old school comic book',
  critical:    'massive cartoon super hit CRITICAL STRIKE with epic over-the-top energy',
  slam:        'cartoon character yelling SLAM with huge impact slam energy',
  destroyed:   'cartoon voice yelling DESTROYED with explosion energy, over the top funny',
  annihilated: 'cartoon voice ANNIHILATED over the top exclamation with impact',
};

async function generateSound(name) {
  const cachePath = path.join(CACHE_DIR, `${name}.mp3`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath);

  const prompt = SOUND_PROMPTS[name];
  if (!prompt) throw new Error(`Unknown sound: ${name}`);

  const isLong  = ['fight','ko','time','round1','round2','round3','p1wins','p2wins'].includes(name);
  const body    = JSON.stringify({
    text:             prompt,
    duration_seconds: isLong ? 2.5 : 1.2,
    prompt_influence: 0.45,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path:     '/v1/sound-generation',
      method:   'POST',
      headers: {
        'Accept':         'audio/mpeg',
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'xi-api-key':     process.env.ELEVENLABS_API_KEY,
      },
    }, (res) => {
      const chunks = [];
      res.on('data',  c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`ElevenLabs ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0,200)}`));
        }
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(cachePath, buf);
        resolve(buf);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Sound endpoint ────────────────────────────────────────────────────────────
app.get('/api/sound/:name', async (req, res) => {
  try {
    const audio = await generateSound(req.params.name);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(audio);
  } catch (err) {
    console.error(`[sound] ${req.params.name} →`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Pre-warm ALL sounds on startup ────────────────────────────────────────────
async function preWarm() {
  const priority = [
    // Announcements first (needed before first hit)
    'fight', 'ko', 'time', 'round1', 'round2', 'round3', 'p1wins', 'p2wins',
    // Hit sounds — generate these so they're instant in-game
    'pow', 'bam', 'gotem', 'smash', 'slice', 'dice', 'kapow', 'wham',
    'critical', 'slam', 'destroyed', 'annihilated',
  ];
  console.log('\nPre-generating announcement sounds (first run may take ~20s)...');
  for (const name of priority) {
    const cached = fs.existsSync(path.join(CACHE_DIR, `${name}.mp3`));
    try {
      await generateSound(name);
      console.log(`  ✓ ${name}${cached ? ' (cached)' : ' (generated)'}`);
    } catch (e) {
      console.warn(`  ✗ ${name}: ${e.message}`);
    }
  }
  console.log('Sounds ready!\n');
}

app.listen(PORT, () => {
  console.log(`\n🐔  Trutles 2.0  →  http://localhost:${PORT}\n`);
  preWarm();
});
