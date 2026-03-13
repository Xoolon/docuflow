/**
 * LoginPromptModal — shown to guests when they try to convert.
 * Explains what they get, then sends them to /login.
 */
import { useNavigate } from 'react-router-dom'
import { X, Zap, CheckCircle2 } from 'lucide-react'

const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'

export default function LoginPromptModal({ onClose, filename }) {
  const navigate = useNavigate()

  const handleLogin = () => {
    // Store intent so after login we redirect back to /convert
    sessionStorage.setItem('login_redirect', '/convert')
    navigate('/login')
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s ease' }}>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', overflow: 'hidden', animation: 'fadeUp 0.25s ease', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '28px 28px 20px', background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(0,212,170,0.06))', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', padding: '5px', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={14} />
          </button>

          <div style={{ width: '48px', height: '48px', background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', boxShadow: '0 6px 20px rgba(108,99,255,0.35)' }}>
            <Zap size={22} color="white" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Sign in to convert
          </h2>
          {filename && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{filename}</strong> is ready — just sign in to run the conversion.
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
            {[
              'Free account — no credit card needed',
              '10,000 free tokens on signup',
              'Convert PDF, DOCX, images & more',
              'AI document generation included',
            ].map(line => (
              <div key={line} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={15} color={ACCENT2} style={{ flexShrink: 0 }} />
                {line}
              </div>
            ))}
          </div>

          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginBottom: '10px', boxShadow: '0 4px 20px rgba(108,99,255,0.35)' }}>
            Sign in with Google — it's free
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            No password needed · Google account only
          </p>
        </div>
      </div>
    </div>
  )
}