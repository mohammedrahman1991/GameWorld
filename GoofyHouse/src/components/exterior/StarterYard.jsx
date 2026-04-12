// Pre-built decorative yard. Not editable by the player.
// Ground at y = -0.05, path from door (z=5) to yard edge (z=14).
// 6 grass patches scattered on ground. Low fence around perimeter.

const GRASS_PATCHES = [
  [-8,  0,  -6],
  [ 8,  0,  -6],
  [-8,  0,   6],
  [ 9,  0,   6],
  [-6,  0, -10],
  [ 7,  0, -10],
]

export default function StarterYard() {
  return (
    <group>
      {/* Main ground plane 30×30 */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[30, 0.1, 30]} />
        <meshStandardMaterial color="#4a8c3f" />
      </mesh>

      {/* Path: 1-unit wide grey strip from door to yard edge */}
      <mesh position={[0, -0.02, 9.5]} receiveShadow>
        <boxGeometry args={[1.2, 0.06, 9]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* 6 dark green grass patches */}
      {GRASS_PATCHES.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[2, 0.08, 2]} />
          <meshStandardMaterial color="#2d6e28" />
        </mesh>
      ))}

      {/* Perimeter fence — 4 sides, low box strips */}
      {/* Front fence (gap in middle for path) */}
      <mesh position={[-7.5, 0.2, 15]} castShadow>
        <boxGeometry args={[15, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      <mesh position={[7.5, 0.2, 15]} castShadow>
        <boxGeometry args={[15, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Back fence */}
      <mesh position={[0, 0.2, -15]} castShadow>
        <boxGeometry args={[30, 0.4, 0.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Left fence */}
      <mesh position={[-15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.4, 30]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>

      {/* Right fence */}
      <mesh position={[15, 0.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.4, 30]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
    </group>
  )
}
