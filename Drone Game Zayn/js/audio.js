/**
 * Zayn's World — Audio System
 * - speak(text)     → ElevenLabs TTS via local proxy
 * - play(eventKey)  → Procedural Web Audio SFX
 *
 * Call audio.init() on first user gesture (keydown / click).
 */

class AudioSystem {
  constructor() {
    this.ctx          = null;
    this.master       = null;
    this._ready       = false;
    this._ttsCache    = new Map();
    this.TTS_URL      = 'http://localhost:3025/speak';
    this._musicNodes  = [];
    this._musicActive = false;
    this._musicGain   = null;
    this._scheduleTO  = null;
  }

  // ── Must be called after a user gesture ─────────────────────
  init() {
    if (this._ready) return;
    this._ready = true;
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── Background Music ─────────────────────────────────────────
  // Kid-friendly adventure theme using warm triangle/sine waves
  startMusic() {
    if (!this._ready || this._musicActive) return;
    this._musicActive = true;

    // Shared reverb-style delay
    const delay    = this.ctx.createDelay(0.38);
    const delayFB  = this.ctx.createGain();
    const delayOut = this.ctx.createGain();
    delay.delayTime.value = 0.32;
    delayFB.gain.value    = 0.28;
    delayOut.gain.value   = 0.22;
    delay.connect(delayFB); delayFB.connect(delay);
    delay.connect(delayOut); delayOut.connect(this.master);

    // Master music bus (gentle volume)
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this._musicGain.gain.linearRampToValueAtTime(0.32, this.ctx.currentTime + 3.5);
    this._musicGain.connect(this.master);
    this._musicGain.connect(delay);

    // ── Pentatonic major scale: C D E G A C5 ────────────────
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    // ── Melody — 32 quarter-note sequence ────────────────────
    const melody = [
      0,1,2,3, 4,3,2,1, 0,2,4,3, 2,1,0,0,
      1,2,3,4, 5,4,3,2, 1,3,5,4, 3,2,1,0,
    ].map(i => scale[i]);

    // ── Bass — root every 2 beats ─────────────────────────────
    const bass = [0,0,2,0, 0,0,1,0, 0,0,2,0, 0,1,0,0].map(i => scale[i] / 2);

    const BPM  = 114;
    const beat = 60 / BPM;
    const loopLen = beat * 32;

    const scheduleLoop = (startTime) => {
      // ── Melody (triangle — warm, non-robotic) ──────────────
      melody.forEach((freq, i) => {
        const t = startTime + i * beat;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'triangle';
        osc.frequency.value = freq;
        // Slight vibrato
        const vib  = this.ctx.createOscillator();
        const vibG = this.ctx.createGain();
        vib.frequency.value = 5.5; vibG.gain.value = 2.5;
        vib.connect(vibG); vibG.connect(osc.frequency);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.04);
        g.gain.setValueAtTime(0.18, t + beat * 0.72);
        g.gain.linearRampToValueAtTime(0, t + beat * 0.92);
        osc.connect(g); g.connect(this._musicGain);
        osc.start(t); osc.stop(t + beat);
        vib.start(t); vib.stop(t + beat);
        this._musicNodes.push(osc, vib);
      });

      // ── Bass line (sine — deep, smooth) ───────────────────
      bass.forEach((freq, i) => {
        const t   = startTime + i * beat * 2;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.24, t + 0.08);
        g.gain.setValueAtTime(0.24, t + beat * 1.6);
        g.gain.linearRampToValueAtTime(0, t + beat * 1.9);
        osc.connect(g); g.connect(this._musicGain);
        osc.start(t); osc.stop(t + beat * 2);
        this._musicNodes.push(osc);
      });

      // ── Soft hi-hat (bandpass noise, every half-beat) ──────
      for (let i = 0; i < 64; i++) {
        const t   = startTime + i * beat * 0.5;
        const ns  = this.ctx.createBufferSource();
        ns.buffer = this._noiseBuf(0.055);
        const bp  = this.ctx.createBiquadFilter();
        bp.type   = 'highpass'; bp.frequency.value = 7000;
        const g   = this.ctx.createGain();
        const vel = i % 4 === 0 ? 0.045 : (i % 2 === 0 ? 0.025 : 0.012);
        g.gain.setValueAtTime(vel, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        ns.connect(bp); bp.connect(g); g.connect(this._musicGain);
        ns.start(t); ns.stop(t + 0.06);
        this._musicNodes.push(ns);
      }

      // ── Soft kick (sine thud, every 4 beats) ──────────────
      for (let i = 0; i < 8; i++) {
        const t   = startTime + i * beat * 4;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(g); g.connect(this._musicGain);
        osc.start(t); osc.stop(t + 0.25);
        this._musicNodes.push(osc);
      }

      // ── Accent chime (sine, every 8 beats — sparkle) ──────
      [0, 8, 16, 24].forEach(step => {
        const t   = startTime + step * beat;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.value = scale[4] * 2; // high A
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 2);
        osc.connect(g); g.connect(this._musicGain);
        osc.start(t); osc.stop(t + beat * 2.1);
        this._musicNodes.push(osc);
      });

      // Schedule next loop just before this one ends
      this._scheduleTO = setTimeout(() => {
        if (this._musicActive) scheduleLoop(startTime + loopLen);
      }, (loopLen - 1.0) * 1000);
    };

    scheduleLoop(this.ctx.currentTime + 0.5);
  }

  stopMusic() {
    this._musicActive = false;
    clearTimeout(this._scheduleTO);
    if (this._musicGain) {
      this._musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    }
    setTimeout(() => {
      this._musicNodes.forEach(n => { try { n.stop(); } catch (_) {} });
      this._musicNodes.length = 0;
    }, 1600);
  }

  // ── Text-to-Speech via ElevenLabs proxy ─────────────────────
  async speak(rawText) {
    if (!this._ready) return;
    // Strip emoji & symbols — only send readable words to TTS
    const text = rawText
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/gu, '')
      .replace(/[^\w\s!?,.'"\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return;

    try {
      if (this._ttsCache.has(text)) {
        this._playBuffer(this._ttsCache.get(text), 1.15);
        return;
      }
      const res = await fetch(this.TTS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      if (!res.ok) { console.warn('TTS error', res.status); return; }
      const arrBuf = await res.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(arrBuf);
      this._ttsCache.set(text, audioBuf);
      this._playBuffer(audioBuf, 1.15);
    } catch (e) {
      console.warn('TTS unavailable:', e.message);
    }
  }

  _playBuffer(buf, volume = 1) {
    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer      = buf;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  // ── Dispatch SFX by key ──────────────────────────────────────
  play(key) {
    if (!this._ready) return;
    const fn = this[`_sfx_${key}`];
    if (fn) fn.call(this);
    else console.warn(`No SFX for key: ${key}`);
  }

  // ── Utility: white-noise buffer ──────────────────────────────
  _noiseBuf(sec = 1) {
    const frames = Math.ceil(this.ctx.sampleRate * sec);
    const buf    = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const d      = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Soft clip waveshaper ─────────────────────────────────────
  _clipper(amount = 4) {
    const ws = this.ctx.createWaveShaper();
    const c  = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      c[i] = Math.tanh(x * amount);
    }
    ws.curve = c;
    return ws;
  }

  // ══════════════════════════════════════════════════════════════
  //  SFX
  // ══════════════════════════════════════════════════════════════

  // ── 1a. Meteor — incoming whistle ────────────────────────────
  _sfx_meteor_incoming() {
    const now = this.ctx.currentTime;

    // Descending whistle
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 2.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 2.5);

    // Low rolling rumble
    const ns   = this.ctx.createBufferSource();
    ns.buffer  = this._noiseBuf(3);
    const lp   = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 80;
    const rg   = this.ctx.createGain();
    rg.gain.setValueAtTime(0, now);
    rg.gain.linearRampToValueAtTime(0.18, now + 1.2);
    ns.connect(lp); lp.connect(rg); rg.connect(this.master);
    ns.start(now);
  }

  // ── 1b. Meteor — impact boom ─────────────────────────────────
  _sfx_meteor_impact() {
    const now = this.ctx.currentTime;

    // Sub-bass thud
    const sub = this.ctx.createOscillator();
    sub.type  = 'sine';
    sub.frequency.setValueAtTime(40, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 1.0);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(2.5, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    sub.connect(subG); subG.connect(this.master);
    sub.start(now); sub.stop(now + 1.3);

    // Broadband explosion crunch
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(2);
    const lp  = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 350;
    const nG  = this.ctx.createGain();
    nG.gain.setValueAtTime(2.2, now);
    nG.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    ns.connect(lp); lp.connect(nG); nG.connect(this.master);
    ns.start(now); ns.stop(now + 2);
  }

  // ── 2. River — flowing water ─────────────────────────────────
  _sfx_river() {
    const now = this.ctx.currentTime;
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(10); ns.loop = true;

    const bp  = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = 0.5;

    // LFO gently wobbles filter
    const lfo = this.ctx.createOscillator();
    const lfG = this.ctx.createGain();
    lfo.frequency.value = 0.4; lfG.gain.value = 120;
    lfo.connect(lfG); lfG.connect(bp.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 3.5);
    gain.gain.linearRampToValueAtTime(0.22, now + 9);
    gain.gain.linearRampToValueAtTime(0, now + 12);

    ns.connect(bp); bp.connect(gain); gain.connect(this.master);
    ns.start(now); ns.stop(now + 12);
    lfo.start(now); lfo.stop(now + 12);
  }

  // ── 3a. Volcano — deep underground rumble warning ────────────
  _sfx_volcano_warning() {
    const now = this.ctx.currentTime;

    // Gentle low sine rumble (not harsh)
    const osc  = this.ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(28, now);
    osc.frequency.linearRampToValueAtTime(42, now + 7);

    // Lowpass to keep it muffled/underground
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 180;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 2);
    gain.gain.linearRampToValueAtTime(0.22, now + 6);
    gain.gain.linearRampToValueAtTime(0,    now + 8);

    osc.connect(lp); lp.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 8);

    // Distant stone-cracking texture
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(7);
    const bp  = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 120; bp.Q.value = 0.6;
    const ng  = this.ctx.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(0.12, now + 1.5);
    ng.gain.linearRampToValueAtTime(0, now + 8);
    ns.connect(bp); bp.connect(ng); ng.connect(this.master);
    ns.start(now); ns.stop(now + 8);
  }

  // ── 3b. Volcano — eruption + lava bubbling ──────────────────
  _sfx_volcano_erupt() {
    const now = this.ctx.currentTime;

    // Deep rolling boom (not ear-piercing)
    const sub = this.ctx.createOscillator();
    sub.type  = 'sine';
    sub.frequency.setValueAtTime(38, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 1.2);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(0.8, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    sub.connect(subG); subG.connect(this.master);
    sub.start(now); sub.stop(now + 1.5);

    // Low-frequency noise rumble
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(3);
    const lp  = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 200;
    const nG  = this.ctx.createGain();
    nG.gain.setValueAtTime(0.5, now);
    nG.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    ns.connect(lp); lp.connect(nG); nG.connect(this.master);
    ns.start(now); ns.stop(now + 3);

    // Soft magma bubbling pops (quieter, fewer)
    for (let i = 0; i < 14; i++) {
      const delay = 0.5 + Math.random() * 6;
      const ns2   = this.ctx.createBufferSource();
      ns2.buffer  = this._noiseBuf(0.08);
      const bp    = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 400 + Math.random() * 600; bp.Q.value = 2;
      const g     = this.ctx.createGain();
      g.gain.setValueAtTime(0.07 + Math.random() * 0.08, this.ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.12);
      ns2.connect(bp); bp.connect(g); g.connect(this.master);
      ns2.start(this.ctx.currentTime + delay);
      ns2.stop(this.ctx.currentTime + delay + 0.15);
    }

    // Sustained lava drone (gentle)
    const osc  = this.ctx.createOscillator();
    osc.type   = 'sine'; osc.frequency.value = 32;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.10, now + 8);
    gain.gain.linearRampToValueAtTime(0, now + 12);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now + 0.5); osc.stop(now + 12);
  }

  // ── Wolf howl ────────────────────────────────────────────────
  _sfx_wolf_howl() {
    const now = this.ctx.currentTime;
    for (let w = 0; w < 3; w++) {
      const delay    = w * 4.5 + Math.random() * 1.2;
      const baseFreq = 260 + Math.random() * 70;

      const osc = this.ctx.createOscillator();
      osc.type  = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.linearRampToValueAtTime(baseFreq * 2.7, now + delay + 1.4);
      osc.frequency.setValueAtTime(baseFreq * 2.7, now + delay + 2.0);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + delay + 3.1);

      // Vibrato
      const vib  = this.ctx.createOscillator();
      const vibG = this.ctx.createGain();
      vib.frequency.value = 5.5 + Math.random(); vibG.gain.value = 10;
      vib.connect(vibG); vibG.connect(osc.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.20, now + delay + 0.25);
      gain.gain.setValueAtTime(0.20, now + delay + 2.3);
      gain.gain.linearRampToValueAtTime(0, now + delay + 3.3);

      osc.connect(gain); gain.connect(this.master);
      osc.start(now + delay); osc.stop(now + delay + 3.5);
      vib.start(now + delay); vib.stop(now + delay + 3.5);
    }
  }

  // ── 4a. Earthquake — seismic rumble ─────────────────────────
  _sfx_earthquake() {
    const now = this.ctx.currentTime;

    const osc  = this.ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.setValueAtTime(18, now);
    osc.frequency.linearRampToValueAtTime(32, now + 3);
    osc.frequency.linearRampToValueAtTime(18, now + 6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 7);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 7);

    // Noise rattle
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(7);
    const lp  = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 130;
    const nG  = this.ctx.createGain();
    nG.gain.setValueAtTime(0, now);
    nG.gain.linearRampToValueAtTime(0.45, now + 0.5);
    nG.gain.linearRampToValueAtTime(0, now + 7);
    ns.connect(lp); lp.connect(nG); nG.connect(this.master);
    ns.start(now); ns.stop(now + 7);
  }

  // ── 4b. Lightning crack ──────────────────────────────────────
  _sfx_lightning() {
    const now = this.ctx.currentTime;
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(0.9);
    const bp  = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(9000, now);
    bp.frequency.exponentialRampToValueAtTime(180, now + 0.35);
    bp.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(2.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    ns.connect(bp); bp.connect(gain); gain.connect(this.master);
    ns.start(now); ns.stop(now + 0.9);
  }

  // ── 5. Ice fall — shatter + frozen wind ─────────────────────
  _sfx_ice_fall() {
    const now = this.ctx.currentTime;

    // Crystal ping rain
    for (let i = 0; i < 35; i++) {
      const delay = Math.random() * 6;
      const freq  = 1800 + Math.random() * 7000;
      const osc   = this.ctx.createOscillator();
      osc.type    = 'sine'; osc.frequency.value = freq;
      const g     = this.ctx.createGain();
      g.gain.setValueAtTime(0.28, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
      osc.connect(g); g.connect(this.master);
      osc.start(now + delay); osc.stop(now + delay + 0.6);
    }

    // Icy wind howl
    const ns  = this.ctx.createBufferSource();
    ns.buffer = this._noiseBuf(9);
    const hp  = this.ctx.createBiquadFilter();
    hp.type   = 'highpass'; hp.frequency.value = 2200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 2);
    gain.gain.linearRampToValueAtTime(0.1, now + 8);
    gain.gain.linearRampToValueAtTime(0, now + 10);
    ns.connect(hp); hp.connect(gain); gain.connect(this.master);
    ns.start(now); ns.stop(now + 10);
  }

  // ── 6. Snow — gentle wind + soft ambience ───────────────────
  _sfx_snow() {
    const now  = this.ctx.currentTime;
    const ns   = this.ctx.createBufferSource();
    ns.buffer  = this._noiseBuf(16);
    const bp   = this.ctx.createBiquadFilter();
    bp.type    = 'bandpass'; bp.frequency.value = 250; bp.Q.value = 0.3;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 4);
    gain.gain.linearRampToValueAtTime(0.09, now + 12);
    gain.gain.linearRampToValueAtTime(0, now + 16);
    ns.connect(bp); bp.connect(gain); gain.connect(this.master);
    ns.start(now); ns.stop(now + 16);

    // Soft bells (wind chime)
    for (let i = 0; i < 12; i++) {
      const delay = 2 + Math.random() * 10;
      const freq  = 800 + Math.random() * 2400;
      const osc   = this.ctx.createOscillator();
      osc.type    = 'sine'; osc.frequency.value = freq;
      const g     = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.5);
      osc.connect(g); g.connect(this.master);
      osc.start(now + delay); osc.stop(now + delay + 1.8);
    }
  }

  // ── 7. Black hole — deep warping singularity ─────────────────
  _sfx_blackhole() {
    const now = this.ctx.currentTime;

    // Primary drone — falls in pitch as it grows
    const osc1  = this.ctx.createOscillator();
    osc1.type   = 'sine';
    osc1.frequency.setValueAtTime(55, now);
    osc1.frequency.exponentialRampToValueAtTime(12, now + 14);
    const g1    = this.ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.7, now + 2);
    g1.gain.linearRampToValueAtTime(0.7, now + 10);
    g1.gain.linearRampToValueAtTime(0, now + 15);
    osc1.connect(g1); g1.connect(this.master);
    osc1.start(now); osc1.stop(now + 15);

    // Distorted sawtooth grinding layer
    const osc2  = this.ctx.createOscillator();
    osc2.type   = 'sawtooth';
    osc2.frequency.setValueAtTime(55, now);
    osc2.frequency.exponentialRampToValueAtTime(12, now + 14);
    const clip  = this._clipper(8);
    const g2    = this.ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.18, now + 3);
    g2.gain.linearRampToValueAtTime(0, now + 15);
    osc2.connect(clip); clip.connect(g2); g2.connect(this.master);
    osc2.start(now); osc2.stop(now + 15);

    // Pulsing LFO on the main gain
    const lfo   = this.ctx.createOscillator();
    const lfG   = this.ctx.createGain();
    lfo.frequency.value = 0.6; lfG.gain.value = 0.25;
    lfo.connect(lfG); lfG.connect(g1.gain);
    lfo.start(now); lfo.stop(now + 15);

    // Tearing high-frequency texture
    const ns    = this.ctx.createBufferSource();
    ns.buffer   = this._noiseBuf(14);
    const hp    = this.ctx.createBiquadFilter();
    hp.type     = 'highpass'; hp.frequency.value = 3000;
    const ng    = this.ctx.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(0.06, now + 4);
    ng.gain.linearRampToValueAtTime(0, now + 15);
    ns.connect(hp); hp.connect(ng); ng.connect(this.master);
    ns.start(now); ns.stop(now + 15);
  }

  // ── 7b. Black hole — drone captures — horror sting ──────────
  _sfx_blackhole_capture() {
    const now  = this.ctx.currentTime;

    // Reversed-rising screech
    const osc  = this.ctx.createOscillator();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 4);
    const clip = this._clipper(10);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(1.5, now + 3);
    gain.gain.linearRampToValueAtTime(0, now + 4.5);
    osc.connect(clip); clip.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 5);
  }

  // ── 8. Aliens — FM theremin ──────────────────────────────────
  _sfx_aliens() {
    const now = this.ctx.currentTime;

    const carrier   = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain   = this.ctx.createGain();
    carrier.type    = 'sine';
    carrier.frequency.setValueAtTime(520, now);
    carrier.frequency.linearRampToValueAtTime(260, now + 10);
    modulator.type  = 'sine';
    modulator.frequency.setValueAtTime(260, now);
    modulator.frequency.linearRampToValueAtTime(130, now + 10);
    modGain.gain.value = 380;

    modulator.connect(modGain); modGain.connect(carrier.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 1.2);
    gain.gain.linearRampToValueAtTime(0.2,  now + 10);
    gain.gain.linearRampToValueAtTime(0,    now + 12);

    carrier.connect(gain); gain.connect(this.master);
    carrier.start(now);   carrier.stop(now + 12);
    modulator.start(now); modulator.stop(now + 12);
  }

  // ── 9. Monsters — zombie groans ─────────────────────────────
  _sfx_monsters() {
    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const delay   = i * 1.4 + Math.random() * 0.6;
      const base    = 75 + Math.random() * 45;
      const osc     = this.ctx.createOscillator();
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(base, now + delay);
      osc.frequency.linearRampToValueAtTime(base * 1.25, now + delay + 0.3);
      osc.frequency.linearRampToValueAtTime(base * 0.65, now + delay + 1.0);

      // AM tremolo for rattle effect
      const lfo   = this.ctx.createOscillator();
      const lfG   = this.ctx.createGain();
      lfo.frequency.value = 3.5 + Math.random() * 2; lfG.gain.value = 25;
      lfo.connect(lfG); lfG.connect(osc.frequency);

      const gain  = this.ctx.createGain();
      gain.gain.setValueAtTime(0,    now + delay);
      gain.gain.linearRampToValueAtTime(0.32, now + delay + 0.12);
      gain.gain.linearRampToValueAtTime(0,    now + delay + 1.3);

      osc.connect(gain); gain.connect(this.master);
      osc.start(now + delay);  osc.stop(now + delay + 1.4);
      lfo.start(now + delay);  lfo.stop(now + delay + 1.4);
    }
  }
}

// ── Singleton export ───────────────────────────────────────────
export const audio = new AudioSystem();
