import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import {
  ArrowLeftRight, Sparkles, Zap, ArrowRight,
  CheckCircle2, Crown, ShoppingCart,
} from 'lucide-react'

const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'

const DASH_CSS = `
  .dash-stats  { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 28px; }
  .dash-actions{ display: grid; grid-template-columns: 1fr 1fr;       gap: 16px; margin-bottom: 28px; }
  .dash-bottom { display: grid; grid-template-columns: 1fr 320px;     gap: 20px; }

  @media (max-width: 900px) {
    .dash-stats   { grid-template-columns: repeat(2, 1fr); }
    .dash-bottom  { grid-template-columns: 1fr; }
    .dash-sidebar-card { display: none; }
  }
  @media (max-width: 560px) {
    .dash-root    { padding: 20px 16px !important; }
    .dash-stats   { grid-template-columns: 1fr 1fr; gap: 10px; }
    .dash-actions { grid-template-columns: 1fr; }
    .dash-bottom  { grid-template-columns: 1fr; }
  }
`

export default function DashboardPage() {
  const { user, refreshUser } = useStore()
  const [recentJobs, setRecentJobs]   = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const navigate = useNavigate()

  const balance   = user?.tokens_balance   ?? 0
  const consumed  = user?.tokens_consumed  ?? 0
  const purchased = user?.tokens_purchased ?? 0
  const isPaying  = purchased > 0

  useEffect(() => {
    if (!document.getElementById('df-dash-css')) {
      const el = document.createElement('style'); el.id = 'df-dash-css'
      el.textContent = DASH_CSS; document.head.appendChild(el)
    }
    refreshUser()
    fetchRecentJobs()
  }, [])

  const fetchRecentJobs = async () => {
    try {
      const [conv, ai] = await Promise.all([
        api.get('/convert/history?limit=5'),
        api.get('/ai/history?limit=5'),
      ])
      const combined = [
        ...conv.data.map(j => ({ ...j, type: 'conversion' })),
        ...ai.data.map(j =>  ({ ...j, type: 'ai' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
      setRecentJobs(combined)
    } catch {}
    setLoadingJobs(false)
  }

  const quickActions = [
    { label: 'Convert a File', desc: 'Transform any document or image', icon: ArrowLeftRight, to: '/convert', color: ACCENT  },
    { label: 'AI Generate',    desc: 'Create & improve docs with AI',   icon: Sparkles,       to: '/ai',      color: ACCENT2 },
  ]

  return (
    <div className="dash-root" style={{ padding: '32px 28px', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {isPaying ? 'Token user · Credits never expire' : 'Free tier · 10,000 welcome tokens'}
        </p>
      </div>

      {/* Token stats */}
      <div className="dash-stats">
        <StatCard label="Tokens Left"    value={balance.toLocaleString()}   icon={Zap}     color={balance < 2000 ? '#ff6b6b' : ACCENT2} sub={balance < 2000 ? '⚠ Running low' : 'Never expire'} />
        <StatCard label="Tokens Used"    value={consumed.toLocaleString()}  icon={Sparkles} color={ACCENT} sub="Lifetime total" />
        <StatCard label="Account"        value={isPaying ? 'Token User' : 'Free Tier'} icon={isPaying ? Crown : Zap} color={isPaying ? '#ffd700' : 'var(--text-muted)'} sub={isPaying ? `${purchased.toLocaleString()} purchased` : 'Free plan'} />
      </div>

      {/* Quick actions */}
      <div className="dash-actions">
        {quickActions.map(({ label, desc, icon: Icon, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '16px' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', marginBottom: '3px' }}>{label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{desc}</div>
            </div>
            <ArrowRight size={15} color="var(--text-muted)" />
          </button>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="dash-bottom">

        {/* Recent activity */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>Recent Activity</h3>
            <button onClick={() => navigate('/history')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
              View all →
            </button>
          </div>

          {loadingJobs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px' }} />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>No activity yet</p>
              <button onClick={() => navigate('/convert')}
                style={{ padding: '8px 20px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                Convert your first file →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentJobs.map(job => <JobRow key={job.id} job={job} />)}
            </div>
          )}
        </div>

        {/* Right card — low balance CTA or token guide */}
        <div className="dash-sidebar-card">
          {balance < 3000 ? (
            <div style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.06),rgba(108,99,255,0.04))', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '8px', color: '#ff6b6b' }}>Low Balance</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{balance.toLocaleString()} tokens</strong> left. Top up to keep going.
              </p>
              <button onClick={() => navigate('/buy-tokens')}
                style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <ShoppingCart size={15} /> Top Up Tokens
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={16} color={ACCENT2} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>Token Usage Guide</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { icon: '🤖', label: 'AI Generation',    cost: 'Exact tokens used', note: '~800–3,000/job' },
                  { icon: '📄', label: 'Doc Conversion',   cost: '500 tokens/file',   note: 'PDF, DOCX, TXT...' },
                  { icon: '🖼️', label: 'Image Conversion',  cost: '200 tokens/file',   note: 'JPG, PNG, WEBP...' },
                ].map(({ icon, label, cost, note }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '18px' }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: ACCENT2, fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>{cost}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/buy-tokens')}
                style={{ width: '100%', marginTop: '14px', padding: '9px', background: 'transparent', border: `1px solid ${ACCENT}40`, borderRadius: 'var(--radius-md)', color: 'var(--accent-light)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ShoppingCart size={13} /> Buy more tokens
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <Icon size={15} color={color} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, letterSpacing: '-0.02em', color, wordBreak: 'break-all' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function JobRow({ job }) {
  const isSuccess = job.status === 'completed'
  const isAI      = job.type === 'ai'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: isAI ? 'rgba(0,212,170,0.1)' : 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isAI ? <Sparkles size={13} color={ACCENT2} /> : <ArrowLeftRight size={13} color={ACCENT} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAI ? (job.task ? `AI: ${job.task}` : 'AI Generation') : `${job.input_format?.toUpperCase() ?? '?'} → ${job.output_format?.toUpperCase() ?? '?'}`}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span>{new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {(job.tokens_charged > 0 || job.tokens_used > 0) && (
            <span style={{ color: ACCENT2 }}>−{(job.tokens_charged || job.tokens_used)?.toLocaleString()} tokens</span>
          )}
        </div>
      </div>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isSuccess ? ACCENT2 : job.status === 'failed' ? '#ff6b6b' : 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}