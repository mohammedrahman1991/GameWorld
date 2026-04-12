const MAT = '#d4b896'
const SIDE_MAT = '#c8aa88'

export default function CozyInterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#c8a060" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#f0e8d8" side={2} />
      </mesh>
      {/* Front wall (z=4), holes at x=-1.5, 0, 1.5 */}
      <mesh position={[0, 2.3, 4]}><boxGeometry args={[8, 0.8, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.7, 4]}><boxGeometry args={[8, 0.8+0.6, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.25, 1.4, 4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-0.75, 1.4, 4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0.75, 1.4, 4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.25, 1.4, 4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Back wall (z=-4) */}
      <mesh position={[0, 2.3, -4]}><boxGeometry args={[8, 0.8, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.7, -4]}><boxGeometry args={[8, 1.4, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.25, 1.4, -4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-0.75, 1.4, -4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0.75, 1.4, -4]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.25, 1.4, -4]}><boxGeometry args={[1.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left wall (x=-4), holes at z=-1, 1 */}
      <mesh position={[-4, 2.3, 0]}><boxGeometry args={[0.1, 0.8, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, 3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-4, 1.4, -3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      {/* Right wall (x=4) */}
      <mesh position={[4, 2.3, 0]}><boxGeometry args={[0.1, 0.8, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 8]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, 3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[4, 1.4, -3]}><boxGeometry args={[0.1, 1, 2]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
    </group>
  )
}
