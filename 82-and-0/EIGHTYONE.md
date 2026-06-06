# 82 Season — Design Document

## Concept
Build a legendary NBA roster from any team + decade combo, then simulate a full 82-game season. Based on real player history stats and ratings.

## Flow
1. **Setup** — Pick Team (30 NBA franchises) + Era (1960s–2010s), or hit SPIN
2. **Roster** — Half-court view with 5 position slots (PG, SG, SF, PF, C). Search players by name.
3. **Simulate** — Animated 82-game season simulation with progress
4. **Results** — W-L record, letter grade (F TANKING → A+ DYNASTY), player stat cards, team totals, Share

## SPIN
Clicking SPIN animates both Team + Era cards like slot machines — cycling rapidly then landing on random values.

## Player Data
~250 classic NBA players (1960s–2010s) each with:
- Name, position, teams, era
- Career stats: PPG, RPG, APG, SPG, BPG
- Overall rating 0–100 (drives season simulation)

## Season Simulation
- Team strength = weighted average of 5 player ratings + superstar bonus
- Rating → W-L formula with variance
- Grades: A+ DYNASTY (70+ W) → F TANKING (<20 W)

## Files
- `index.html` — complete game
- `EIGHTYONE.md` — this file
