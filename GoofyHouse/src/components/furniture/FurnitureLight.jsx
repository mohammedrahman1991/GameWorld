export default function FurnitureLight() {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.3, 0.4, 16, 1, true]} />
        <meshStandardMaterial color="#f5e08a" side={2} />
      </mesh>
      {/* Light source */}
      <pointLight position={[0, 1.5, 0]} intensity={1.5} distance={5} color="#ffe8a0" />
    </group>
  )
}
