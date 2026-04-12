const MAT = '#e8d8c0'
const SIDE_MAT = '#ddd0b8'

export default function ClassicInterior() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#a0622a" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f5e8d0" side={2} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, 2.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, 5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, 5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, 5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Back wall */}
      <mesh position={[0, 2.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[0, 0.5, -5]}><boxGeometry args={[10, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[-1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[1, 1.5, -5]}><boxGeometry args={[1, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      <mesh position={[3.75, 1.5, -5]}><boxGeometry args={[2.5, 1, 0.1]} /><meshStandardMaterial color={MAT} /></mesh>
      {/* Left wall */}
      <mesh position={[-5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[-5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      {/* Right wall */}
      <mesh position={[5, 2.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 0.5, 0]}><boxGeometry args={[0.1, 1, 10]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, 3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, 0]}><boxGeometry args={[0.1, 1, 1]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
      <mesh position={[5, 1.5, -3.75]}><boxGeometry args={[0.1, 1, 2.5]} /><meshStandardMaterial color={SIDE_MAT} /></mesh>
    </group>
  )
}
