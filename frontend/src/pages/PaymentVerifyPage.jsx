import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import { CheckCircle2, XCircle, Loader, Zap } from 'lucide-react'

export default function PaymentVerifyPage() {
  const navigate = useNavigate()
  const { refreshUser } = useStore()
  const [status,     setStatus]     = useState('verifying')
  const [tokensAdded, setTokensAdded] = useState(null)
  const [newBalance,  setNewBalance]  = useState(null)

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) { setStatus('failed'); return }
    verifyPayment(reference)
  }, [])

  const verifyPayment = async (reference) => {
    try {
      const res = await api.get(`/payment/verify/${reference}`)
      if (res.data.status === 'success' || res.data.status === 'already_processed') {
        setTokensAdded(res.data.tokens_added ?? null)
        setNewBalance(res.data.new_balance ?? null)
        setStatus('success')
        await refreshUser()
        setTimeout(() => navigate('/dashboard'), 3000)
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', maxWidth: '420px', width: '90%' }}>

        {status === 'verifying' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <Loader size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '8px' }}>
              Verifying Payment...
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Please wait while we confirm your payment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <CheckCircle2 size={56} color="#00d4aa" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '8px' }}>
              Payment Successful! 🎉
            </h2>
            {tokensAdded && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '16px', color: '#00d4aa', fontWeight: 700, fontSize: '18px' }}>
                <Zap size={18} />
                +{tokensAdded.toLocaleString()} tokens added
              </div>
            )}
            {newBalance && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                New balance: <strong style={{ color: 'var(--text-primary)' }}>{newBalance.toLocaleString()} tokens</strong>
              </p>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Tokens never expire. Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <XCircle size={56} color="#ff6b6b" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '8px' }}>
              Payment Failed
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Your payment could not be verified. Please try again or contact support.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/buy-tokens')}
                style={{ padding: '12px 24px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                Try Again
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', cursor: 'pointer', fontSize: '14px' }}>
                Back to Dashboard
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}