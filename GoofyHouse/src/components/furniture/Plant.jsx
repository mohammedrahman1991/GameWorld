export default function Plant() {
  return (
    <group>
      {/* Pot */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.4, 12]} />
        <meshStandardMaterial color="#c87941" />
      </mesh>
      {/* Dirt */}
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 12]} />
        <meshStandardMaterial color="#4a2800" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshStandardMaterial color="#2d8a30" />
      </mesh>
      <mesh position={[0.1, 0.95, 0.05]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#3aaa3e" />
      </mesh>
      <mesh position={[-0.08, 0.88, -0.08]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#228822" />
      </mesh>
    </group>
  )
}
