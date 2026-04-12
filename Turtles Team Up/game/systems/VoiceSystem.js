// game/systems/VoiceSystem.js

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export class VoiceSystem {
  constructor(apiKey) {
    this._apiKey = apiKey;
    this._cache = new Map(); // key: `${voiceId}:${text}` -> Blob
  }

  _cacheKey(voiceId, text) {
    return `${voiceId}:${text}`;
  }

  isCached(voiceId, text) {
    return this._cache.has(this._cacheKey(voiceId, text));
  }

  /**
   * Speak a line. Non-blocking — fires and forgets.
   * Caches the audio blob after first fetch.
   * @param {string} voiceId  ElevenLabs voice ID
   * @param {string} text     Text to speak
   */
  speak(voiceId, text) {
    if (!voiceId || voiceId.startsWith('replace_with') || !this._apiKey || this._apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE') {
      // API key or voice ID not configured — skip silently
      return;
    }
    const key = this._cacheKey(voiceId, text);
    if (this._cache.has(key)) {
      this._playBlob(this._cache.get(key));
      return;
    }
    this._fetchAndPlay(voiceId, text, key);
  }

  async _fetchAndPlay(voiceId, text, key) {
    try {
      const res = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this._apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (!res.ok) {
        console.warn(`VoiceSystem: ElevenLabs error ${res.status} for "${text}"`);
        return;
      }
      const blob = await res.blob();
      this._cache.set(key, blob);
      this._playBlob(blob);
    } catch (err) {
      console.warn('VoiceSystem: fetch failed', err.message);
    }
  }

  _playBlob(blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {
      // Browser autoplay policy — silently skip if blocked
    });
  }
}
