// game/systems/MusicSystem.js
// Soft, goofy cartoon-style chiptune — bouncy xylophone melody + boing drums

export class MusicSystem {
  constructor() {
    this._ctx = null;
    this._interval = null;
    this._playing = false;
    this._step = 0;
  }

  start() {
    if (this._playing) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._playing = true;
    this._step = 0;

    const bpm = 108; // slower & bouncier
    const stepMs = (60 / bpm / 4) * 1000;

    this._interval = setInterval(() => {
      if (!this._playing || !this._ctx) return;
      const s = this._step % 32;

      // Soft bongo kick — only on 1 and 3 (steps 0, 16)
      if (s === 0 || s === 16) this._bongo();

      // Boing snare on beats 2, 4
      if (s === 8 || s === 24) this._boing();

      // Gentle shaker instead of hi-hat
      if (s % 4 === 2) this._shaker();

      // Bouncy xylophone bass line (triangle wave, softer)
      const bass = [
        262,0,0,0, 294,0,0,0, 330,0,0,0, 294,0,0,0,
        262,0,0,0, 247,0,0,0, 220,0,0,0, 247,0,0,0,
      ][s];
      if (bass) this._xylo(bass, 0.18, 0.22);

      // Goofy cartoon melody — xylophone with extra bouncy notes
      const mel = [
        523,  0,659,  0, 784,  0,659,523,
        392,  0,  0,523, 659,  0,523,  0,
        784,  0,880,  0, 784,659,523,  0,
        440,523,659,  0, 523,  0,392,  0,
      ][s];
      if (mel) this._xylo(mel, 0.13, 0.13);

      // Silly high blip counter-melody
      const blip = [
        0,1047,0,0, 0,0,1047,0, 0,1175,0,0, 0,0,0,1047,
        0,0,987,0,  0,1047,0,0, 0,0,1175,0, 0,1047,0,0,
      ][s];
      if (blip) this._blip(blip, 0.07);

      this._step++;
    }, stepMs);
  }

  stop() {
    this._playing = false;
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    if (this._ctx) { this._ctx.close(); this._ctx = null; }
  }

  // ── Drum sounds ────────────────────────────────────────────────────────────

  // Soft bongo — low pitched, short decay
  _bongo() {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  }

  // Cartoony boing snare
  _boing() {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  }

  // Gentle shaker
  _shaker() {
    const ctx = this._ctx;
    const size = Math.floor(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 6000;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    src.start(ctx.currentTime);
  }

  // Xylophone tone — triangle wave, plucky envelope
  _xylo(freq, vol, dur) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.setTargetAtTime(0.001, ctx.currentTime + 0.02, dur * 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.1);
  }

  // High silly blip — square wave
  _blip(freq, vol) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07);
  }
}
