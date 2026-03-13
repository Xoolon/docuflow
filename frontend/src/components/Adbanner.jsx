/**
 * AdBanner — ExoClick ad slots. Three variants, all minimal.
 *
 * Slots:
 *   "dashboard-top"    — thin strip above stats
 *   "dashboard-bottom" — thin strip below all dashboard content
 *   "convert-result"   — single line below the download section
 *
 * Rules:
 *   - Never rendered when isPaid=true (tokens_purchased > 0)
 *   - When EXOCLICK_ENABLED=true, renders real ExoClick zone scripts
 *   - When false, renders minimal internal DocuFlow promo (zero external requests)
 *
 * ExoClick family-safe setup (do this in ExoClick dashboard BEFORE enabling):
 *   1. Zone Settings → Content Category → "Family Safe / General"
 *   2. Zone Settings → Restrictions → block: Adult, Dating, Gambling, Weapons
 *   3. Contact ExoClick support and request "Adult opt-out" on your publisher account
 *   4. Only then set EXOCLICK_ENABLED = true below
 *
 * To activate:
 *   1. Complete dashboard setup above
 *   2. Paste your three zone IDs below
 *   3. Set EXOCLICK_ENABLED = true
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── ExoClick config ──────────────────────────────────────────────────────────
const EXOCLICK_ENABLED = false   // set true after ExoClick zone setup

// Paste your zone IDs from ExoClick → My Sites → Zones
// Format: these are numeric strings like "1234567"
const ZONES = {
  'dashboard-top':    'ZONE_ID_1',   // Banner 728x90 or Responsive
  'dashboard-bottom': 'ZONE_ID_2',   // Banner 728x90 or Responsive
  'convert-result':   'ZONE_ID_3',   // Banner 468x60 or Responsive
}

// Banner sizes to request per slot
const SIZES = {
  'dashboard-top':    { width: '100%', height: '60px'  },
  'dashboard-bottom': { width: '100%', height: '60px'  },
  'convert-result':   { width: '100%', height: '50px'  },
}
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT  = '#6c63ff'
const ACCENT2 = '#00d4aa'

/** Renders a real ExoClick zone using their standard async script inject */
function ExoClickZone({ zone, slot }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !zone || zone.startsWith('ZONE_ID')) return

    // ExoClick standard: inject a script tag that reads the data-cfasync attr
    const script = document.createElement('script')
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src = `https://a.magsrv.com/ad-provider.js`

    const ins = document.createElement('ins')
    ins.className = 'eas6a97888e'
    ins.setAttribute('data-zoneid', zone)

    ref.current.innerHTML = ''
    ref.current.appendChild(ins)
    ref.current.appendChild(script)

    return () => {
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [zone])

  const size = SIZES[slot] || {}

  return (
    <div
      ref={ref}
      style={{
        width: size.width || '100%',
        minHeight: size.height || '60px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  )
}

/** Minimal internal promo — shown when ExoClick is off. No external requests. */
function InternalPromo({ slot }) {
  const navigate = useNavigate()

  const base = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  }

  const linkBtn = (label, to, color) => (
    <button
      onClick={() => navigate(to)}
      style={{
        padding: '4px 12px',
        background: 'transparent',
        border: `1px solid ${color}40`,
        borderRadius: 'var(--radius-sm)',
        color,
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-display)',
      }}
    >
      {label}
    </button>
  )

  if (slot === 'dashboard-top') {
    return (
      <div style={{
        ...base,
        padding: '7px 14px',
        marginBottom: '20px',
        background: 'rgba(108,99,255,0.04)',
        border: '1px solid rgba(108,99,255,0.1)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ color: ACCENT2, marginRight: '6px' }}>✦</span>
          50,000 tokens from KSh 260 — convert and generate without watermarks
        </span>
        {linkBtn('Get tokens →', '/buy-tokens', ACCENT2)}
      </div>
    )
  }

  if (slot === 'dashboard-bottom') {
    return (
      <div style={{
        ...base,
        padding: '7px 14px',
        marginTop: '20px',
        background: 'rgba(0,212,170,0.03)',
        border: '1px solid rgba(0,212,170,0.08)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ color: ACCENT, marginRight: '6px' }}>✦</span>
          AI Document Studio — generate, rewrite, summarize &amp; more
        </span>
        {linkBtn('Try AI →', '/ai', ACCENT)}
      </div>
    )
  }

  // convert-result — ultra minimal, below download, separated by a border
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 12px',
      marginTop: '8px',
      borderTop: '1px solid var(--border)',
      gap: '10px',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        File watermarked ·{' '}
        <button
          onClick={() => navigate('/buy-tokens')}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: ACCENT2, fontSize: '11px', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          buy tokens to remove
        </button>
      </span>
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.05em' }}>ad</span>
    </div>
  )
}

export default function AdBanner({ slot = 'dashboard-bottom', isPaid = false }) {
  if (isPaid) return null

  if (EXOCLICK_ENABLED && ZONES[slot] && !ZONES[slot].startsWith('ZONE_ID')) {
    const size = SIZES[slot] || {}
    return (
      <div style={{
        width: '100%',
        minHeight: size.height || '60px',
        marginTop:    slot === 'dashboard-bottom' || slot === 'convert-result' ? '8px' : 0,
        marginBottom: slot === 'dashboard-top' ? '20px' : 0,
        overflow: 'hidden',
      }}>
        <ExoClickZone zone={ZONES[slot]} slot={slot} />
      </div>
    )
  }

  return <InternalPromo slot={slot} />
}