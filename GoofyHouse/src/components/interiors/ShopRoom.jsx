// Pre-decorated 3rd floor shop room — shelves, counter, displayed items
export default function ShopRoom() {
  return (
    <group>
      {/* Back shelf unit */}
      <mesh position={[0, 1.0, -4.5]} castShadow>
        <boxGeometry args={[8, 2, 0.4]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      {/* Shelf planks */}
      {[0.4, 1.0, 1.6].map((y, i) => (
        <mesh key={i} position={[0, y, -4.25]}>
          <boxGeometry args={[7.8, 0.06, 0.35]} />
          <meshStandardMaterial color="#a07820" />
        </mesh>
      ))}
      {/* Left shelf unit */}
      <mesh position={[-4.5, 1.0, 0]} castShadow>
        <boxGeometry args={[0.4, 2, 7]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      {/* Counter */}
      <mesh position={[0, 0.55, 1.5]} castShadow>
        <boxGeometry args={[3, 1.1, 0.8]} />
        <meshStandardMaterial color="#5c3010" />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 1.11, 1.5]}>
        <boxGeometry args={[3.1, 0.06, 0.9]} />
        <meshStandardMaterial color="#7a4020" />
      </mesh>
      {/* Sign above counter */}
      <mesh position={[0, 2.4, -0.5]}>
        <boxGeometry args={[2.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#f5e08a" />
      </mesh>
    </group>
  )
}
