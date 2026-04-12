export default function Jacket() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.15]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Left sleeve */}
      <mesh position={[-0.42, 0.45, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.14]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Right sleeve */}
      <mesh position={[0.42, 0.45, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.14]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.18]} />
        <meshStandardMaterial color="#a93226" />
      </mesh>
      {/* Zipper line */}
      <mesh position={[0, 0.45, 0.08]}>
        <boxGeometry args={[0.04, 0.65, 0.01]} />
        <meshStandardMaterial color="#888" />
      </mesh>
    </group>
  )
}
