// Renders one exterior item by type as procedural Three.js geometry.
// Types: pinetree | flowerbed | lamppost | mailbox
export default function ExteriorItemMesh({ type }) {
  if (type === 'pinetree') {
    return (
      <group>
        {/* Trunk */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.2, 8]} />
          <meshStandardMaterial color="#6b3f1f" />
        </mesh>
        {/* Foliage layers — bottom to top */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <coneGeometry args={[1.0, 1.2, 8]} />
          <meshStandardMaterial color="#2d7a2d" />
        </mesh>
        <mesh position={[0, 2.7, 0]} castShadow>
          <coneGeometry args={[0.75, 1.0, 8]} />
          <meshStandardMaterial color="#359035" />
        </mesh>
        <mesh position={[0, 3.45, 0]} castShadow>
          <coneGeometry args={[0.5, 0.9, 8]} />
          <meshStandardMaterial color="#3da03d" />
        </mesh>
      </group>
    )
  }

  if (type === 'flowerbed') {
    const flowers = [
      [-0.5, 0, -0.3, '#ff4466'],
      [ 0.1, 0,  0.3, '#ffcc00'],
      [ 0.6, 0, -0.1, '#ff8800'],
      [-0.2, 0,  0.5, '#cc44ff'],
      [ 0.4, 0,  0.6, '#ff4466'],
      [-0.6, 0,  0.4, '#ffcc00'],
    ]
    return (
      <group>
        {/* Soil bed */}
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.16, 1.2]} />
          <meshStandardMaterial color="#5c3d1a" />
        </mesh>
        {/* Flower spheres */}
        {flowers.map(([x, y, z, color], i) => (
          <mesh key={i} position={[x, 0.35, z]} castShadow>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    )
  }

  if (type === 'lamppost') {
    return (
      <group>
        {/* Pole */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 3.0, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Lamp head */}
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.5]} />
          <meshStandardMaterial color="#444444" metalness={0.4} />
        </mesh>
        {/* Warm light glow bulb */}
        <mesh position={[0, 2.95, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#ffe080" emissive="#ffe080" emissiveIntensity={2} />
        </mesh>
        {/* Point light */}
        <pointLight position={[0, 2.9, 0]} intensity={1.2} distance={6} color="#ffe080" />
      </group>
    )
  }

  if (type === 'mailbox') {
    return (
      <group>
        {/* Post */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.0, 8]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        {/* Body */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.55, 0.4, 0.35]} />
          <meshStandardMaterial color="#2255bb" />
        </mesh>
        {/* Flag */}
        <mesh position={[0.32, 1.2, 0]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.02]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        <mesh position={[0.42, 1.32, 0]} castShadow>
          <boxGeometry args={[0.18, 0.14, 0.02]} />
          <meshStandardMaterial color="#dd2222" />
        </mesh>
      </group>
    )
  }

  return null
}
