export default function ModernHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#e0e0e0' : '#cccccc'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#d8d8d8' : '#c0c0c0'} />
      </mesh>
      {/* 3rd floor (smaller) */}
      <mesh position={[0.1, 3.5, 0]} castShadow>
        <boxGeometry args={[1.6, 1, 1.6]} />
        <meshStandardMaterial color={hovered ? '#d0d0d0' : '#b8b8b8'} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0.1, 4.08, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 1.8]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Windows floor 1 */}
      <mesh position={[0, 0.8, 1.01]}>
        <boxGeometry args={[1.2, 0.7, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Windows floor 2 */}
      <mesh position={[0, 2.3, 1.01]}>
        <boxGeometry args={[1.0, 0.6, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.35, 1.01]}>
        <boxGeometry args={[0.45, 0.7, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {hovered && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[2.1, 4.1, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
