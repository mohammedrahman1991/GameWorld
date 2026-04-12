// ============================================================
//  AudioManager – procedural music + SFX + truck speech
//  Uses Web Audio API + SpeechSynthesis — no external files
// ============================================================
(function () {

    // ── Note frequency table ─────────────────────────────────
    const N = {
        REST:0,
        C2:65.4,  D2:73.4,  E2:82.4,  F2:87.3,  G2:98,   A2:110,  B2:123.5,
        C3:130.8, D3:146.8, E3:164.8, F3:174.6, G3:196,  A3:220,  B3:246.9,
        C4:261.6, D4:293.7, E4:329.6, F4:349.2, G4:392,  A4:440,  B4:493.9,
        C5:523.3, D5:587.3, E5:659.3, F5:698.5, G5:784,  A5:880,  B5:987.8,
        C6:1046.5,
    };

    // ── Music patterns ───────────────────────────────────────
    // Each pattern: [ [noteName, beats], ... ]  BPM drives timing
    const TRACKS = {
        menu: {
            bpm: 138, wave: 'square',
            melody: [
                ['C5',0.5],['E5',0.5],['G5',0.5],['E5',0.5],
                ['D5',0.5],['F5',0.5],['A5',0.5],['F5',0.5],
                ['E5',0.5],['G5',0.5],['C5',0.5],['E5',0.5],
                ['D5',0.5],['F5',0.5],['G5',1.0],
                ['G4',0.5],['A4',0.5],['B4',0.5],['C5',0.5],
                ['D5',0.5],['E5',0.5],['F5',0.5],['G5',0.5],
                ['A5',0.5],['G5',0.5],['E5',0.5],['C5',0.5],
                ['G4',0.5],['C5',0.5],['G4',1.0],
            ],
            bass: [
                ['C3',1],['F3',1],['G3',1],['C3',1],
                ['C3',1],['F3',1],['G3',1],['C3',1],
            ],
        },
        play: {
            bpm: 158, wave: 'square',
            melody: [
                ['G4',0.5],['B4',0.5],['D5',0.5],['B4',0.5],
                ['G4',0.5],['A4',0.5],['C5',0.5],['A4',0.5],
                ['G4',0.5],['D5',0.5],['B4',0.5],['G4',0.5],
                ['A4',0.5],['F4',0.5],['D4',1.0],
                ['E4',0.5],['G4',0.5],['B4',0.5],['G4',0.5],
                ['A4',0.5],['C5',0.5],['E5',0.5],['C5',0.5],
                ['B4',0.5],['G4',0.5],['A4',0.5],['D4',0.5],
                ['G4',1.0],['REST',0.5],['G4',0.5],
            ],
            bass: [
                ['G2',1],['C3',1],['D3',1],['G2',1],
                ['G2',1],['A2',1],['D3',1],['G2',1],
            ],
        },
        boss: {
            bpm: 178, wave: 'sawtooth',
            melody: [
                ['A4',0.25],['REST',0.25],['A4',0.25],['G4',0.25],
                ['A4',0.5], ['C5',0.5],
                ['G4',0.25],['REST',0.25],['G4',0.25],['F4',0.25],
                ['G4',0.5], ['A4',0.5],
                ['F4',0.25],['REST',0.25],['F4',0.25],['E4',0.25],
                ['F4',0.5], ['G4',0.5],
                ['E4',0.5], ['D4',0.5], ['C4',0.5],  ['E4',0.5],
                ['A3',1.0], ['REST',1.0],
            ],
            bass: [
                ['A2',0.5],['A2',0.5],['E3',0.5],['A2',0.5],
                ['G2',0.5],['G2',0.5],['D3',0.5],['G2',0.5],
                ['F2',0.5],['F2',0.5],['C3',0.5],['F2',0.5],
                ['E2',0.5],['A2',0.5],['E2',0.5],['A2',0.5],
            ],
        },
        win: {
            bpm: 152, wave: 'triangle',
            melody: [
                ['C5',0.5],['E5',0.5],['G5',0.5],['C5',0.25],['E5',0.25],
                ['G5',1.0], ['E5',0.25],['G5',0.25],
                ['A5',0.5], ['G5',0.5], ['F5',0.5],  ['E5',0.5],
                ['D5',0.5], ['F5',0.5], ['A5',1.0],
                ['G5',0.25],['A5',0.25],['G5',0.25],['F5',0.25],
                ['E5',0.5], ['C5',0.5], ['G5',0.5],  ['E5',0.5],
                ['F5',0.5], ['A5',0.5], ['C5',0.5],  ['D5',0.5],
                ['C5',2.0], ['REST',1.0],
            ],
            bass: [
                ['C3',1],['F3',1],['G3',1],['C3',1],
                ['C3',1],['F3',1],['G3',1],['C3',1],
            ],
        },
        gameover: {
            bpm: 72, wave: 'triangle',
            melody: [
                ['B4',0.5],['A4',0.5],['G4',0.5],['F4',0.5],
                ['E4',0.5],['D4',0.5],['C4',2.0],
                ['REST',2.0],
            ],
            bass: [],
        },
    };

    // ── AudioManager class ───────────────────────────────────
    class AudioManager {
        constructor() {
            this._ctx          = null;
            this._master       = null;
            this._currentTrack = null;
            this._melStep      = 0;
            this._bassStep     = 0;
            this._nextMelTime  = 0;
            this._nextBassTime = 0;
            this._timer        = null;
            this._voices       = [];
            this._lastSpeak    = 0;
            this._init();
        }

        _init() {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                this._ctx = new AC();
                this._master = this._ctx.createGain();
                this._master.gain.value = 0.26;
                this._master.connect(this._ctx.destination);
            } catch (e) { console.warn('AudioManager: Web Audio unavailable'); }

            if (window.speechSynthesis) {
                const load = () => { this._voices = speechSynthesis.getVoices(); };
                load();
                speechSynthesis.onvoiceschanged = load;
            }
        }

        // Call on first user gesture to unlock audio context
        resume() {
            if (this._ctx && this._ctx.state === 'suspended') {
                this._ctx.resume().then(() => {
                    // If a track was queued before context was ready, start it now
                    if (this._currentTrack && !this._timer) {
                        const t = TRACKS[this._currentTrack];
                        if (t) {
                            this._nextMelTime  = this._ctx.currentTime + 0.05;
                            this._nextBassTime = this._ctx.currentTime + 0.05;
                            this._runScheduler();
                        }
                    }
                });
            }
        }

        // Switch to a named music track (idempotent)
        playTrack(name) {
            if (this._currentTrack === name) return;
            this._stopTimer();
            this._currentTrack = name;
            this._melStep = 0;
            this._bassStep = 0;
            if (!this._ctx || !TRACKS[name]) return;
            this.resume();
            if (this._ctx.state === 'running') {
                this._nextMelTime  = this._ctx.currentTime + 0.06;
                this._nextBassTime = this._ctx.currentTime + 0.06;
                this._runScheduler();
            }
        }

        stopMusic() {
            this._stopTimer();
            this._currentTrack = null;
        }

        _stopTimer() {
            if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        }

        _runScheduler() {
            if (!this._currentTrack || !this._ctx) return;
            const track    = TRACKS[this._currentTrack];
            if (!track) return;
            const beat     = 60 / track.bpm;
            const lookAhead = 0.18;
            const now      = this._ctx.currentTime;

            // Melody
            while (this._nextMelTime < now + lookAhead) {
                const step = track.melody[this._melStep % track.melody.length];
                const freq = N[step[0]] || 0;
                const dur  = step[1] * beat;
                if (freq > 0) this._tone(freq, dur * 0.82, 0.16, track.wave, this._nextMelTime);
                this._nextMelTime += dur;
                this._melStep++;
                if (this._melStep >= track.melody.length) this._melStep = 0;
            }

            // Bass
            if (track.bass && track.bass.length) {
                while (this._nextBassTime < now + lookAhead) {
                    const step = track.bass[this._bassStep % track.bass.length];
                    const freq = N[step[0]] || 0;
                    const dur  = step[1] * beat;
                    if (freq > 0) this._tone(freq, dur * 0.65, 0.13, 'triangle', this._nextBassTime);
                    this._nextBassTime += dur;
                    this._bassStep++;
                    if (this._bassStep >= track.bass.length) this._bassStep = 0;
                }
            }

            this._timer = setTimeout(() => this._runScheduler(), 28);
        }

        // ── Single tone ──────────────────────────────────────
        _tone(freq, dur, vol, type, when) {
            if (!this._ctx) return;
            try {
                const osc = this._ctx.createOscillator();
                const env = this._ctx.createGain();
                osc.type = type || 'square';
                osc.frequency.value = freq;
                env.gain.setValueAtTime(0, when);
                env.gain.linearRampToValueAtTime(vol, when + 0.012);
                env.gain.setValueAtTime(vol, when + dur * 0.55);
                env.gain.exponentialRampToValueAtTime(0.001, when + dur);
                osc.connect(env);
                env.connect(this._master);
                osc.start(when);
                osc.stop(when + dur + 0.02);
            } catch (e) {}
        }

        // ── White noise burst ────────────────────────────────
        _noise(vol, dur, when) {
            if (!this._ctx) return;
            try {
                const sr  = this._ctx.sampleRate;
                const len = Math.ceil(sr * dur);
                const buf = this._ctx.createBuffer(1, len, sr);
                const d   = buf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
                const src = this._ctx.createBufferSource();
                const env = this._ctx.createGain();
                src.buffer = buf;
                env.gain.setValueAtTime(vol, when);
                env.gain.exponentialRampToValueAtTime(0.001, when + dur);
                src.connect(env);
                env.connect(this._master);
                src.start(when);
                src.stop(when + dur + 0.01);
            } catch (e) {}
        }

        // ── Sound effects ────────────────────────────────────
        sfx(type) {
            if (!this._ctx) return;
            this.resume();
            if (this._ctx.state !== 'running') return;
            const t = this._ctx.currentTime;
            switch (type) {
                case 'jump':
                    // Rising boing
                    this._tone(300, 0.07, 0.28, 'square', t);
                    this._tone(480, 0.07, 0.24, 'square', t + 0.07);
                    this._tone(720, 0.10, 0.20, 'square', t + 0.14);
                    break;
                case 'land':
                    this._tone(90, 0.14, 0.38, 'triangle', t);
                    this._noise(0.06, 0.08, t);
                    break;
                case 'shoot':
                    // Pew!
                    this._tone(900, 0.03, 0.28, 'square', t);
                    this._tone(600, 0.05, 0.22, 'square', t + 0.03);
                    this._tone(350, 0.07, 0.16, 'square', t + 0.08);
                    break;
                case 'hit':
                    // Ow!
                    this._noise(0.20, 0.18, t);
                    this._tone(160, 0.14, 0.32, 'sawtooth', t);
                    break;
                case 'heal':
                    // Sparkle chime
                    [523, 659, 784, 1047].forEach((f, i) => {
                        this._tone(f, 0.12, 0.28, 'triangle', t + i * 0.10);
                    });
                    break;
                case 'pop':
                    // Enemy squish
                    this._noise(0.10, 0.14, t);
                    this._tone(220, 0.10, 0.26, 'square', t);
                    this._tone(110, 0.10, 0.18, 'square', t + 0.05);
                    break;
                case 'bossHit':
                    this._tone(120, 0.10, 0.36, 'sawtooth', t);
                    this._noise(0.06, 0.10, t);
                    break;
                case 'bossDie':
                    [220, 165, 110, 82].forEach((f, i) => {
                        this._tone(f, 0.18, 0.35, 'sawtooth', t + i * 0.14);
                    });
                    this._noise(0.22, 0.55, t);
                    break;
                case 'winJingle':
                    [523, 659, 784, 1047, 1319].forEach((f, i) => {
                        this._tone(f, 0.18, 0.32, 'triangle', t + i * 0.11);
                    });
                    break;
            }
        }

        // ── Truck voice (SpeechSynthesis) ────────────────────
        speak(text) {
            if (!window.speechSynthesis) return;
            const now = Date.now();
            if (now - this._lastSpeak < 700) return; // debounce rapid calls
            this._lastSpeak = now;

            speechSynthesis.cancel(); // cut off previous utterance immediately

            const utt = new SpeechSynthesisUtterance(text);

            // Prefer a fun/unusual voice; fall back to any English
            const wantNames = ['Zarvox', 'Trinoids', 'Albert', 'Junior', 'Boing', 'Bubbles', 'Ralph', 'Fred'];
            let voice = null;
            for (const n of wantNames) {
                voice = this._voices.find(v => v.name.includes(n));
                if (voice) break;
            }
            if (!voice) voice = this._voices.find(v => v.lang && v.lang.startsWith('en'));
            if (voice) utt.voice = voice;

            utt.rate   = 1.35;  // peppy and fast
            utt.pitch  = 0.65;  // deep truck rumble
            utt.volume = 1.0;

            speechSynthesis.speak(utt);
        }
    }

    window.AUDIO = new AudioManager();
})();
