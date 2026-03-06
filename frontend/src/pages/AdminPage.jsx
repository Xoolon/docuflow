import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, DollarSign, Zap, TrendingUp, AlertCircle,
  Server, Activity, Package, Shield
} from 'lucide-react'

const ADMIN_CSS = `
  .admin-root { padding: 32px; max-width: 1400px; margin: 0 auto; }
  .admin-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
  .admin-header h1 { font-family: var(--font-display); font-size: 28px; font-weight: 800; margin: 0; }
  .admin-header p { color: var(--text-muted); margin: 0; font-size: 14px; }
  .admin-refresh-btn { margin-left: auto; padding: 8px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; font-size: 13px; }
  .admin-tabs { display: flex; gap: 4px; margin-bottom: 28px; background: var(--bg-elevated); padding: 4px; border-radius: var(--radius-md); width: fit-content; flex-wrap: wrap; }
  .admin-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .admin-financial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .admin-cost-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .admin-fixed-costs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .admin-table { overflow-x: auto; }

  @media (max-width: 900px) {
    .admin-root { padding: 20px; }
    .admin-header { flex-direction: column; align-items: flex-start; }
    .admin-refresh-btn { margin-left: 0; }
    .admin-tabs { width: 100%; overflow-x: auto; flex-wrap: nowrap; }
    .admin-kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-financial-grid { grid-template-columns: 1fr; }
    .admin-cost-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-fixed-costs { grid-template-columns: repeat(2, 1fr); }
    .admin-header h1 { font-size: 24px; }
  }
  @media (max-width: 560px) {
    .admin-kpi-grid { grid-template-columns: 1fr; }
    .admin-cost-grid { grid-template-columns: 1fr; }
    .admin-fixed-costs { grid-template-columns: 1fr; }
    .admin-root { padding: 16px; }
  }
`;

const fmt = (n) => n?.toLocaleString() ?? '—'
const usd = (n) => `$${(n ?? 0).toFixed(2)}`

export default function AdminPage() {
  const { user } = useStore()
  const navigate  = useNavigate()
  const [overview, setOverview]   = useState(null)
  const [revenue,  setRevenue]    = useState([])
  const [apiCosts, setApiCosts]   = useState([])
  const [packs,    setPacks]      = useState([])
  const [users,    setUsers]      = useState([])
  const [loading,  setLoading]    = useState(true)
  const [tab,      setTab]        = useState('overview')

  // Inject CSS
  useEffect(() => {
    if (!document.getElementById('df-admin-css')) {
      const el = document.createElement('style')
      el.id = 'df-admin-css'
      el.textContent = ADMIN_CSS
      document.head.appendChild(el)
    }
  }, [])

  useEffect(() => {
    if (!user?.is_admin) { navigate('/dashboard'); return }
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ov, rev, costs, pk, us] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/revenue/daily?days=30'),
        api.get('/admin/api-costs/daily?days=30'),
        api.get('/admin/packs/stats'),
        api.get('/admin/users?limit=50'),
      ])
      setOverview(ov.data)
      setRevenue(rev.data)
      setApiCosts(costs.data)
      setPacks(pk.data)
      setUsers(us.data.users)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const combinedChart = revenue.map((r, i) => ({
    day: r.day.slice(5),  // MM-DD
    revenue: r.revenue_usd,
    api_cost: apiCosts[i]?.cost_usd ?? 0,
  }))

  const ACCENT  = '#6c63ff'
  const ACCENT2 = '#00d4aa'
  const RED     = '#ff6b6b'
  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  const ov = overview

  return (
    <div className="admin-root">
      {/* Header */}
      <div className="admin-header">
        <Shield size={28} color={ACCENT} />
        <div>
          <h1>Admin Dashboard</h1>
          <p>DocuFlow business intelligence — real-time</p>
        </div>
        <button className="admin-refresh-btn" onClick={loadAll}>
          ↻ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {['overview', 'revenue', 'api costs', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: tab === t ? ACCENT : 'transparent',
            color: tab === t ? 'white' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && ov && (
        <>
          {/* KPI grid */}
          <div className="admin-kpi-grid">
            {[
              { label: 'Total Users',    value: fmt(ov.users.total),           sub: `${ov.users.paying} paying`,           icon: Users,      color: ACCENT  },
              { label: 'Total Revenue',  value: usd(ov.revenue.total_usd),     sub: `₦${fmt(ov.revenue.total_ngn)}`,       icon: DollarSign, color: ACCENT2 },
              { label: 'Net Profit',     value: usd(ov.revenue.net_profit_usd),sub: `${ov.revenue.margin_pct}% margin`,    icon: TrendingUp, color: ACCENT2 },
              { label: 'API Costs',      value: usd(ov.revenue.api_cost_usd),  sub: 'Total Anthropic spend',               icon: Zap,        color: '#f59e0b'},
              { label: 'Tokens Sold',    value: fmt(ov.tokens.sold),           sub: `${fmt(ov.tokens.consumed)} used`,     icon: Activity,   color: ACCENT  },
              { label: 'Free Tier Cost', value: usd(ov.revenue.free_tier_api_cost_usd), sub: 'API cost of free users',    icon: AlertCircle,color: RED     },
              { label: 'Conversion Rate',value: `${ov.users.conversion_rate_pct}%`, sub: 'Free → paying',                 icon: TrendingUp, color: ACCENT2 },
              { label: 'Total Jobs',     value: fmt(ov.jobs.total),            sub: `${fmt(ov.jobs.ai_generations)} AI`,   icon: Server,     color: ACCENT  },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Financial breakdown */}
          <div className="admin-financial-grid">
            <div style={card}>
              <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Revenue vs API Cost (30d)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={combinedChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue"  name="Revenue $"  stroke={ACCENT2} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="api_cost" name="API Cost $"  stroke={RED}    strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Pack Sales</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={packs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="revenue_usd" name="Revenue $" fill={ACCENT} radius={[4,4,0,0]} />
                  <Bar dataKey="sold"        name="Units sold" fill={ACCENT2} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fixed cost breakdown */}
          <div style={card}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Monthly Cost Structure</h3>
            <div className="admin-fixed-costs">
              {[
                { label: 'Railway Hosting', value: '$12.00', note: 'incl. DB + Redis' },
                { label: 'Domain/SSL',      value: '$0.83',  note: '$10/yr' },
                { label: 'Misc',            value: '$2.00',  note: 'email, uptime' },
                { label: 'TOTAL FIXED',     value: '$14.83', note: 'per month', highlight: true },
              ].map(({ label, value, note, highlight }) => (
                <div key={label} style={{ padding: '16px', background: highlight ? 'rgba(108,99,255,0.1)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: highlight ? `1px solid ${ACCENT}40` : '1px solid transparent' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: highlight ? ACCENT : 'var(--text-primary)' }}>{value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── REVENUE TAB ── */}
      {tab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Daily Revenue (last 30 days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} contentStyle={{ background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="revenue_usd" name="Revenue" fill={ACCENT2} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Pack Performance</h3>
            <div className="admin-table">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr>
                    {['Pack', 'Price', 'Tokens', 'Units Sold', 'Revenue', 'Our API Cost', 'Margin'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packs.map(p => {
                    const apiCostEst = p.tokens * 0.00000113  // weighted avg
                    const ourCost    = p.sold * apiCostEst
                    const margin     = p.revenue_usd > 0 ? ((p.revenue_usd - ourCost) / p.revenue_usd * 100).toFixed(1) : '—'
                    return (
                      <tr key={p.pack_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{p.label}</td>
                        <td style={{ padding: '12px', color: ACCENT2 }}>${p.price_usd}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{fmt(p.tokens)}</td>
                        <td style={{ padding: '12px' }}>{p.sold}</td>
                        <td style={{ padding: '12px', color: ACCENT2, fontWeight: 600 }}>${p.revenue_usd.toFixed(2)}</td>
                        <td style={{ padding: '12px', color: RED }}>${ourCost.toFixed(4)}</td>
                        <td style={{ padding: '12px', color: p.sold > 0 ? ACCENT2 : 'var(--text-muted)' }}>{margin}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── API COSTS TAB ── */}
      {tab === 'api costs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={card}>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Daily Anthropic API Spend</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Exact costs from token ledger — input at $0.80/M, output at $4.00/M
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={apiCosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(3)}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(5)}`, 'API Cost']} contentStyle={{ background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="cost_usd" name="API Cost" stroke={RED} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-cost-grid">
            {[
              { label: 'Total API Spend',     value: usd(ov?.revenue.api_cost_usd),         color: RED    },
              { label: 'Free Tier API Spend', value: usd(ov?.revenue.free_tier_api_cost_usd), color: '#f59e0b' },
              { label: 'Revenue Coverage',    value: `${ov ? Math.round(ov.revenue.total_usd / Math.max(ov.revenue.api_cost_usd, 0.0001)) : 0}×`, color: ACCENT2 },
            ].map(({ label, value, color }) => (
              <div key={label} style={card}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>{label}</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>All Users</h3>
          <div className="admin-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Name / Email', 'Balance', 'Purchased', 'Consumed', 'Status', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500 }}>{u.name || '—'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px', color: u.tokens_balance < 500 ? RED : ACCENT2, fontWeight: 600 }}>
                      {fmt(u.tokens_balance)}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{fmt(u.tokens_purchased)}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{fmt(u.tokens_consumed)}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: u.is_paying ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.05)',
                        color: u.is_paying ? ACCENT2 : 'var(--text-muted)',
                      }}>
                        {u.is_paying ? 'Paying' : 'Free'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(u.joined).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}