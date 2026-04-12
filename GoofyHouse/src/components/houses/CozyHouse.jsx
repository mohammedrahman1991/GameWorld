export default function CozyHouse({ hovered }) {
  return (
    <group>
      {/* Ground floor */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.8, 1.3, 1.8]} />
        <meshStandardMaterial color={hovered ? '#c8a882' : '#b5895a'} />
      </mesh>
      {/* 2nd floor */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[1.8, 1.3, 1.8]} />
        <meshStandardMaterial color={hovered ? '#c0a070' : '#a87848'} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.1, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[1.3, 1.3, 2.0]} />
        <meshStandardMaterial color="#5c4020" />
      </mesh>
      {/* Round windows floor 1 */}
      <mesh position={[-0.4, 0.8, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.4, 0.8, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Round windows floor 2 */}
      <mesh position={[0, 2.1, 0.91]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.6} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 0.91]}>
        <boxGeometry args={[0.38, 0.6, 0.02]} />
        <meshStandardMaterial color="#3d1f00" />
      </mesh>
      {/* Flower box */}
      <mesh position={[0, 0.5, 1.0]}>
        <boxGeometry args={[0.8, 0.12, 0.15]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.62, 1.0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={['#ff6688', '#ffdd44', '#ff4466'][i]} />
        </mesh>
      ))}
      {hovered && (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1.9, 3.1, 1.9]} />
          <meshStandardMaterial color="#00aaff" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  )
}
