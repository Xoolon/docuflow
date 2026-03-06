/**
 * UpgradeModal — "Top Up" prompt shown when user runs low on tokens.
 * Responsive: works on all screen sizes, modal fills screen on mobile.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Zap, ShoppingCart } from 'lucide-react'
import { useStore } from '../store/useStore'

const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'

const MODAL_CSS = `
  .modal-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: var(--bg-surface);
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    animation: fadeUp 0.25s ease;
  }
  .modal-packs { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 20px; }
  @media (max-width: 480px) {
    .modal-box      { border-radius: var(--radius-lg); }
    .modal-header   { padding: 24px 20px 20px !important; }
    .modal-body     { padding: 20px !important; }
    .modal-packs    { grid-template-columns: repeat(2,1fr); }
  }
`

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate()
  const { user } = useStore()
  const balance  = user?.tokens_balance ?? 0

  // Inject CSS once; close on Escape
  useEffect(() => {
    if (!document.getElementById('df-modal-css')) {
      const el = document.createElement('style'); el.id = 'df-modal-css'
      el.textContent = MODAL_CSS; document.head.appendChild(el)
    }
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleBuy = () => { onClose(); navigate('/buy-tokens') }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,212,170,0.08) 100%)', padding: '28px 28px 24px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <button onClick={onClose}
            style={{ position: 'absolute', top: '14px', right: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', display: 'flex' }}>
            <X size={15} />
          </button>
          <div style={{ width: '52px', height: '52px', background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 8px 24px rgba(108,99,255,0.4)' }}>
            <Zap size={24} color="white" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '5px' }}>
            Top Up Tokens
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {balance < 100
              ? <><span style={{ color: '#ff6b6b', fontWeight: 600 }}>You're out of tokens.</span> Buy a pack to keep going.</>
              : <>You have <strong style={{ color: balance < 500 ? '#ff6b6b' : 'var(--text-primary)' }}>{balance.toLocaleString()} tokens</strong> remaining</>
            }
          </p>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '24px 28px' }}>

          {/* Cost breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {[
              { icon: '🤖', label: 'AI Generation',    cost: 'Exact tokens used', note: '~800–3,000 / job'  },
              { icon: '📄', label: 'Doc Conversion',   cost: '500 tokens / file', note: 'PDF, DOCX, TXT…'   },
              { icon: '🖼️', label: 'Image Conversion', cost: '200 tokens / file', note: 'JPG, PNG, WEBP…'   },
            ].map(({ icon, label, cost, note }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note}</div>
                </div>
                <div style={{ fontSize: '12px', color: ACCENT2, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{cost}</div>
              </div>
            ))}
          </div>

          {/* Pack previews */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Available packs</div>
          <div className="modal-packs">
            {[
              { label: 'Starter', tokens: '50K',  kes: 'KSh 260',  hot: false },
              { label: 'Basic',   tokens: '150K', kes: 'KSh 650',  hot: false },
              { label: 'Pro',     tokens: '400K', kes: 'KSh 1,560', hot: true  },
              { label: 'Max',     tokens: '1M',   kes: 'KSh 3,250', hot: false },
            ].map(p => (
              <div key={p.label} style={{ padding: '10px 8px', background: p.hot ? 'rgba(108,99,255,0.1)' : 'var(--bg-elevated)', border: `1px solid ${p.hot ? ACCENT : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center', position: 'relative' }}>
                {p.hot && <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '100px' }}>BEST</div>}
                <div style={{ fontSize: '11px', fontWeight: 600, color: p.hot ? 'var(--accent-light)' : 'var(--text-secondary)', marginBottom: '4px' }}>{p.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: ACCENT2 }}>{p.tokens}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.kes}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={handleBuy}
            style={{ width: '100%', padding: '15px', background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px', boxShadow: '0 4px 24px rgba(108,99,255,0.35)' }}>
            <ShoppingCart size={17} /> See All Packs — from KSh 260
          </button>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Secure payment via Paystack · Tokens never expire · No subscription
          </div>
        </div>
      </div>
    </div>
  )
}