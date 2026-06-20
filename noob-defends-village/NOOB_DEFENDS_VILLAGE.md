# Noob Defends The Village

## Overview
Minecraft-style 2D top-down village defense game. The noob defends villagers from waves of mobs.

## Screens
1. **Title** — Minecraft background, PLAY GAME + COMMUNITY buttons
2. **Loading** — Progress bar with tips
3. **Hub (Village Room)** — Indoor stone-floor room with wooden walls, villager NPCs, two yellow carpets
4. **Battle Arena** — Outdoor area, fight incoming mob waves
5. **Shop** — Right yellow carpet: buy weapons and armor (very cheap)
6. **Inventory** — E key: see equipped weapons and armor
7. **Wave Clear** — Villagers come back alive, return to hub
8. **Game Over** — Play again button

## Controls
| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move |
| Mouse | Aim / Look around |
| Left Click | Attack (sword swing) |
| Right Click | Place / break block |
| E | Open Inventory |
| Near carpet + E | Open Shop (right carpet) / Go Fight (left carpet) |

## Two Yellow Carpets in Hub
- **LEFT carpet** → Go to the battle arena and fight mobs
- **RIGHT carpet** → Open the shop

## Weapons (very cheap)
| Weapon | Cost | Damage | Range |
|--------|------|--------|-------|
| Wood Sword | FREE | 1 | 50px |
| Stone Sword | 1g | 3 | 55px |
| Iron Sword | 2g | 5 | 58px |
| Golden Sword | 3g | 7 | 58px |
| Diamond Sword | 5g | 10 | 62px |
| Enchanted Sword | 8g | 15 | 68px |

## Armor (very cheap)
| Set | Cost/piece | Defense/piece |
|-----|------------|--------------|
| Leather | 1g | +1 |
| Iron | 2g | +2 |
| Diamond | 4g | +4 |

## Enemies (all weak)
| Mob | HP | Damage | Speed | Gold |
|-----|----|--------|-------|------|
| Zombie | 8 | 1 | 1.0 | 2g |
| Skeleton | 12 | 2 | 1.3 | 3g |
| Spider | 6 | 1 | 2.0 | 1g |
| Creeper | 10 | 15 (explosion) | 1.0 | 5g |

## Wave Scaling
- Wave 1: 5 zombies
- Wave 2: 7 zombies + 2 skeletons
- Wave 3: 8 zombies + 4 skeletons + 2 spiders
- Wave 4+: Scales up; creepers added from wave 3

## Day/Night Cycle
- Game automatically cycles day → night → day (~90 seconds)
- Night: dark blue overlay + stars
- Villagers: always lit with warm glow even at night

## Village Houses (in battle arena background)
Three types visible:
1. **Wood Frame House** — oak planks + cobblestone foundation + log corner pillars
2. **Big Wood+Stone House** — stone base + dark log pillars + large glass windows
3. **Stone Tower** — full cobblestone with battlements on top

## File Structure
```
noob-defends-village/
  NOOB_DEFENDS_VILLAGE.md
  index.html
  game.js
```
