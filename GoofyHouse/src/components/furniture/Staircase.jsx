// Staircase: series of steps going up in Z direction
export default function Staircase() {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, i * 0.25 + 0.125, i * 0.5 - 0.75]} castShadow>
          <boxGeometry args={[1.5, 0.25, 0.5]} />
          <meshStandardMaterial color="#c8a060" />
        </mesh>
      ))}
      {/* Handrail left */}
      <mesh position={[-0.68, 0.6, 0]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 2.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Handrail right */}
      <mesh position={[0.68, 0.6, 0]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 2.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
    </group>
  )
}
