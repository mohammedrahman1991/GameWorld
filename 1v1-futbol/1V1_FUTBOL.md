# 1 v 1 Futbol — Game Design Document

## Concept
A 1v1 soccer game inspired by Noah's Game (basketball). Same Phaser 3 engine,
same perspective field view, same shot-meter mechanic — but adapted for football.
First to **5 goals** wins, or most goals after **3 minutes**.

---

## Files
```
1v1-futbol/
  public/
    index.html
    js/
      config.js               — all constants (field, goals, speeds, stats)
      main.js                 — Phaser game init
      entities/
        Player.js             — base player class (movement, drawing, controls)
        Messai.js             — Player 1: blue/white Argentina jersey, #10
        Ronalda.js            — Player 2: red jersey, blonde hair, #7
        Ball.js               — soccer ball (arc physics, dribble bounce)
      scenes/
        TitleScene.js         — title + player select screen
        GameScene.js          — main gameplay loop
        GameOverScene.js      — winner + final score
      systems/
        ShotMeter.js          — power bar (hold to charge, release to kick)
        Commentary.js         — Web Speech API commentary
      ui/
        HUD.js                — scoreboard, timer, controls legend
        ScorePop.js           — floating "GOAL!" animation
  server.js                   — optional Express TTS backend
  package.json
  1V1_FUTBOL.md               — this file
```

---

## Players

### Messai (#10) — Player 1
| Attribute | Value | Notes                        |
|-----------|-------|------------------------------|
| Pace      | 97    | Explosive speed              |
| Shooting  | 94    | Accurate finisher            |
| Dribbling | 99    | Best in game                 |
| Tackle    | 65    | Weak defensively             |

- **Look:** short male, dark curly hair, blue & white vertical stripes (Argentina), black shorts, black cleats
- **Special:** curved shots — if meter >90%, ball bends slightly
- **Controls:** WASD move · G kick · T dribble burst · F fake shot · R bicycle kick

### Ronalda (#7) — Player 2
| Attribute | Value | Notes                       |
|-----------|-------|-----------------------------|
| Pace      | 93    | Strong and fast             |
| Shooting  | 97    | Most powerful shot          |
| Dribbling | 87    | Skillful                    |
| Tackle    | 78    | Better defender             |

- **Look:** tall female, long blonde hair, red jersey, red shorts, white cleats
- **Special:** power shot — meter at 100% adds 20% accuracy bonus + camera shake
- **Controls:** Arrow keys move · / kick · . dribble burst · , fake shot · M power shot

---

## Field Layout (Perspective Trapezoid)

```
         farLeft(185,135) ─────── farRight(775,135)
              │    [ LEFT GOAL ]         [ RIGHT GOAL ]   │
nearLeft(65,425) ─────────────────────────────── nearRight(895,425)
```

- **Left Goal** — center (118, 278) — Ronalda defends, Messai attacks
- **Right Goal** — center (842, 278) — Messai defends, Ronalda attacks
- **Center circle** — (480, 280), radius 70px
- **Penalty boxes** — L: x 155–295, R: x 665–805 (y 195–365)
- **Perspective scale** — 0.68 at top (y=135) → 1.0 at bottom (y=425)

---

## Shooting Mechanic

Same as Noah's Game shot meter:
1. Hold kick key → power meter fills (0→100% in 1050ms)
2. Release → calculate accuracy
3. Ball arc toward goal (650ms tween, height -130)
4. Goal check: if ball end position within 50px of goal center → GOAL
5. Miss: ball shoots wide/high based on accuracy roll

### Accuracy Formula
```
base     = shootingStat / 99                   // 0.0–1.0
meter    = meterScore × 0.56                   // 0–0.56 bonus
zone     = closeRange ? +0.12 : longRange ? -0.18 : 0
accuracy = clamp(0, 1, base × 0.5 + meter + zone)
```

### Shot Types
| Type       | Trigger                              | Base Accuracy |
|------------|--------------------------------------|---------------|
| Normal     | Hold + release (any distance)        | Formula above |
| Close shot | Within 90px of goal                  | +0.12 bonus   |
| Long range | Beyond 220px from goal               | -0.18 penalty |
| Bicycle    | R/M while airborne (unused here)     | 85% base      |

---

## Tackling / Stealing

- Defender presses kick within 62px of attacker
- Chance = `(tackleStat / 99) × 0.44`
- Success → ball stolen, commentary plays
- Fail → attacker keeps ball, brief stun blocked

---

## Scoring & Win Conditions

- **Goal** — ball arc ends within 50px of goal center
- **5 goals** → instant win (game over screen)
- **3 minutes** → most goals wins; tie = sudden death minute

---

## Commentary Lines (Web Speech API)

**Goal — Messai:** "GOOOOAL! Messai scores! What a finish!"
**Goal — Ronalda:** "GOOOOAL! Ronalda with the power shot! Unbelievable!"
**Miss:** "Off the post!", "Just wide!", "Over the bar!", "Goalkeeper would not have saved that... but there is no goalkeeper."
**Tackle:** "Great tackle!", "Stripped! Ball stolen!"
**Dribble past:** "Look at those feet! What a move!", "Nobody can stop Messai when she gets going!" 
**Kick-off:** "The match is underway!", "Welcome to 1 v 1 Futbol!"

---

## Visual Style

- **Field:** Rich green gradient, crisp white lines, perspective trapezoid
- **Goals:** White posts + crossbar, grey net with diagonal lines
- **Crowd:** Suggested background figures (no detail needed)
- **Advertising boards:** bottom edge colorful banners
- **Score effects:** Yellow "GOAL!" text floats up, camera shake, net ripple animation
- **Player sprites:** Phaser Graphics — jersey, shorts, boots, hair all drawn procedurally

---

## Based On
Noah's Game (basketball) — same engine, same mechanics, new sport.
