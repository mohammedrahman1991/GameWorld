import ModernInterior from './ModernInterior'
import ClassicInterior from './ClassicInterior'
import CozyInterior from './CozyInterior'

export default function HouseInterior({ type }) {
  if (type === 'modern') return <ModernInterior />
  if (type === 'classic') return <ClassicInterior />
  if (type === 'cozy') return <CozyInterior />
  return null
}
