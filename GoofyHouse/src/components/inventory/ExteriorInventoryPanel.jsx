import useGameStore from '../../store/useGameStore'

const ROOF_STYLES = [
  { value: 'flat',    label: 'Flat' },
  { value: 'pitched', label: 'Pitched' },
  { value: 'gabled',  label: 'Gabled' },
]

const ROOF_COLORS = [
  { hex: '#555555', label: 'Dark Grey' },
  { hex: '#cc2222', label: 'Red' },
  { hex: '#7a4a1e', label: 'Brown' },
  { hex: '#111111', label: 'Black' },
  { hex: '#2a6e2a', label: 'Green' },
  { hex: '#1e3a8a', label: 'Blue' },
  { hex: '#c4622d', label: 'Terracotta' },
  { hex: '#f0f0f0', label: 'White' },
]

const EXTERIOR_ITEMS = [
  { type: 'pinetree',  label: 'Pine Tree',  emoji: '\uD83C\uDF32' },
  { type: 'flowerbed', label: 'Flower Bed', emoji: '\uD83C\uDF38' },
  { type: 'lamppost',  label: 'Lamppost',   emoji: '\uD83D\uDCA1' },
  { type: 'mailbox',   label: 'Mailbox',    emoji: '\uD83D\uDCEC' },
]

export default function ExteriorInventoryPanel() {
  const roofStyle = useGameStore((s) => s.roofStyle)
  const roofColor = useGameStore((s) => s.roofColor)
  const setRoofStyle = useGameStore((s) => s.setRoofStyle)
  const setRoofColor = useGameStore((s) => s.setRoofColor)
  const setHeldItem = useGameStore((s) => s.setHeldItem)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 220, height: '100%',
      background: 'rgba(20, 20, 30, 0.92)',
      borderLeft: '1px solid #444',
      display: 'flex', flexDirection: 'column',
      padding: 16, gap: 8,
      fontFamily: 'sans-serif', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
        Exterior
      </div>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
        Click to place · R to rotate · Esc to cancel
      </div>

      {/* Roof Style */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>
        Roof Style
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {ROOF_STYLES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoofStyle(value)}
            style={{
              flex: 1, padding: '6px 4px',
              background: roofStyle === value ? '#4a6fa5' : '#2a2a3a',
              border: roofStyle === value ? '1px solid #88aaff' : '1px solid #555',
              borderRadius: 5, color: '#fff',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roof Color */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold', marginTop: 8 }}>
        Roof Color
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ROOF_COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            onClick={() => setRoofColor(hex)}
            style={{
              width: 30, height: 30,
              background: hex,
              border: roofColor === hex ? '2px solid #fff' : '2px solid #444',
              borderRadius: 4, cursor: 'pointer',
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />

      {/* Exterior Items */}
      <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold' }}>
        Items
      </div>
      {EXTERIOR_ITEMS.map(({ type, label, emoji }) => (
        <button
          key={type}
          onClick={() => setHeldItem({ type })}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#2a2a3a', border: '1px solid #555',
            borderRadius: 6, padding: '10px 12px',
            color: '#fff', fontSize: 14, cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a5a' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a3a' }}
        >
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
