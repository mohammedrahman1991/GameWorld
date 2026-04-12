import useGameStore from '../../store/useGameStore'

// Roof sits at y=3, always visible in both interior and exterior modes.
// flat:    single slab
// pitched: two angled panels meeting at a ridge
// gabled:  pitched + two triangular end caps
export default function Roof() {
  const roofStyle = useGameStore((s) => s.roofStyle)
  const roofColor = useGameStore((s) => s.roofColor)

  const mat = <meshStandardMaterial color={roofColor} />

  if (roofStyle === 'flat') {
    return (
      <mesh position={[0, 3.15, 0]} castShadow>
        <boxGeometry args={[10.4, 0.3, 10.4]} />
        {mat}
      </mesh>
    )
  }

  if (roofStyle === 'pitched') {
    // Two panels angled 30° meeting at the ridge
    return (
      <group position={[0, 3, 0]}>
        {/* Left panel */}
        <mesh position={[-2.5, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
          <boxGeometry args={[5.8, 0.25, 10.4]} />
          {mat}
        </mesh>
        {/* Right panel */}
        <mesh position={[2.5, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
          <boxGeometry args={[5.8, 0.25, 10.4]} />
          {mat}
        </mesh>
      </group>
    )
  }

  // gabled: pitched + triangular end caps
  return (
    <group position={[0, 3, 0]}>
      {/* Left panel */}
      <mesh position={[-2.5, 0.9, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[5.8, 0.25, 10.4]} />
        {mat}
      </mesh>
      {/* Right panel */}
      <mesh position={[2.5, 0.9, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <boxGeometry args={[5.8, 0.25, 10.4]} />
        {mat}
      </mesh>
      {/* Front gable end cap */}
      <mesh position={[0, 0.85, 5.2]} castShadow>
        <boxGeometry args={[10.4, 1.7, 0.25]} />
        {mat}
      </mesh>
      {/* Back gable end cap */}
      <mesh position={[0, 0.85, -5.2]} castShadow>
        <boxGeometry args={[10.4, 1.7, 0.25]} />
        {mat}
      </mesh>
    </group>
  )
}
