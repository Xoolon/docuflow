import { useState, useEffect } from 'react'
import api from '../utils/api'
import { ArrowLeftRight, Sparkles, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from 'lucide-react'

const HIST_CSS = `
  .hist-root { padding: 32px 28px; max-width: 760px; animation: fadeUp 0.4s ease; }
  .hist-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg-card); border-radius: var(--radius-md); padding: 4px; width: fit-content; max-width: 100%; overflow-x: auto; }
  @media (max-width: 560px) {
    .hist-root { padding: 20px 16px; }
    .hist-row  { padding: 12px 14px !important; }
    .hist-row-name { font-size: 13px !important; }
    .hist-row-icon { width: 30px !important; height: 30px !important; }
  }
`

export default function HistoryPage() {
  const [convJobs, setConvJobs] = useState([])
  const [aiJobs,   setAiJobs]   = useState([])
  const [tab,      setTab]      = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState(false)

  useEffect(() => {
    if (!document.getElementById('df-hist-css')) {
      const el = document.createElement('style'); el.id = 'df-hist-css'
      el.textContent = HIST_CSS; document.head.appendChild(el)
    }
    Promise.all([
      api.get('/convert/history?limit=50'),
      api.get('/ai/history?limit=50'),
    ]).then(([conv, ai]) => {
      setConvJobs(conv.data.map(j => ({ ...j, type: 'conversion' })))
      setAiJobs(ai.data.map(j  => ({ ...j, type: 'ai' })))
    }).catch(() => setFetchErr(true))
     .finally(() => setLoading(false))
  }, [])

  const allJobs  = [...convJobs, ...aiJobs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const displayed = tab === 'all' ? allJobs : tab === 'conversion' ? convJobs : aiJobs

  return (
    <div className="hist-root">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
          History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your recent conversions and AI generations</p>
      </div>

      {/* Tabs */}
      <div className="hist-tabs">
        {[
          { id: 'all',        label: `All (${allJobs.length})` },
          { id: 'conversion', label: `Conversions (${convJobs.length})` },
          { id: 'ai',         label: `AI (${aiJobs.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: tab === t.id ? 'var(--bg-elevated)' : 'transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer', transition: 'var(--transition)', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fetch error */}
      {fetchErr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)', color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>
          <AlertCircle size={16} />
          Could not load history. Please refresh the page.
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '68px', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={44} color="var(--border)" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            No {tab !== 'all' ? tab + ' ' : ''}history yet
          </p>
          <a href={tab === 'ai' ? '/ai' : '/convert'}
            style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-light)', fontSize: '13px', textDecoration: 'none' }}>
            {tab === 'ai' ? 'Try AI Studio →' : 'Convert a file →'}
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map(job => <HistoryRow key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}

function HistoryRow({ job }) {
  const isAI      = job.type === 'ai'
  const isSuccess = job.status === 'completed'
  const isFailed  = job.status === 'failed'
  const StatusIcon  = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock
  const statusColor = isSuccess ? 'var(--accent2)' : isFailed ? '#ff6b6b' : 'var(--text-muted)'

  return (
    <div className="hist-row" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="hist-row-icon" style={{ width: '36px', height: '36px', borderRadius: '10px', background: isAI ? 'rgba(0,212,170,0.1)' : 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isAI ? <Sparkles size={15} color="var(--accent2)" /> : <ArrowLeftRight size={15} color="var(--accent)" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hist-row-name" style={{ fontWeight: 500, fontSize: '14px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAI
            ? (job.prompt_preview || `AI: ${job.task || 'Generation'}`)
            : `${job.original_filename || 'File'} · ${job.input_format?.toUpperCase() ?? '?'} → ${job.output_format?.toUpperCase() ?? '?'}`
          }
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span>{new Date(job.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {job.watermarked && <span style={{ color: '#ff9f43' }}>· Watermarked</span>}
          {(job.tokens_used || job.tokens_charged) > 0 && (
            <span style={{ color: 'var(--accent2)' }}>· {(job.tokens_used || job.tokens_charged)?.toLocaleString()} tokens</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: statusColor, fontSize: '12px', flexShrink: 0 }}>
        <StatusIcon size={14} />
        <span style={{ textTransform: 'capitalize' }}>{job.status}</span>
      </div>
    </div>
  )
}