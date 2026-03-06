import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import TokenMeter from './TokenMeter'
import {
  LayoutDashboard, ArrowLeftRight, Sparkles,
  Clock, LogOut, Zap, ShieldCheck,
} from 'lucide-react'

/* ── Responsive layout CSS ─────────────────────────────────────────────────── */
const LAYOUT_CSS = `
  .df-shell   { display: flex; min-height: 100vh; background: var(--bg-base); }

  /* ── Sidebar — desktop ─────────────────────────────────────────────────── */
  .df-sidebar {
    width: 240px;
    min-height: 100vh;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0; top: 0; bottom: 0;
    z-index: 100;
  }
  .df-main { margin-left: 240px; flex: 1; min-height: 100vh; min-width: 0; }

  /* ── Mobile (≤ 768px): bottom tab bar ─────────────────────────────────── */
  @media (max-width: 768px) {
    .df-sidebar {
      width: 100%;
      min-height: unset;
      height: 60px;
      top: unset;
      bottom: 0;
      left: 0;
      right: 0;
      flex-direction: row;
      border-right: none;
      border-top: 1px solid var(--border);
      padding: 0;
    }
    .df-sidebar-logo    { display: none !important; }
    .df-sidebar-nav     {
      display: flex !important;
      flex-direction: row !important;
      align-items: center;
      justify-content: space-around;
      flex: 1;
      padding: 0 8px !important;
    }
    .df-sidebar-nav a   {
      flex-direction: column !important;
      gap: 3px !important;
      padding: 8px 10px !important;
      font-size: 10px !important;
      min-width: 48px;
      align-items: center;
      text-align: center;
      border-radius: var(--radius-sm) !important;
    }
    .df-sidebar-tokens  { display: none !important; }
    .df-sidebar-user    { display: none !important; }
    .df-main { margin-left: 0; padding-bottom: 68px; }
    .df-mobile-topbar   { display: flex !important; }
  }

  /* Mobile topbar (logo + signout) — hidden on desktop */
  .df-mobile-topbar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-surface);
    position: sticky;
    top: 0;
    z-index: 90;
  }
`

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/convert',   icon: ArrowLeftRight,  label: 'Convert'    },
  { to: '/ai',        icon: Sparkles,        label: 'AI'         },
  { to: '/history',   icon: Clock,           label: 'History'    },
]

export default function Layout() {
  const { user, logout, refreshUser } = useStore()
  const navigate = useNavigate()
  const isAdmin  = user?.is_admin
  const isPaying = (user?.tokens_purchased ?? 0) > 0

  useEffect(() => {
    if (!document.getElementById('df-layout-css')) {
      const el = document.createElement('style')
      el.id = 'df-layout-css'
      el.textContent = LAYOUT_CSS
      document.head.appendChild(el)
    }
    refreshUser()
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="df-shell">

      {/* ── Sidebar / bottom nav ─────────────────────────────────────────── */}
      <aside className="df-sidebar">

        {/* Logo — hidden on mobile */}
        <div className="df-sidebar-logo" style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>DocuFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="df-sidebar-nav" style={{ padding: '16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', marginBottom: '4px',
              color:      isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              transition: 'var(--transition)', fontSize: '14px',
            })}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', marginBottom: '4px',
              color:      isActive ? '#ffd700' : 'rgba(255,215,0,0.6)',
              background: isActive ? 'rgba(255,215,0,0.08)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              transition: 'var(--transition)', fontSize: '14px',
            })}>
              <ShieldCheck size={17} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Token meter — desktop only */}
        <div className="df-sidebar-tokens" style={{ borderTop: '1px solid var(--border)' }}>
          <TokenMeter />
        </div>

        {/* User / logout — desktop only */}
        <div className="df-sidebar-user" style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'white' }}>
                {user?.name?.[0] || user?.email?.[0] || '?'}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: isPaying ? 'var(--accent2)' : 'var(--text-muted)' }}>
                {isPaying ? '✓ Paying user' : 'Free tier'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'var(--transition)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-bright)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)';   e.currentTarget.style.borderColor = 'var(--border)'        }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="df-main">

        {/* Mobile topbar — logo + sign out (shown only on mobile) */}
        <div className="df-mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>DocuFlow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--accent2)', fontWeight: 500 }}>
              <Zap size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {(user?.tokens_balance ?? 0).toLocaleString()}
            </span>
            <button onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  )
}