import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import { CheckCircle2, XCircle, Loader, Zap, ArrowLeft, RefreshCw } from 'lucide-react'

export default function PaymentVerifyPage() {
  const navigate = useNavigate()
  const { refreshUser } = useStore()
  const [status,      setStatus]      = useState('verifying')  // verifying | success | already_processed | failed
  const [tokensAdded, setTokensAdded] = useState(null)
  const [newBalance,  setNewBalance]  = useState(null)
  const [countdown,   setCountdown]   = useState(4)

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) { setStatus('failed'); return }
    verifyPayment(reference)
  }, [])

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) { navigate('/dashboard'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  const verifyPayment = async (reference) => {
    try {
      const res = await api.get(`/payment/verify/${reference}`)
      const s   = res.data.status
      if (s === 'success' || s === 'already_processed') {
        setTokensAdded(res.data.tokens_added ?? null)
        setNewBalance(res.data.new_balance   ?? null)
        setStatus(s === 'already_processed' ? 'already_processed' : 'success')
        await refreshUser()
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        padding: 'clamp(28px, 6vw, 56px) clamp(20px, 6vw, 48px)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        maxWidth: '420px',
        width: '100%',
        animation: 'fadeUp 0.4s ease',
      }}>

        {/* ── Verifying ─────────────────────────────────────────────────── */}
        {status === 'verifying' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Loader size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Verifying Payment…
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
              Please wait — we're confirming your payment with Paystack.
            </p>
          </>
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {(status === 'success' || status === 'already_processed') && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <CheckCircle2 size={56} color="#00d4aa" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
              {status === 'already_processed' ? 'Payment Already Processed' : 'Payment Successful! 🎉'}
            </h2>

            {tokensAdded && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 'var(--radius-md)', margin: '12px 0 8px', color: '#00d4aa', fontWeight: 700, fontSize: '20px' }}>
                <Zap size={18} />
                +{tokensAdded.toLocaleString()} tokens added
              </div>
            )}

            {newBalance && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                New balance: <strong style={{ color: 'var(--text-primary)' }}>{newBalance.toLocaleString()} tokens</strong>
              </p>
            )}

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              {status === 'already_processed'
                ? 'These tokens were already credited to your account.'
                : 'Tokens never expire. Redirecting in a moment…'}
            </p>

            {/* Progress bar */}
            {status === 'success' && (
              <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent2), var(--accent))',
                  borderRadius: '2px',
                  width: `${((4 - countdown) / 4) * 100}%`,
                  transition: 'width 1s linear',
                }} />
              </div>
            )}

            <button onClick={() => navigate('/dashboard')}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              Go to Dashboard {status === 'success' ? `(${countdown})` : '→'}
            </button>
          </>
        )}

        {/* ── Failed ────────────────────────────────────────────────────── */}
        {status === 'failed' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <XCircle size={56} color="#ff6b6b" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Payment Not Verified
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
              We could not confirm your payment. This can happen if:
            </p>
            <ul style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.8, marginBottom: '24px', paddingLeft: '20px' }}>
              <li>The payment was cancelled</li>
              <li>The session timed out</li>
              <li>There was a network error</li>
            </ul>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
              If you were charged, please contact us at <strong>support@docuflow.app</strong> with your payment reference.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/buy-tokens')}
                style={{ padding: '11px 22px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} /> Try Again
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '11px 22px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Dashboard
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}