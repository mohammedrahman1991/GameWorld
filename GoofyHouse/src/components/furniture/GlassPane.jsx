export default function GlassPane() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 0.04]} />
      <meshStandardMaterial color="#7ec8e3" transparent opacity={0.45} />
    </mesh>
  )
}
