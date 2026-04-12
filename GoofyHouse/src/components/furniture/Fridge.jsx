export default function Fridge() {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.9, 1.8, 0.7]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Door seam */}
      <mesh position={[0, 0.55, 0.36]}>
        <boxGeometry args={[0.88, 0.02, 0.02]} />
        <meshStandardMaterial color="#aaa" />
      </mesh>
      {/* Upper door handle */}
      <mesh position={[0.3, 1.1, 0.37]}>
        <boxGeometry args={[0.06, 0.25, 0.05]} />
        <meshStandardMaterial color="#999" />
      </mesh>
      {/* Lower door handle */}
      <mesh position={[0.3, 0.35, 0.37]}>
        <boxGeometry args={[0.06, 0.2, 0.05]} />
        <meshStandardMaterial color="#999" />
      </mesh>
    </group>
  )
}
