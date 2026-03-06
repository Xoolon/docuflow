import { useState, useEffect } from 'react'
import api from '../utils/api'
import { ArrowLeftRight, Sparkles, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'

export default function HistoryPage() {
  const [convJobs, setConvJobs] = useState([])
  const [aiJobs, setAiJobs] = useState([])
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/convert/history?limit=50'),
      api.get('/ai/history?limit=50'),
    ]).then(([conv, ai]) => {
      setConvJobs(conv.data.map(j => ({ ...j, type: 'conversion' })))
      setAiJobs(ai.data.map(j => ({ ...j, type: 'ai' })))
    }).finally(() => setLoading(false))
  }, [])

  const allJobs = [...convJobs, ...aiJobs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const displayed = tab === 'all' ? allJobs : tab === 'conversion' ? convJobs : aiJobs

  return (
    <div style={{ padding: '40px', animation: 'fadeUp 0.4s ease', maxWidth: '760px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your recent conversions and AI generations</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'all', label: `All (${allJobs.length})` },
          { id: 'conversion', label: `Conversions (${convJobs.length})` },
          { id: 'ai', label: `AI (${aiJobs.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: tab === t.id ? 500 : 400,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '68px', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 0',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}>
          <FileText size={48} color="var(--border)" style={{ marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
          No {tab !== 'all' ? tab : ''} history yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayed.map(job => (
            <HistoryRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryRow({ job }) {
  const isAI = job.type === 'ai'
  const isSuccess = job.status === 'completed'
  const isFailed = job.status === 'failed'

  const StatusIcon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock
  const statusColor = isSuccess ? 'var(--accent2)' : isFailed ? '#ff6b6b' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}>
      <div style={{
        width: '36px', height: '36px',
        borderRadius: '10px',
        background: isAI ? 'rgba(0,212,170,0.1)' : 'rgba(108,99,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isAI
          ? <Sparkles size={16} color="var(--accent2)" />
          : <ArrowLeftRight size={16} color="var(--accent)" />
        }
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isAI
            ? (job.prompt_preview || 'AI Generation')
            : `${job.original_filename || 'File'} · ${job.input_format?.toUpperCase()} → ${job.output_format?.toUpperCase()}`
          }
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(job.created_at).toLocaleString([], {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
          {job.watermarked && ' · Watermarked'}
          {job.tokens_used && ` · ${job.tokens_used} tokens`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontSize: '12px' }}>
        <StatusIcon size={14} />
        <span>{job.status}</span>
      </div>
    </div>
  )
}