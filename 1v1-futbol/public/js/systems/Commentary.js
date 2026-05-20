class Commentary {
  constructor() {
    this._synth  = window.speechSynthesis || null;
    this._voice  = null;
    this._ready  = false;
    if (this._synth) {
      const load = () => {
        const voices = this._synth.getVoices();
        this._voice = voices.find(v => /samantha|karen|daniel|moira|aaron|zoe/i.test(v.name) && /en/i.test(v.lang))
                   || voices.find(v => /en[-_]US/i.test(v.lang) && !/google/i.test(v.name))
                   || voices.find(v => /en/i.test(v.lang)) || null;
        this._ready = true;
      };
      this._synth.addEventListener('voiceschanged', load);
      load();
    }
  }

  _say(text, pitch = 1.1, rate = 1.0) {
    if (!this._synth) return;
    this._synth.cancel();
    const u    = new SpeechSynthesisUtterance(text);
    u.pitch    = pitch;
    u.rate     = rate + (Math.random() * 0.08 - 0.04);
    u.volume   = 1;
    if (this._voice) u.voice = this._voice;
    this._synth.speak(u);
  }

  goal(scorer) {
    const lines = scorer === 'messai' ? [
      "GOOOOAL! Messai with the finish! Incredible!",
      "GOAL! Messai scores! Look at those feet!",
      "GOOOOAL! The little magician does it again!",
      "YES! Messai puts it away! Beautiful goal!",
    ] : [
      "GOOOOAL! Ronalda with an absolute ROCKET!",
      "GOAL! Ronalda scores! What power!",
      "GOOOOAL! Ronalda buries it! Unstoppable!",
      "BOOM! Ronalda with the power shot! In the back of the net!",
    ];
    this._say(this._pick(lines), 1.25, 1.15);
  }

  miss() {
    const lines = [
      "Off the post! So close!",
      "Just wide! He will not believe that!",
      "Over the bar! What a shame!",
      "Saved by... well, there is no keeper. Still missed though.",
      "That is going to haunt them. Miles off target.",
    ];
    this._say(this._pick(lines), 1.05, 0.95);
  }

  tackle(by) {
    const lines = [
      "TACKLE! Ball stolen clean!",
      "Great defending! Took it right off their feet!",
      "Dispossessed! Turnover!",
      by === 'ronalda' ? "Ronalda with the challenge! Ball won!" : "Messai nips in and takes it!",
    ];
    this._say(this._pick(lines), 1.1, 1.05);
  }

  dribble() {
    const lines = [
      "Look at those feet! What a dribble!",
      "He just walked past them like they were not even there!",
      "You cannot tackle what you cannot catch!",
    ];
    this._say(this._pick(lines), 1.08, 1.0);
  }

  kickoff() {
    this._say("Welcome to 1 v 1 Futbol! Let's play!", 1.1, 1.0);
  }

  halftime() {
    this._say("That is the whistle! What a half of football!", 1.1, 0.95);
  }

  finalWhistle(winner) {
    const name = winner === 'messai' ? 'Messai' : 'Ronalda';
    this._say(`Full time! ${name} wins the match! What a performance!`, 1.1, 0.95);
  }

  _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
}
