# Re sell — Game Design Spec

**Date:** 2026-04-05
**Status:** Approved

---

## Overview

Re sell is a browser-based kids game about buying cheap and selling high. The player controls a mysterious cloaked merchant who runs a sidewalk stall, negotiates with AI-powered bot customers, earns coins, and unlocks new item categories by exploring a storybook illustrated town.

The game is built with React (Vite), deployable as static files to any web host, and embeddable via `<iframe>` in any website.

---

## Game Loop

Three phases cycle continuously:

```
SHOP PHASE → SESSION END → WORLD MAP → back to SHOP PHASE
```

### Shop Phase
The stall is open. Bots walk up one at a time from the sidewalk. Each bot either offers a price or asks the merchant to name one. The player negotiates using a price slider. A patience meter above the bot's head drains in real time — if it empties, the bot walks away. Once all items in the current batch are sold (or the player closes the shop), the session ends.

### Session End Screen
Coin summary screen showing:
- Each item sold, its restock cost, and sell price
- Profit per item and total session profit
- New items auto-restocked for the next session (no manual buying required)

### World Map
A top-down illustrated storybook town. The merchant walks freely between locations. Locked zones appear dimmed with a padlock icon and coin requirement on hover.

---

## Shop Scene

**Visual setting:** A storybook illustrated sidewalk scene. A building facade with a storefront awning, illustrated trees lining the sidewalk, animated pedestrian NPCs walking past in the background (atmosphere only).

**Elements:**
- Wooden market stall center-screen displaying current inventory items
- Cloaked mysterious merchant standing behind the stall (player character)
- Bot customers walk in from the left or right, stop at the stall, and speak
- Speech bubble showing bot dialogue (OpenAI generated, ElevenLabs voiced)
- Patience meter bar above the bot's head, draining in real time
- Price slider UI at the bottom during negotiation
- Accept / Reject / Counter buttons
- Live coin counter top-right corner

---

## Items & Economy

Items grouped into unlockable categories:

| Category | Examples |
|---|---|
| Gems | Diamond, Ruby, Sapphire, Emerald, Moissanite |
| Metals | Gold bar, Silver bar |
| Resources | Oil barrel |
| Stocks | Tesla, Nvidia, Apple, Roblox (fictional in-game versions) |
| Weapons | Sword, Dagger, Spear |
| Mythical Weapons | Dragon blade, Shadow scythe, Phoenix bow, Titan hammer |
| Rocks & Minerals | Quartz, Obsidian, Geode, Coal |

**Economy rules:**
- Every item has a base value (market worth) and a restock cost (what the player paid)
- Bots offer 60–120% of base value randomly
- Profit = sell price minus restock cost
- Rare items command higher prices but attract fewer, pickier bots
- Base values shift slightly each session (simulated market fluctuation)

**Unlock milestones:**
| Coins | Unlock |
|---|---|
| 0 | Gems, Metals, Resources, Rocks & Minerals, Weapons (starter set) |
| 500 | Collector's Den — Mythical Weapons, Legendary Gems |
| 1000 | Stock Exchange — Tesla, Nvidia, Apple, Roblox stocks |
| 2500 | Black Market — mystery items, highest risk/reward |

---

## Bargaining System

Each bot interaction is randomly assigned one of two modes:

**Mode A — Bot Offers First**
Bot names a price. Player can Accept, Counter (drag slider to desired price), or Reject.

**Mode B — Bot Asks Your Price**
Bot asks what the player wants. Player names price via slider. Bot accepts, haggles back, or walks away.

**Negotiation rules:**
- Maximum 3 rounds of back-and-forth per bot
- After 3 rounds, bot either accepts the last offer or walks
- Patience meter drains faster each round
- If patience meter empties at any point, bot walks regardless of round count

**OpenAI integration:**
- GPT-4o generates each bot's dialogue line
- Bot personality (grumpy collector, excited kid, shady dealer, etc.) passed as system context
- Kid-friendly content filter applied to all responses
- No two conversations are identical

**ElevenLabs integration:**
- Every bot dialogue line is spoken aloud immediately after appearing in the speech bubble
- Voice: Charlie (kid-friendly male, casual young tone)
- ELEVENLABS_VOICE_ID updated from Rachel to Charlie in .env

---

## World Map

Illustrated storybook town with cobblestone streets, lanterns, and background market stalls. The merchant walks with a subtle cloak animation. NPCs wander streets for atmosphere.

| Location | Unlocked At | Function |
|---|---|---|
| Your Stall | Always | Start next shop session |
| The Market | Always | Preview next item batch and restock costs |
| The Vault | Always | Total coins, lifetime profit, items sold history |
| Collector's Den | 500 coins | Mythical weapons and legendary gems |
| Stock Exchange | 1000 coins | Tesla, Nvidia, Apple, Roblox stocks |
| Black Market | 2500 coins | Mystery items, highest risk/reward |

Locked locations: dimmed appearance, padlock icon, coin requirement shown on hover.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React + Vite | Component-based UI, fast dev, static build output |
| Styling | Tailwind CSS | Utility-first styling |
| Animation | Framer Motion | Bot walk-ins, speech bubbles, coin counter ticks |
| State | Zustand | Game state — inventory, coins, phase, unlocks |
| AI dialogue | OpenAI GPT-4o | Bot conversation generation |
| Voice | ElevenLabs TTS | Bot speech audio |
| Art | SVG layers | Storybook illustrated backgrounds and character sprites |

**Deployment:**
- `npm run build` produces a `dist/` folder — static files only
- Host on Vercel, Netlify, GitHub Pages, or any web server
- Embed in any website: `<iframe src="https://your-url.com" width="800" height="600" />`

**Environment variables (already in .env):**
- `OPENAI_API_KEY` — GPT-4o bot dialogue
- `ELEVENLABS_API_KEY` — text-to-speech
- `ELEVENLABS_VOICE_ID` — update to `IKne3meq5aSn9XLyUdCD` (Charlie, kid-friendly male)
- `PORT` — local dev server port

---

## Character

**The Merchant:** A cloaked mysterious figure. No face shown — silhouette with glowing eyes under a hood. Subtle idle animation (cloak sway). Reacts to good deals (brief celebratory gesture animation) and missed deals (shoulder shrug animation). These are purely visual — no effect on gameplay.

---

## Bot Types

| Bot | Personality | Behavior |
|---|---|---|
| Excited Kid | Enthusiastic, overpays | Often accepts high prices |
| Grumpy Collector | Skeptical, lowballs | Haggles hard, walks often |
| Shady Dealer | Mysterious, unpredictable | Wild offers, fast patience drain |
| Rich Shopper | Casual, generous | Rarely haggles, pays well |
| Bargain Hunter | Obsessive, very persistent | Always counters, 3 full rounds |
