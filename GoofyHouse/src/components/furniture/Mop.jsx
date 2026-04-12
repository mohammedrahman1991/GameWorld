export default function Mop() {
  return (
    <group>
      {/* Handle */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
        <meshStandardMaterial color="#c8a060" />
      </mesh>
      {/* Mop head */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.15, 12]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      {/* Mop strands */}
      {[-0.1, 0, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.0, 0]} castShadow>
          <boxGeometry args={[0.04, 0.14, 0.3]} />
          <meshStandardMaterial color="#dddddd" />
        </mesh>
      ))}
    </group>
  )
}
