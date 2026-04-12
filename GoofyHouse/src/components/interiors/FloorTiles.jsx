import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const MATERIAL_COLORS = {
  tile:     { base: '#e0e0e0' },
  carpet:   { base: '#c0a080' },
  wood:     { base: '#a0622a' },
  concrete: { base: '#999999' },
}

// Renders a 10x10 grid of 1x1 floor tiles for a given floor index.
// houseType affects grid size: modern/classic=10x10, cozy=8x8
export default function FloorTiles({ houseType, floorIndex }) {
  const floorTiles = useGameStore((s) => s.floorTiles)
  const paintMode = useGameStore((s) => s.paintMode)
  const activeMaterial = useGameStore((s) => s.activeMaterial)
  const activeColor = useGameStore((s) => s.activeColor)
  const setFloorTile = useGameStore((s) => s.setFloorTile)

  const [hoveredKey, setHoveredKey] = useState(null)

  const size = houseType === 'cozy' ? 8 : 10
  const half = size / 2
  const tiles = []

  for (let xi = 0; xi < size; xi++) {
    for (let zi = 0; zi < size; zi++) {
      const x = xi - half + 0.5
      const z = zi - half + 0.5
      const key = `${floorIndex}_${Math.round(x)}_${Math.round(z)}`
      const tileData = floorTiles[key]
      const isHovered = hoveredKey === key

      tiles.push(
        <mesh
          key={key}
          position={[x, 0.001, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerOver={() => paintMode && setHoveredKey(key)}
          onPointerOut={() => setHoveredKey(null)}
          onClick={() => {
            if (!paintMode) return
            setFloorTile(floorIndex, Math.round(x), Math.round(z), activeMaterial, activeColor)
          }}
        >
          <planeGeometry args={[0.98, 0.98]} />
          <meshStandardMaterial
            color={tileData ? tileData.color : (houseType === 'modern' ? '#d0d0d0' : houseType === 'classic' ? '#a0622a' : '#c8a060')}
            emissive={isHovered && paintMode ? activeColor : '#000000'}
            emissiveIntensity={isHovered && paintMode ? 0.4 : 0}
          />
        </mesh>
      )
    }
  }

  return <group>{tiles}</group>
}
