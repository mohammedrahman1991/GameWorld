const STYLES = [
  { bg: '#1a3a6e', accent: '#f0c040' },
  { bg: '#5a1a1a', accent: '#40c0a0' },
  { bg: '#1a4a1a', accent: '#e080c0' },
]

function pickStyle(position) {
  const hash = Math.abs(Math.round((position[0] ?? 0) * 7 + (position[2] ?? 0) * 13)) % STYLES.length
  return STYLES[hash]
}

export default function Painting({ position = [0, 0, 0] }) {
  const style = pickStyle(position)
  return (
    <group>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[1.0, 0.75, 0.05]} />
        <meshStandardMaterial color="#5c3010" />
      </mesh>
      {/* Canvas background */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.88, 0.63, 0.01]} />
        <meshStandardMaterial color={style.bg} />
      </mesh>
      {/* Abstract shape */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.4, 0.35, 0.01]} />
        <meshStandardMaterial color={style.accent} />
      </mesh>
    </group>
  )
}
