/**
 * TokenMeter — shows live token balance in the sidebar.
 * Used in Layout.jsx to replace the old daily-limit bars.
 */
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

const fmt = n => (n ?? 0).toLocaleString()
const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'
const RED     = '#ff6b6b'
const WARN_THRESHOLD = 2_000   // show warning below this

export default function TokenMeter() {
  const { user } = useStore()
  const navigate  = useNavigate()
  const balance   = user?.tokens_balance ?? 0
  const purchased = user?.tokens_purchased ?? 0
  const maxDisplay = purchased > 0 ? purchased : 10_000
  const pct        = Math.min(100, (balance / maxDisplay) * 100)
  const isLow      = balance < WARN_THRESHOLD
  const barColor   = isLow ? RED : balance < 5_000 ? '#f59e0b' : ACCENT2

  return (
    <div style={{
      margin: '12px 16px',
      padding: '14px 16px',
      background: isLow ? 'rgba(255,107,107,0.06)' : 'rgba(0,212,170,0.04)',
      border: `1px solid ${isLow ? 'rgba(255,107,107,0.2)' : 'rgba(0,212,170,0.15)'}`,
      borderRadius: '12px',
      cursor: 'pointer',
    }}
    onClick={() => navigate('/buy-tokens')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: barColor }}>
          <Zap size={13} />
          TOKENS
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {fmt(balance)}
        </span>
      </div>

      <div style={{ height: '5px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.4s ease' }} />
      </div>

      {isLow ? (
        <div style={{ fontSize: '11px', color: RED, fontWeight: 500 }}>
          ⚠ Running low — tap to top up
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Tap to buy more tokens
        </div>
      )}
    </div>
  )
}