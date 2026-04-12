export default function WallClock() {
  return (
    <group>
      {/* Clock face */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} />
        <meshStandardMaterial color="#f5f0e0" />
      </mesh>
      {/* Rim */}
      <mesh>
        <torusGeometry args={[0.28, 0.04, 8, 24]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Hour hand */}
      <mesh position={[0, 0.1, 0.04]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.04, 0.16, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0.06, 0.08, 0.04]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.03, 0.22, 0.02]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}
