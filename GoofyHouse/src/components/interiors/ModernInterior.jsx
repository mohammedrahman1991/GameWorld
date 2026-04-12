// Wall segments arranged around 10 window holes.
// Each wall = top strip + bottom strip + side segments between holes.
// Holes are at x: -2, 0, 2 (front/back) and z: -1.5, 1.5 (left/right), all at y=1.5.

const MAT = '#e8e8e8'
const LEFT_MAT = '#e0e0e0'

export default function ModernInterior() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f5f5f5" side={2} />
      </mesh>

      {/* ── Front wall (z=5) — holes at x=-2, 0, 2 ── */}
      {/* Top strip above holes */}
      <mesh position={[0, 2.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Bottom strip below holes */}
      <mesh position={[0, 0.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left segment x=-5 to x=-2.5 */}
      <mesh position={[-3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Between hole f1 and f2: x=-1.5 to x=-0.5 */}
      <mesh position={[-1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Between hole f2 and f3: x=0.5 to x=1.5 */}
      <mesh position={[1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Right segment x=2.5 to x=5 */}
      <mesh position={[3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>

      {/* ── Back wall (z=-5) — holes at x=-2, 0, 2 ── */}
      <mesh position={[0, 2.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>

      {/* ── Left wall (x=-5) — holes at z=-1.5, z=1.5 ── */}
      <mesh position={[-5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[-5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Front segment z=2.5 to z=5 */}
      <mesh position={[-5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Between holes z=-0.5 to z=0.5 */}
      <mesh position={[-5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      {/* Back segment z=-5 to z=-2.5 */}
      <mesh position={[-5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>

      {/* ── Right wall (x=5) — holes at z=-1.5, z=1.5 ── */}
      <mesh position={[5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
      <mesh position={[5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={LEFT_MAT} /></mesh>
    </group>
  )
}
