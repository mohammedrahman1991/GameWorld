// src/data/bots.ts
export type BotType =
  | 'alex'
  | 'emma'
  | 'old-greg'
  | 'marcus'
  | 'sofia'
  | 'jake'
  | 'maria'
  | 'tyler'
  | 'lily'
  | 'sam'
  | 'noah'
  | 'sara'

export interface BotConfig {
  type: BotType
  displayName: string
  emoji: string
  color: string
  personality: string
  patienceDuration: number
  patienceDrainMultiplier: number
  acceptanceThreshold: number   // fraction of baseValue they'll pay
  offerBias: number             // fraction of baseValue they initially offer
}

export const BOT_CONFIGS: BotConfig[] = [
  {
    type: 'alex',
    displayName: 'Alex',
    emoji: '👦',
    color: '#FF9F43',
    personality: 'You are Alex, an enthusiastic 12-year-old who loves collecting cool stuff. You get excited easily. Casual, energetic speech. Under 12 words. Family-friendly.',
    patienceDuration: 22,
    patienceDrainMultiplier: 0.8,
    acceptanceThreshold: 1.2,
    offerBias: 1.0,
  },
  {
    type: 'emma',
    displayName: 'Emma',
    emoji: '👧',
    color: '#fd79a8',
    personality: 'You are Emma, a curious girl who loves shiny and sparkly things. Cheerful and sweet. Under 12 words. Family-friendly.',
    patienceDuration: 25,
    patienceDrainMultiplier: 0.7,
    acceptanceThreshold: 1.25,
    offerBias: 1.05,
  },
  {
    type: 'old-greg',
    displayName: 'Old Greg',
    emoji: '👴',
    color: '#6C5CE7',
    personality: 'You are Old Greg, a grumpy retired collector. You think every price is too high. Curt and skeptical. Under 12 words. Family-friendly.',
    patienceDuration: 11,
    patienceDrainMultiplier: 1.5,
    acceptanceThreshold: 0.72,
    offerBias: 0.6,
  },
  {
    type: 'marcus',
    displayName: 'Marcus',
    emoji: '🧑',
    color: '#00B894',
    personality: 'You are Marcus, a friendly young man who likes a good deal. Relaxed but smart about prices. Under 12 words. Family-friendly.',
    patienceDuration: 28,
    patienceDrainMultiplier: 0.9,
    acceptanceThreshold: 1.0,
    offerBias: 0.85,
  },
  {
    type: 'sofia',
    displayName: 'Sofia',
    emoji: '👩',
    color: '#a29bfe',
    personality: 'You are Sofia, a warm and polite woman who shops for gifts. Kind and reasonable. Under 12 words. Family-friendly.',
    patienceDuration: 30,
    patienceDrainMultiplier: 0.65,
    acceptanceThreshold: 1.15,
    offerBias: 1.0,
  },
  {
    type: 'jake',
    displayName: 'Jake',
    emoji: '🧒',
    color: '#55efc4',
    personality: 'You are Jake, a cool teenager who tries to act like he knows everything about prices. Confident slang. Under 12 words. Family-friendly.',
    patienceDuration: 15,
    patienceDrainMultiplier: 1.2,
    acceptanceThreshold: 0.9,
    offerBias: 0.75,
  },
  {
    type: 'maria',
    displayName: 'Maria',
    emoji: '👵',
    color: '#fdcb6e',
    personality: 'You are Maria, a sweet grandmother who buys things for her grandchildren. Very patient and kind. Under 12 words. Family-friendly.',
    patienceDuration: 35,
    patienceDrainMultiplier: 0.5,
    acceptanceThreshold: 1.3,
    offerBias: 1.1,
  },
  {
    type: 'tyler',
    displayName: 'Tyler',
    emoji: '🕵️',
    color: '#2D3436',
    personality: 'You are Tyler, a sneaky trader who always tries to lowball. Mysterious and vague. Under 12 words. Family-friendly.',
    patienceDuration: 10,
    patienceDrainMultiplier: 1.7,
    acceptanceThreshold: 0.85,
    offerBias: 0.62,
  },
  {
    type: 'lily',
    displayName: 'Lily',
    emoji: '👩‍🦰',
    color: '#e17055',
    personality: 'You are Lily, obsessed with finding bargains. You always negotiate hard. Urgent and enthusiastic. Under 12 words. Family-friendly.',
    patienceDuration: 32,
    patienceDrainMultiplier: 1.0,
    acceptanceThreshold: 0.78,
    offerBias: 0.6,
  },
  {
    type: 'sam',
    displayName: 'Sam',
    emoji: '🤑',
    color: '#00cec9',
    personality: 'You are Sam, a wealthy collector who does not care about price. Confident and generous. Under 12 words. Family-friendly.',
    patienceDuration: 20,
    patienceDrainMultiplier: 0.6,
    acceptanceThreshold: 1.4,
    offerBias: 1.15,
  },
  {
    type: 'noah',
    displayName: 'Noah',
    emoji: '🤩',
    color: '#FDCB6E',
    personality: 'You are Noah, an absolutely thrilled and hyper kid who gets SUPER excited about everything in the shop. Use lots of excitement and energy. Under 12 words. Family-friendly.',
    patienceDuration: 28,
    patienceDrainMultiplier: 0.7,
    acceptanceThreshold: 1.35,
    offerBias: 1.1,
  },
  {
    type: 'sara',
    displayName: 'Sara',
    emoji: '😭',
    color: '#a29bfe',
    personality: 'You are Sara, who cries a lot over everything. You cry when prices are high and cry when you\'re happy. Very emotional and dramatic. Under 12 words. Family-friendly.',
    patienceDuration: 18,
    patienceDrainMultiplier: 1.1,
    acceptanceThreshold: 1.2,
    offerBias: 0.8,
  },
]

export function randomBot(): BotConfig {
  return BOT_CONFIGS[Math.floor(Math.random() * BOT_CONFIGS.length)]
}
