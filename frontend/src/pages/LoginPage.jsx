import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Zap, FileText, Sparkles, Cpu, AlertCircle } from 'lucide-react'

const GOOGLE_REDIRECT_URI = `${window.location.origin}/login`

export default function LoginPage() {
  const { token, setAuth } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [processingOAuth, setProcessingOAuth] = useState(false)
  // Prevent React StrictMode from firing the OAuth exchange twice
  const oauthCalledRef = useRef(false)

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
  }, [token, navigate])

  // On mount: check if Google redirected back with ?code=
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const code      = params.get('code')
    const oauthErr  = params.get('error')

    if (oauthErr) {
      setError('Google sign-in was cancelled or denied. Please try again.')
      window.history.replaceState({}, '', '/login')
      return
    }
    if (code) {
      // Guard: React StrictMode fires effects twice in dev — only process once
      if (oauthCalledRef.current) return
      oauthCalledRef.current = true
      // Remove the code from the URL immediately so a reload doesn't re-submit it
      window.history.replaceState({}, '', '/login')
      setProcessingOAuth(true)
      handleGoogleCallback(code)
    }
  }, [])

  const handleGoogleCallback = async (code) => {
    setError('')
    try {
      const res = await api.post('/auth/google/callback', {
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
      })
      setAuth(res.data.user, res.data.access_token)
      toast.success(
        `Welcome${res.data.user?.name ? `, ${res.data.user.name.split(' ')[0]}` : ''}! 🎉`
      )
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      let msg = 'Sign-in failed. Please try again.'
      if (!err.response)          msg = 'Cannot reach server. Is the backend running on port 8000?'
      else if (status === 400)    msg = 'Google code expired. Please sign in again.'
      else if (typeof detail === 'string') msg = detail
      setError(msg)
    } finally {
      setProcessingOAuth(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/auth/google/url', {
        params: { redirect_uri: GOOGLE_REDIRECT_URI },
      })
      if (!res.data?.url) throw new Error('No URL returned from server')
      window.location.href = res.data.url
    } catch (err) {
      const detail = err.response?.data?.detail
      let msg = 'Failed to start Google sign-in.'
      if (!err.response)               msg = 'Cannot reach server. Is the backend running on port 8000?'
      else if (typeof detail === 'string') msg = detail
      setError(msg)
      setLoading(false)
    }
  }

  const features = [
    { icon: FileText, text: 'Convert between 12+ file formats instantly' },
    { icon: Sparkles, text: 'AI-powered document generation & improvement' },
    { icon: Cpu,      text: 'Professional formatting & ATS optimisation' },
  ]

  // Full-screen spinner while exchanging the OAuth code
  if (processingOAuth) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
      }}>
        <div style={{
          width: '52px', height: '52px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          color: 'var(--text-secondary)',
        }}>
          Signing you in…
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex' }}>

      {/* ── Left panel – branding ─────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)',
        borderRight: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px',  width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)'  }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '64px' }}>
            <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(108,99,255,0.4)' }}>
              <Zap size={22} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.03em' }}>DocuFlow</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '20px', background: 'linear-gradient(135deg, #f0f0f8 30%, rgba(108,99,255,0.9) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Convert files.<br />Generate docs.<br />
            <span style={{ background: 'linear-gradient(135deg, var(--accent2), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Instantly.</span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.6, maxWidth: '400px', marginBottom: '48px' }}>
            The intelligent document platform for professionals who move fast.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(108,99,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="var(--accent-light)" />
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel – sign-in form ────────────────────────────────────── */}
      <div style={{ width: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 48px' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Get started
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>
            Sign in to your DocuFlow account
          </p>

          {/* Error banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px', color: '#ff6b6b', lineHeight: 1.5 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '14px 20px', background: loading ? 'var(--bg-elevated)' : 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'var(--transition)', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '24px', lineHeight: 1.5 }}>
            By continuing, you agree to our <a href="/terms" style={{color:"var(--accent-light)",textDecoration:"none",borderBottom:"1px solid rgba(139,132,255,0.3)"}}>Terms of Service</a> and <a href="/privacy" style={{color:"var(--accent-light)",textDecoration:"none",borderBottom:"1px solid rgba(139,132,255,0.3)"}}>Privacy Policy</a>.
          </div>

          {/* Token callout – replaces old "5 conversions/day" copy */}
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '13px', color: 'var(--accent2)', fontWeight: 500, marginBottom: '4px' }}>✨ Free tokens on signup</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Get 10,000 tokens free — no credit card required.<br />
              Use them for AI generation, doc &amp; image conversion.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}