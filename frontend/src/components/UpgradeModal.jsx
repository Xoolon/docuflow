/**
 * UpgradeModal — in the token system this is a "Top Up" prompt,
 * not a subscription modal. It redirects to /buy-tokens.
 */
import { useNavigate } from 'react-router-dom'
import { X, Zap, ShoppingCart } from 'lucide-react'
import { useStore } from '../store/useStore'

const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate()
  const { user } = useStore()
  const balance  = user?.tokens_balance ?? 0

  const handleBuy = () => {
    onClose()
    navigate('/buy-tokens')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(108,99,255,0.3)',
          borderRadius: 'var(--radius-xl)',
          width: '460px', maxWidth: '95vw',
          overflow: 'hidden',
          animation: 'fadeUp 0.3s ease',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(108,99,255,0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,212,170,0.08) 100%)',
          padding: '32px 32px 28px',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', display: 'flex' }}>
            <X size={16} />
          </button>
          <div style={{ width: '56px', height: '56px', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 8px 32px rgba(108,99,255,0.4)' }}>
            <Zap size={26} color="white" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            Top Up Tokens
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            You have <strong style={{ color: balance < 500 ? '#ff6b6b' : 'var(--text-primary)' }}>{balance.toLocaleString()} tokens</strong> remaining
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px' }}>
          {/* Token cost guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              { icon: '🤖', label: 'AI Generation',    cost: 'Exact tokens used',  note: '~800–3,000 per job' },
              { icon: '📄', label: 'Doc Conversion',   cost: '500 tokens / file',  note: 'PDF, DOCX, TXT...'  },
              { icon: '🖼️', label: 'Image Conversion', cost: '200 tokens / file',  note: 'JPG, PNG, WEBP...'  },
            ].map(({ icon, label, cost, note }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note}</div>
                </div>
                <div style={{ fontSize: '12px', color: ACCENT2, fontWeight: 600 }}>{cost}</div>
              </div>
            ))}
          </div>

          {/* Packs teaser */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: 'Starter', tokens: '50K',   price: '$2'  },
              { label: 'Basic',   tokens: '150K',  price: '$5'  },
              { label: 'Pro',     tokens: '400K',  price: '$12', hot: true },
              { label: 'Max',     tokens: '1M',    price: '$25' },
            ].map(p => (
              <div key={p.label} style={{ padding: '10px 8px', background: p.hot ? `rgba(108,99,255,0.1)` : 'var(--bg-elevated)', border: `1px solid ${p.hot ? ACCENT : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: p.hot ? 'var(--accent-light)' : 'var(--text-secondary)', marginBottom: '4px' }}>{p.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: ACCENT2 }}>{p.tokens}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.price}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleBuy}
            style={{
              width: '100%', padding: '16px',
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT2} 100%)`,
              border: 'none', borderRadius: 'var(--radius-md)',
              color: 'white', fontFamily: 'var(--font-display)',
              fontWeight: 700, fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              marginBottom: '12px',
              boxShadow: '0 4px 24px rgba(108,99,255,0.4)',
            }}
          >
            <ShoppingCart size={18} /> Buy Tokens — from $2
          </button>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Secure payment via Paystack · Tokens never expire · No subscription
          </div>
        </div>
      </div>
    </div>
  )
}