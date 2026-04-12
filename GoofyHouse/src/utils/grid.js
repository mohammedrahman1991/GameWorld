export const GRID_SIZE = 1

export function snapToGrid(value) {
  return (Math.round(value / GRID_SIZE) * GRID_SIZE) || 0
}

export function snapPosition(x, z) {
  return [snapToGrid(x), 0, snapToGrid(z)]
}
