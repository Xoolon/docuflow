import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import TokenMeter from './TokenMeter'
import {
  LayoutDashboard, ArrowLeftRight, Sparkles,
  Clock, LogOut, Zap, ShieldCheck,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/convert',   icon: ArrowLeftRight,  label: 'Convert'    },
  { to: '/ai',        icon: Sparkles,        label: 'AI Generate'},
  { to: '/history',   icon: Clock,           label: 'History'    },
]

export default function Layout() {
  const { user, logout, refreshUser } = useStore()
  // NOTE: fetchUsage removed — token wallet replaces daily usage tracking
  const navigate  = useNavigate()
  const isAdmin   = user?.is_admin
  const isPaying  = (user?.tokens_purchased ?? 0) > 0

  // Refresh token balance once when the layout mounts (covers page reloads)
  useEffect(() => { refreshUser() }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{
        width: '240px', minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      }}>

        {/* Logo */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>
              DocuFlow
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', marginBottom: '4px',
                color:      isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                fontWeight: isActive ? 500 : 400,
                transition: 'var(--transition)', fontSize: '14px',
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}

          {/* Admin link – only visible to admins */}
          {isAdmin && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', marginBottom: '4px',
                color:      isActive ? '#ffd700' : 'rgba(255,215,0,0.6)',
                background: isActive ? 'rgba(255,215,0,0.08)' : 'transparent',
                fontWeight: isActive ? 500 : 400,
                transition: 'var(--transition)', fontSize: '14px',
              })}
            >
              <ShieldCheck size={17} />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Token meter — always visible, replaces old usage bars */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <TokenMeter />
        </div>

        {/* User + logout */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
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

          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'var(--transition)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-bright)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)';   e.currentTarget.style.borderColor = 'var(--border)'        }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}