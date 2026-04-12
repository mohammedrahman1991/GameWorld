// AABB overlap check: ax/az = center, aw/ad = full width/depth
export function overlaps(ax, az, aw, ad, bx, bz, bw, bd) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(az - bz) < (ad + bd) / 2
}

export function isInsideBounds(x, z, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

// Check if a position is blocked by any placed item
export function isBlocked(x, z, itemSize, placedItems, furnitureSizes, excludeId = null) {
  return placedItems.some((item) => {
    if (item.id === excludeId) return false
    const size = furnitureSizes[item.type] || { w: 1, d: 1 }
    return overlaps(x, z, itemSize.w, itemSize.d, item.position[0], item.position[2], size.w, size.d)
  })
}
