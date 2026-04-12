// Pre-defined window hole positions per house type.
// position: [x, y, z] center of hole. wall: which wall the hole is in.
export const WINDOW_HOLES = {
  modern: [
    { id: 'f1', wall: 'front', position: [-2,   1.5,  5.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.5,  5.05] },
    { id: 'f3', wall: 'front', position: [ 2,   1.5,  5.05] },
    { id: 'b1', wall: 'back',  position: [-2,   1.5, -5.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.5, -5.05] },
    { id: 'b3', wall: 'back',  position: [ 2,   1.5, -5.05] },
    { id: 'l1', wall: 'left',  position: [-5.05, 1.5, -1.5] },
    { id: 'l2', wall: 'left',  position: [-5.05, 1.5,  1.5] },
    { id: 'r1', wall: 'right', position: [ 5.05, 1.5, -1.5] },
    { id: 'r2', wall: 'right', position: [ 5.05, 1.5,  1.5] },
  ],
  classic: [
    { id: 'f1', wall: 'front', position: [-2,   1.5,  5.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.5,  5.05] },
    { id: 'f3', wall: 'front', position: [ 2,   1.5,  5.05] },
    { id: 'b1', wall: 'back',  position: [-2,   1.5, -5.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.5, -5.05] },
    { id: 'b3', wall: 'back',  position: [ 2,   1.5, -5.05] },
    { id: 'l1', wall: 'left',  position: [-5.05, 1.5, -1.5] },
    { id: 'l2', wall: 'left',  position: [-5.05, 1.5,  1.5] },
    { id: 'r1', wall: 'right', position: [ 5.05, 1.5, -1.5] },
    { id: 'r2', wall: 'right', position: [ 5.05, 1.5,  1.5] },
  ],
  cozy: [
    { id: 'f1', wall: 'front', position: [-1.5, 1.4,  4.05] },
    { id: 'f2', wall: 'front', position: [ 0,   1.4,  4.05] },
    { id: 'f3', wall: 'front', position: [ 1.5, 1.4,  4.05] },
    { id: 'b1', wall: 'back',  position: [-1.5, 1.4, -4.05] },
    { id: 'b2', wall: 'back',  position: [ 0,   1.4, -4.05] },
    { id: 'b3', wall: 'back',  position: [ 1.5, 1.4, -4.05] },
    { id: 'l1', wall: 'left',  position: [-4.05, 1.4, -1  ] },
    { id: 'l2', wall: 'left',  position: [-4.05, 1.4,  1  ] },
    { id: 'r1', wall: 'right', position: [ 4.05, 1.4, -1  ] },
    { id: 'r2', wall: 'right', position: [ 4.05, 1.4,  1  ] },
  ],
}

// Wall normal vectors (inward-facing, for rotation calc)
export const WALL_NORMALS = {
  front: [0, 0, -1],
  back:  [0, 0,  1],
  left:  [1, 0,  0],
  right: [-1, 0, 0],
}

// Rotation (Y axis) for glass pane to face into room per wall
export const WALL_ROTATIONS = {
  front: 0,
  back:  Math.PI,
  left:  Math.PI / 2,
  right: -Math.PI / 2,
}

export function getWindowKey(houseType, holeId, floor) {
  return `${houseType}_${holeId}_${floor}`
}

export function getHoleById(houseType, holeId) {
  return (WINDOW_HOLES[houseType] || []).find((h) => h.id === holeId)
}
