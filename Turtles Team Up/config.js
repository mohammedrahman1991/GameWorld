// config.js — ADD YOUR ELEVENLABS API KEY BELOW
// This file is gitignored — never commit your key

export const ELEVENLABS_API_KEY = '';

// Using the same voice ID for all characters — add more from elevenlabs.io to differentiate
export const VOICE_IDS = {
  rico:   '21m00Tcm4TlvDq8ikWAM',
  razz:   '21m00Tcm4TlvDq8ikWAM',
  munchy: '21m00Tcm4TlvDq8ikWAM',
  dex:    '21m00Tcm4TlvDq8ikWAM',
  boomer: '21m00Tcm4TlvDq8ikWAM',
  slicer: '21m00Tcm4TlvDq8ikWAM',
};

export const CHARACTERS = {
  rico: {
    id: 'rico',
    name: 'Rico',
    color: 0x3b82f6,
    cssColor: '#3b82f6',
    speed: 220,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 22,
    specialName: 'Shadow Slash',
    voiceId: VOICE_IDS.rico,
    lines: {
      intro:   'We fight as one.',
      special: 'Shadow Slash!',
      hit:     'Tch.',
      win:     'Discipline wins every time.',
    },
  },
  razz: {
    id: 'razz',
    name: 'Razz',
    color: 0xef4444,
    cssColor: '#ef4444',
    speed: 280,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 20,
    specialName: 'Rage Rush',
    voiceId: VOICE_IDS.razz,
    lines: {
      intro:   "You wanna go?! COME ON!",
      special: 'RAGE RUSH!',
      hit:     "That's IT, you're DEAD!",
      win:     "Yeah! YEAH! THAT'S WHAT I'M TALKING ABOUT!",
    },
  },
  munchy: {
    id: 'munchy',
    name: 'Munchy',
    color: 0xfb923c,
    cssColor: '#fb923c',
    speed: 230,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 21,
    specialName: 'Pizza Time',
    voiceId: VOICE_IDS.munchy,
    lines: {
      intro:   "Dude... can we fight after I finish this slice?",
      special: 'PIZZA TIIIIME!',
      hit:     'Ow... worth it.',
      win:     'Victory tastes like pepperoni.',
      random:  "IT'S PIZZA TIME!",
    },
  },
  dex: {
    id: 'dex',
    name: 'Dex',
    color: 0xa855f7,
    cssColor: '#a855f7',
    speed: 190,
    jumpVelocity: -520,
    lightDamage: 5,
    heavyDamage: 12,
    specialDamage: 25,
    specialName: 'Static Shock',
    voiceId: VOICE_IDS.dex,
    lines: {
      intro:   'Statistically, you never had a chance.',
      special: 'Static Shock — initiated.',
      hit:     'Fascinating. That hurt.',
      win:     'As calculated.',
    },
  },
  boomer: {
    id: 'boomer',
    name: 'Boomer',
    color: 0x22c55e,
    cssColor: '#22c55e',
    speed: 200,
    jumpVelocity: -540,
    lightDamage: 7,
    heavyDamage: 16,
    specialDamage: 30,
    specialName: 'Mega Kick',
    voiceId: VOICE_IDS.boomer,
    lines: {
      intro:   "G'day! Time to kick some tail!",
      special: "MEGA KICK — CRIKEY!",
      hit:     'Crikey that stings!',
      win:     "Beauty! Back in the pouch, mate.",
    },
  },
  slicer: {
    id: 'slicer',
    name: 'Slicer',
    color: 0xdc2626,
    cssColor: '#dc2626',
    speed: 290,
    jumpVelocity: -530,
    lightDamage: 6,
    heavyDamage: 11,
    specialDamage: 22,
    specialName: 'Shurikan Storm',
    voiceId: VOICE_IDS.slicer,
    lines: {
      intro:   'You call that a fighting stance?',
      special: 'Shurikan Storm!',
      hit:     'You got lucky.',
      win:     'Pathetic. As expected.',
    },
  },
};

export const CHARACTER_ORDER = ['rico', 'razz', 'munchy', 'dex', 'boomer', 'slicer'];

export const BOOMER = {
  voiceId: VOICE_IDS.boomer,
  wisdomLines: [
    'A raccoon who rushes in... gets hit first.',
    'Patience, young dumpster diver.',
    'The trash heap of life holds many treasures.',
    'Strike with purpose. Eat pizza with passion.',
    'Your enemy is fast. Your mind must be faster.',
  ],
};

export const SLICER = {
  voiceId: VOICE_IDS.slicer,
  tauntLines: [
    'You call that fighting?',
    'Pathetic. Even for raccoons.',
    "Next time I won't hold back.",
  ],
};

export const GAME = {
  width: 900,
  height: 500,
  groundY: 420,
  roundTime: 60,
  maxRounds: 3,
  winsNeeded: 2,
  pizzaTimerMin: 8000,
  pizzaTimerMax: 15000,
};
