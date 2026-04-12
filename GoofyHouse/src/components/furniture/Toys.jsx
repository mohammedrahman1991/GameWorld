export default function Toys() {
  return (
    <group>
      {/* Stacked colorful blocks */}
      <mesh position={[-0.15, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      <mesh position={[0.15, 0.15, 0.1]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#44aaff" />
      </mesh>
      <mesh position={[0, 0.35, -0.1]} castShadow>
        <boxGeometry args={[0.25, 0.25, 0.25]} />
        <meshStandardMaterial color="#ffdd44" />
      </mesh>
      {/* Small ball */}
      <mesh position={[0.2, 0.12, -0.2]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ff88cc" />
      </mesh>
    </group>
  )
}
