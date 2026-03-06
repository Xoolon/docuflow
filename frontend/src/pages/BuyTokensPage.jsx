import { useState } from 'react'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Zap, Check, Star } from 'lucide-react'

const PACKS = [
  { id: 'starter', label: 'Starter',  tokens: 50_000,    price: 2,  ngn: 3_200,  desc: 'Perfect for trying out' },
  { id: 'basic',   label: 'Basic',    tokens: 150_000,   price: 5,  ngn: 8_000,  desc: 'For regular users' },
  { id: 'pro',     label: 'Pro',      tokens: 400_000,   price: 12, ngn: 19_200, desc: 'Best value', popular: true },
  { id: 'max',     label: 'Max',      tokens: 1_000_000, price: 25, ngn: 40_000, desc: 'For power users' },
]

const fmt = n => n.toLocaleString()

export default function BuyTokensPage() {
  const { user, setUser } = useStore()
  const [loading, setLoading] = useState(null)

  const handleBuy = async (packId) => {
    setLoading(packId)
    try {
      const res = await api.post(`/payment/initialize/${packId}`)
      window.location.href = res.data.authorization_url
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not start payment')
      setLoading(null)
    }
  }

  const balance   = user?.tokens_balance ?? 0
  const pct       = Math.min(100, (balance / 10_000) * 100)
  const ACCENT    = '#6c63ff'
  const ACCENT2   = '#00d4aa'

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Current balance */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
              Your Token Balance
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              Tokens never expire — use them whenever you need
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-display)', color: ACCENT2 }}>
              {fmt(balance)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>tokens remaining</div>
          </div>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`, borderRadius: '99px', transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>0</span>
          <span>10,000 (free tier)</span>
        </div>
      </div>

      {/* What tokens cost */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'AI Generation',     cost: 'Exact tokens used', icon: '🤖', note: 'Typically 800–3 000 tokens' },
          { label: 'Doc Conversion',    cost: '500 tokens/file',   icon: '📄', note: 'PDF, DOCX, TXT, HTML...' },
          { label: 'Image Conversion',  cost: '200 tokens/file',   icon: '🖼️', note: 'JPG, PNG, WEBP, HEIC...' },
        ].map(({ label, cost, icon, note }) => (
          <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{label}</div>
            <div style={{ color: ACCENT2, fontWeight: 700, fontSize: '13px' }}>{cost}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{note}</div>
          </div>
        ))}
      </div>

      {/* Packs */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
        Top Up — Pick a Pack
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        {PACKS.map(pack => (
          <div key={pack.id} style={{
            background: pack.popular ? 'rgba(108,99,255,0.08)' : 'var(--bg-card)',
            border: `1px solid ${pack.popular ? ACCENT : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)', padding: '24px',
            position: 'relative', cursor: 'pointer', transition: 'var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {pack.popular && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: ACCENT, color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Star size={10} fill="white" /> BEST VALUE
              </div>
            )}
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{pack.label}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{pack.desc}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color: ACCENT2, marginBottom: '2px' }}>
              ${pack.price}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              ≈ ₦{fmt(pack.ngn)}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {fmt(pack.tokens)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>tokens</div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              ≈ {Math.floor(pack.tokens / 1200)} AI jobs<br />
              or {Math.floor(pack.tokens / 500)} doc conversions
            </div>

            <button
              onClick={() => handleBuy(pack.id)}
              disabled={!!loading}
              style={{
                width: '100%', padding: '11px', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer',
                background: pack.popular ? ACCENT : 'var(--bg-elevated)',
                color: pack.popular ? 'white' : 'var(--text-primary)',
                fontWeight: 600, fontSize: '14px', opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading === pack.id ? '…' : (
                <><Zap size={14} /> Buy {pack.label}</>
              )}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>
        Payments via Paystack · Secure checkout · Tokens added instantly · Never expire
      </p>
    </div>
  )
}