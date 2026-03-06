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

const Card = ({ children, style, ...props }) => (
  <div style={{
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    ...style,
  }} {...props}>
    {children}
  </div>
)

export default function DashboardPage() {
  const { user, refreshUser } = useStore()
  const [recentJobs, setRecentJobs]   = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const navigate = useNavigate()

  // Token wallet — derived from user object, no extra API call needed
  const balance   = user?.tokens_balance   ?? 0
  const consumed  = user?.tokens_consumed  ?? 0
  const purchased = user?.tokens_purchased ?? 0
  const isPaying  = purchased > 0

  useEffect(() => {
    // Refresh user from server to get latest token balance
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
        ...ai.data.map(j => ({ ...j, type: 'ai' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
      setRecentJobs(combined)
    } catch {}
    setLoadingJobs(false)
  }

  const quickActions = [
    { label: 'Convert a File',  desc: 'Transform any document or image',  icon: ArrowLeftRight, to: '/convert', color: ACCENT  },
    { label: 'AI Generate',     desc: 'Create & improve docs with AI',     icon: Sparkles,       to: '/ai',      color: ACCENT2 },
  ]

  return (
    <div style={{ padding: '40px', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          {isPaying ? 'Token user · No expiry on your credits' : 'Free tier · 10,000 welcome tokens'}
        </p>
      </div>

      {/* Token stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <TokenStatCard
          label="Tokens Remaining"
          value={balance.toLocaleString()}
          icon={Zap}
          color={balance < 2000 ? '#ff6b6b' : ACCENT2}
          sub={balance < 2000 ? '⚠ Running low' : 'Never expire'}
        />
        <TokenStatCard
          label="Tokens Used"
          value={consumed.toLocaleString()}
          icon={Sparkles}
          color={ACCENT}
          sub="Lifetime total"
        />
        <TokenStatCard
          label="Account Type"
          value={isPaying ? 'Token User' : 'Free Tier'}
          icon={isPaying ? Crown : Zap}
          color={isPaying ? '#ffd700' : 'var(--text-muted)'}
          sub={isPaying ? `${purchased.toLocaleString()} tokens purchased` : '10,000 welcome tokens'}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        {quickActions.map(({ label, desc, icon: Icon, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '24px',
              textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', gap: '20px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{desc}</div>
            </div>
            <ArrowRight size={16} color="var(--text-muted)" />
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

        {/* Recent Activity */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>Recent Activity</h3>
            <button onClick={() => navigate('/history')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
              View all →
            </button>
          </div>

          {loadingJobs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px' }} />)}
            </div>
          ) : recentJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              No activity yet. Start by converting a file!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentJobs.map(job => <JobRow key={job.id} job={job} />)}
            </div>
          )}
        </Card>

        {/* Right panel — top up CTA or token summary */}
        {balance < 3000 ? (
          // Low balance — push them to buy
          <Card style={{ background: 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(108,99,255,0.04))', borderColor: 'rgba(255,107,107,0.25)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: '#ff6b6b' }}>
                Low Balance
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                You have <strong style={{ color: 'var(--text-primary)' }}>{balance.toLocaleString()} tokens</strong> left. Top up to keep using AI and conversions.
              </p>
              <button
                onClick={() => navigate('/buy-tokens')}
                style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ShoppingCart size={16} /> Top Up Tokens
              </button>
            </div>
          </Card>
        ) : (
          // Healthy balance — show token guide
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Zap size={18} color={ACCENT2} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>Token Usage Guide</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '🤖', label: 'AI Generation',   cost: 'Exact tokens used', note: '~800–3,000 per job' },
                { icon: '📄', label: 'Doc Conversion',  cost: '500 tokens/file',  note: 'PDF, DOCX, TXT...' },
                { icon: '🖼️', label: 'Image Conversion', cost: '200 tokens/file',  note: 'JPG, PNG, WEBP...' },
              ].map(({ icon, label, cost, note }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: ACCENT2, fontWeight: 600, textAlign: 'right' }}>{cost}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/buy-tokens')}
              style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'transparent', border: `1px solid ${ACCENT}40`, borderRadius: 'var(--radius-md)', color: 'var(--accent-light)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <ShoppingCart size={14} /> Buy more tokens
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}

function TokenStatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function JobRow({ job }) {
  const isSuccess = job.status === 'completed'
  const isAI      = job.type === 'ai'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isAI ? 'rgba(0,212,170,0.1)' : 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isAI ? <Sparkles size={14} color={ACCENT2} /> : <ArrowLeftRight size={14} color={ACCENT} />}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAI
            ? (job.task ? `AI: ${job.task}` : 'AI Generation')
            : `${job.input_format?.toUpperCase() ?? '?'} → ${job.output_format?.toUpperCase() ?? '?'}`
          }
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
          <span>{new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {job.tokens_charged > 0 && <span style={{ color: ACCENT2 }}>−{job.tokens_charged?.toLocaleString()} tokens</span>}
          {job.tokens_used   > 0 && <span style={{ color: ACCENT2 }}>−{job.tokens_used?.toLocaleString()} tokens</span>}
        </div>
      </div>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSuccess ? ACCENT2 : job.status === 'failed' ? '#ff6b6b' : 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}