export default function Chair() {
  return (
    <group>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, 0.75, -0.31]} castShadow>
        <boxGeometry args={[0.7, 0.55, 0.07]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* 4 legs */}
      {[[-0.28, -0.28], [-0.28, 0.28], [0.28, -0.28], [0.28, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
          <meshStandardMaterial color="#5c3010" />
        </mesh>
      ))}
    </group>
  )
}
