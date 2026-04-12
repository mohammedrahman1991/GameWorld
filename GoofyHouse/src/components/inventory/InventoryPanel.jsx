import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const FLOOR_ITEMS = [
  { type: 'chair',     label: 'Chair',     emoji: '🪑' },
  { type: 'light',     label: 'Lamp',      emoji: '💡' },
  { type: 'clock',     label: 'Clock',     emoji: '🕐' },
  { type: 'plant',     label: 'Plant',     emoji: '🌿' },
  { type: 'fridge',    label: 'Fridge',    emoji: '🧊' },
  { type: 'fan',       label: 'Fan',       emoji: '🌀' },
  { type: 'painting',  label: 'Painting',  emoji: '🖼️' },
  { type: 'glass',     label: 'Glass',     emoji: '🪟' },
  { type: 'staircase', label: 'Staircase', emoji: '🪜' },
]

const MATERIALS = ['tile', 'carpet', 'wood', 'concrete']
const COLORS = {
  tile:     ['#f0f0f0', '#fffde0', '#111111', '#c87941', '#4488cc', '#aaaaaa'],
  carpet:   ['#cc2222', '#2255cc', '#999999', '#d4a870', '#33aa44', '#442222'],
  wood:     ['#d4a870', '#7a4020', '#a0622a', '#e8d090', '#5c3010', '#c8b090'],
  concrete: ['#bbbbbb', '#888888', '#444444', '#d4c090', '#f0eeee', '#708090'],
}

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: '#2a2a3a', border: '1px solid #555',
  borderRadius: 6, padding: '8px 12px',
  color: '#fff', fontSize: 13, cursor: 'pointer', width: '100%',
}

export default function InventoryPanel() {
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const setActivePaint = useGameStore((s) => s.setActivePaint)
  const exitPaintMode = useGameStore((s) => s.exitPaintMode)
  const paintMode = useGameStore((s) => s.paintMode)
  const activeMaterial = useGameStore((s) => s.activeMaterial)
  const activeColor = useGameStore((s) => s.activeColor)
  const [tab, setTab] = useState('items')
  const [selectedMaterial, setSelectedMaterial] = useState('tile')

  const tabBtn = (id, label) => (
    <button
      onClick={() => { setTab(id); if (id === 'items') exitPaintMode() }}
      style={{
        flex: 1, padding: '6px 0', fontSize: 12, cursor: 'pointer',
        background: tab === id ? '#3a3a6a' : '#1a1a2a',
        color: '#fff', border: 'none', borderBottom: tab === id ? '2px solid #8888ff' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: 210, height: '100%',
      background: 'rgba(20, 20, 30, 0.92)',
      borderLeft: '1px solid #444',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {tabBtn('items', 'Items')}
        {tabBtn('floor', 'Floor')}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tab === 'items' && (
          <>
            <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
              Click to place · R=rotate · Esc=cancel
            </div>
            {FLOOR_ITEMS.map(({ type, label, emoji }) => (
              <button key={type} style={btnStyle}
                onClick={() => setHeldItem({ type })}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a5a' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a3a' }}
              >
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </>
        )}

        {tab === 'floor' && (
          <>
            <div style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
              {paintMode ? '🖌 Paint mode — click floor tiles' : 'Pick material + color'}
            </div>

            {/* Material picker */}
            <div style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>Material</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
              {MATERIALS.map((m) => (
                <button key={m} onClick={() => { setSelectedMaterial(m) }}
                  style={{
                    ...btnStyle,
                    justifyContent: 'center',
                    background: selectedMaterial === m ? '#3a5a8a' : '#2a2a3a',
                    border: selectedMaterial === m ? '1px solid #6688cc' : '1px solid #555',
                    fontSize: 12, padding: '6px',
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Color swatches */}
            <div style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>Color</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
              {(COLORS[selectedMaterial] || []).map((color) => (
                <div
                  key={color}
                  onClick={() => setActivePaint(selectedMaterial, color)}
                  title={color}
                  style={{
                    width: '100%', aspectRatio: '1',
                    background: color,
                    borderRadius: 3, cursor: 'pointer',
                    border: activeColor === color && activeMaterial === selectedMaterial
                      ? '2px solid #fff' : '2px solid transparent',
                  }}
                />
              ))}
            </div>

            {paintMode && (
              <button
                onClick={exitPaintMode}
                style={{ ...btnStyle, marginTop: 12, justifyContent: 'center', background: '#5a2a2a' }}
              >
                ✕ Exit Paint Mode
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
