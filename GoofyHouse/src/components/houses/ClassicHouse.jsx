export default function ClassicHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#d4906a' : '#c07850'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#cc8860' : '#b87048'} />
      </mesh>
      {/* Pitched roof */}
      <mesh position={[0, 3.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.5, 1.5, 2.2]} />
        <meshStandardMaterial color="#7a3f20" />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.6, 4.0, -0.4]} castShadow>
        <boxGeometry args={[0.3, 1.0, 0.3]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {/* Porch columns */}
      <mesh position={[-0.5, 0.4, 1.1]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
        <meshStandardMaterial color="#f0e0d0" />
      </mesh>
      <mesh position={[0.5, 0.4, 1.1]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 8]} />
        <meshStandardMaterial color="#f0e0d0" />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.9, 1.01]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 2.4, 1.01]}>
        <boxGeometry args={[0.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 1.01]}>
        <boxGeometry args={[0.4, 0.6, 0.02]} />
        <meshStandardMaterial color="#5c2e00" />
      </mesh>
      {hovered && (
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[2.1, 3.7, 2.1]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
