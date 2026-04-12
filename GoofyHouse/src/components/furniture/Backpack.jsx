export default function Backpack() {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.45, 0.55, 0.2]} />
        <meshStandardMaterial color="#3a5a8a" />
      </mesh>
      {/* Front pocket */}
      <mesh position={[0, 0.22, 0.11]}>
        <boxGeometry args={[0.38, 0.3, 0.04]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
      {/* Left strap */}
      <mesh position={[-0.14, 0.38, -0.07]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
      {/* Right strap */}
      <mesh position={[0.14, 0.38, -0.07]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a4a7a" />
      </mesh>
    </group>
  )
}
