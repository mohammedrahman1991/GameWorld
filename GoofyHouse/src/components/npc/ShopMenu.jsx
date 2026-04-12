import { useState } from 'react'
import useGameStore from '../../store/useGameStore'

const SHOP_ITEMS = [
  { type: 'toys',     label: 'Toys',     emoji: '🧸' },
  { type: 'backpack', label: 'Backpack', emoji: '🎒' },
  { type: 'mop',      label: 'Mop',      emoji: '🧹' },
  { type: 'jacket',   label: 'Jacket',   emoji: '🧥' },
]

const btnStyle = {
  background: '#2a3a5a',
  border: '1px solid #555',
  borderRadius: 6,
  color: '#fff',
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  gap: 10,
}

export default function ShopMenu() {
  const setShopOpen = useGameStore((s) => s.setShopOpen)
  const setHeldItem = useGameStore((s) => s.setHeldItem)
  const [showItems, setShowItems] = useState(false)

  const buy = (type) => {
    setHeldItem({ type })
    setShopOpen(false)
    setShowItems(false)
  }

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 15, 10, 0.95)',
      border: '2px solid #8b6914', borderRadius: 10,
      padding: 24, minWidth: 280,
      fontFamily: 'sans-serif', color: '#fff', zIndex: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        🛒 Shop
      </div>

      {!showItems ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={btnStyle} onClick={() => setShowItems(true)}>
            What do you sell?
          </button>
          <button style={{ ...btnStyle, background: '#3a2a20' }} onClick={() => setShopOpen(false)}>
            Bye
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>Pick an item to place:</div>
          {SHOP_ITEMS.map(({ type, label, emoji }) => (
            <button key={type} style={btnStyle} onClick={() => buy(type)}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              {label}
            </button>
          ))}
          <button style={{ ...btnStyle, background: '#333', marginTop: 8 }} onClick={() => setShowItems(false)}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
