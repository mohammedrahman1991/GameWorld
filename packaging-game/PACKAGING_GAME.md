# Packaging Game — Design Document

## Concept
3D city delivery game. Accept orders on your phone, pack the item into a box,
drive your van through a living city, then walk your character to the front door
to deliver the package and collect your pay.

---

## Files
```
packaging-game/
  index.html        — HTML shell + CSS + HUD + overlays
  game.js           — Three.js 3D game logic
  PACKAGING_GAME.md — this file
```

---

## Game Flow

```
ORDER SCREEN → PACK → DRIVE → DELIVER → REWARD → next ORDER
```

| State    | What happens |
|----------|--------------|
| ORDER    | Phone shows customer, item, destination, pay |
| PACK     | Click "Pack Item" to load box into van |
| DRIVE    | Drive van (WASD) to destination — follow GPS line |
| DELIVER  | Exit van (E), walk character to door (WASD), press E |
| REWARD   | Money earned shown, next order |

---

## Controls

| Action | Key |
|--------|-----|
| Drive (gas / brake) | W / S or Arrow Up / Down |
| Steer | A / D or Arrow Left / Right |
| Speed boost | Shift |
| Exit / enter van | E |
| Walk character | W A S D |

---

## City Layout

- 5×5 road grid (roads at x/z: −120, −60, 0, 60, 120)
- Road width: 12 units
- Block size: ~48×48 units between roads
- Random buildings per block (2–5, varying height/color)
- Trees at block corners
- 10 moving cars on roads (5 horizontal, 5 vertical)

### Delivery Locations (5 total)

| # | Name | Color |
|---|------|-------|
| 0 | Blue House  | Blue |
| 1 | Red Store   | Red  |
| 2 | Green Villa | Green |
| 3 | Yellow Café | Yellow |
| 4 | Purple Shop | Purple |

### Warehouse (van spawn)
- Center of map (x=0, z=0)

---

## Orders (repeating cycle of 7)

| Customer | Item | Pay |
|----------|------|-----|
| Jake     | Books     | $25 |
| Sarah    | Console   | $40 |
| Mike     | Flowers   | $20 |
| Emma     | Pizza     | $15 |
| Tom      | Medicine  | $30 |
| Lisa     | Phone     | $50 |
| Alex     | Toy Bear  | $22 |

---

## 3D Scene

- **Ground**: green plane 400×400
- **Roads**: gray planes with yellow centre line
- **Buildings**: colored boxes, random heights 5–28 units, castShadow
- **Trees**: sphere canopy on cylinder trunk
- **Van**: yellow box + cab + wheels, third-person camera
- **Character**: blocky humanoid (blue shirt), walks on foot
- **Package box**: brown cardboard box, sits on van roof / in character's hands
- **Moving cars**: 10 colored cars looping around road grid
- **Destination beacon**: glowing colored column + spinning star at target house

---

## HUD Elements

| Element | Position | Shows |
|---------|----------|-------|
| Money | Top-left | 💵 $total |
| State label | Top-center | current phase |
| Phone | Bottom-left | order details |
| Mini-map (GPS) | Top-right | city overview, van dot, route line |
| Pack button | Bottom-right | during PACK phase |
| Deliver button | Bottom-right | when at door |
| Hint bar | Bottom-center | context-sensitive controls |
