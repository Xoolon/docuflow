import { useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  Sparkles, Upload, Copy, Download,
  AlertCircle, Zap, X, ShoppingCart,
} from 'lucide-react'

const AI_CSS = `
  .ai-root   { padding: 32px 28px; max-width: 920px; animation: fadeUp 0.4s ease; }
  .ai-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 28px; }
  .ai-grid   { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
  .ai-meta   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  @media (max-width: 760px) {
    .ai-root   { padding: 20px 16px; }
    .ai-header { flex-direction: column; gap: 8px; }
    .ai-grid   { grid-template-columns: 1fr; }
    .ai-tasks  { display: grid !important; grid-template-columns: repeat(3,1fr); gap: 6px !important; }
    .ai-tasks button { padding: 8px 6px !important; }
  }
  @media (max-width: 480px) {
    .ai-tasks  { grid-template-columns: repeat(2,1fr) !important; }
    .ai-meta   { grid-template-columns: 1fr; }
  }
`

const TASKS = [
  { id: 'generate',     label: '✨ Generate',     desc: 'Create from description' },
  { id: 'improve',      label: '🔧 Improve',       desc: 'Enhance clarity & flow'  },
  { id: 'professional', label: '💼 Professional',  desc: 'Formal business tone'    },
  { id: 'ats',          label: '🎯 ATS Optimise',  desc: 'Resume/CV optimization'  },
  { id: 'summarize',    label: '📋 Summarize',     desc: 'Concise key points'      },
  { id: 'reformat',     label: '✂️ Reformat',      desc: 'Clean structure'         },
]
const DOC_TYPES = ['Resume/CV','Cover Letter','Business Email','Report','Proposal','Meeting Notes','Blog Post','Other']
const ACCENT2   = '#00d4aa'
const MIN_TOKENS = 100

export default function AIPage() {
  const { user, refreshUser, deductTokensOptimistic } = useStore()
  const [task,       setTask]       = useState('improve')
  const [textInput,  setTextInput]  = useState('')
  const [docType,    setDocType]    = useState('')
  const [formatSpec, setFormatSpec] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState(null)
  const [extracting, setExtracting] = useState(false)
  const textareaRef = useRef(null)

  const balance   = user?.tokens_balance ?? 0
  const wordCount = textInput.trim().split(/\s+/).filter(Boolean).length
  const estTokens = Math.ceil(wordCount * 3.9)
  const canAfford = balance >= Math.max(MIN_TOKENS, estTokens)
  const isLow     = balance < MIN_TOKENS

  useEffect(() => {
    if (!document.getElementById('df-ai-css')) {
      const el = document.createElement('style'); el.id = 'df-ai-css'
      el.textContent = AI_CSS; document.head.appendChild(el)
    }
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (files) => {
      if (!files[0]) return
      setExtracting(true)
      const fd = new FormData(); fd.append('file', files[0])
      try {
        const res = await api.post('/ai/extract-text', fd)
        setTextInput(res.data.text)
        toast.success('Text extracted!')
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Could not extract text from this file.')
      } finally { setExtracting(false) }
    },
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    noClick: true,
  })

  const handleProcess = async () => {
    if (!textInput.trim()) { toast.error('Please enter some text first.'); return }
    if (isLow) { setError({ type: 'tokens', balance, needed: MIN_TOKENS }); return }
    setProcessing(true); setResult(null); setError(null)
    deductTokensOptimistic(estTokens)
    try {
      const res = await api.post('/ai/process', {
        task,
        text_input:    textInput,
        document_type: docType    || undefined,
        format_spec:   formatSpec || undefined,
        export_format: 'txt',
      })
      if (res.data?.result) {
        setResult(res.data)
        await refreshUser()
        toast.success(`✓ Done — ${res.data.tokens_used?.toLocaleString()} tokens used`)
      }
    } catch (err) {
      await refreshUser()
      const status = err.response?.status
      const detail = err.response?.data?.detail
      if (status === 402) {
        const needed  = err.response?.data?.detail?.required ?? estTokens
        const current = err.response?.data?.detail?.balance  ?? balance
        setError({ type: 'tokens', balance: current, needed })
      } else if (!err.response) {
        setError({ type: 'network' })
        toast.error('Cannot reach server. Check your connection.')
      } else {
        const msg = typeof detail === 'string' ? detail : detail?.message || 'AI processing failed. Please try again.'
        setError({ type: 'general', message: msg })
        toast.error(msg.length > 60 ? 'Processing failed — see details below.' : msg)
      }
    } finally { setProcessing(false) }
  }

  const handleCopy     = () => { if (result?.result) { navigator.clipboard.writeText(result.result); toast.success('Copied!') } }
  const handleDownload = () => {
    if (!result?.result) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([result.result], { type: 'text/plain' }))
    a.download = `docuflow_${task}.txt`; a.click()
  }

  const selectedTask = TASKS.find(t => t.id === task)

  return (
    <div className="ai-root">

      {/* Header */}
      <div className="ai-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            AI Document Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Generate, improve, and transform documents with AI
          </p>
        </div>
        {/* Token balance badge */}
        <div style={{ padding: '8px 14px', background: isLow ? 'rgba(255,107,107,0.1)' : 'rgba(0,212,170,0.1)', border: `1px solid ${isLow ? 'rgba(255,107,107,0.3)' : 'rgba(0,212,170,0.3)'}`, borderRadius: 'var(--radius-sm)', fontSize: '13px', color: isLow ? '#ff6b6b' : ACCENT2, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Zap size={13} />
          {balance.toLocaleString()} tokens {isLow && '— Low!'}
        </div>
      </div>

      <div className="ai-grid">

        {/* Task selector */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', paddingLeft: '4px' }}>AI Mode</div>
          <div className="ai-tasks" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TASKS.map(t => (
              <button key={t.id} onClick={() => setTask(t.id)}
                style={{ padding: '11px 13px', borderRadius: 'var(--radius-md)', border: `1px solid ${task === t.id ? 'rgba(108,99,255,0.4)' : 'transparent'}`, background: task === t.id ? 'rgba(108,99,255,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)' }}
                onMouseEnter={e => task !== t.id && (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => task !== t.id && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: '13px', fontWeight: task === t.id ? 600 : 400, color: task === t.id ? 'var(--accent-light)' : 'var(--text-primary)', marginBottom: '2px' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input / Output panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Optional settings */}
          <div className="ai-meta">
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: docType ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', appearance: 'none' }}>
                <option value="">Optional…</option>
                {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Format Requirements</label>
              <input type="text" placeholder="e.g. 2 pages, formal tone…" value={formatSpec} onChange={e => setFormatSpec(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>

          {/* Text input */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {task === 'generate' ? 'Description / Instructions' : 'Your Text'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <button type="button" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: extracting ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {extracting ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : <Upload size={12} />}
                    Upload file
                  </button>
                </div>
                {wordCount > 0 && (
                  <span style={{ fontSize: '12px', color: canAfford ? 'var(--text-muted)' : '#ff6b6b' }}>
                    ~{estTokens.toLocaleString()} tokens est.
                  </span>
                )}
              </div>
            </div>
            <textarea ref={textareaRef} value={textInput} onChange={e => { setTextInput(e.target.value); setError(null) }}
              placeholder={task === 'generate'
                ? 'Describe the document you want to create…\n\nE.g. "A formal resignation letter giving 2 weeks notice, professional and grateful tone."'
                : 'Paste your text here, or upload a file above…'}
              rows={10}
              style={{ width: '100%', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.7, resize: 'vertical', outline: 'none' }}
            />
          </div>

          {/* Error states — inline, dismissable */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={16} color="#ff6b6b" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ flex: 1 }}>
                {error.type === 'tokens' && (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ff6b6b', marginBottom: '4px' }}>Not enough tokens</div>
                    <div style={{ fontSize: '13px', color: '#ffaaaa', lineHeight: 1.5 }}>
                      This job needs roughly <strong>{error.needed?.toLocaleString()}</strong> tokens but your balance is <strong>{error.balance?.toLocaleString()}</strong>.
                    </div>
                    <a href="/buy-tokens" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '10px', padding: '7px 14px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 'var(--radius-sm)', color: '#ff6b6b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                      <ShoppingCart size={13} /> Buy more tokens
                    </a>
                  </>
                )}
                {error.type === 'network' && (
                  <div style={{ fontSize: '13px', color: '#ffaaaa' }}>Cannot reach server. Please check your connection and try again.</div>
                )}
                {error.type === 'general' && (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ff6b6b', marginBottom: '3px' }}>Processing failed</div>
                    <div style={{ fontSize: '13px', color: '#ffaaaa', lineHeight: 1.5 }}>{error.message}</div>
                  </>
                )}
              </div>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', padding: '0', flexShrink: 0 }}><X size={14} /></button>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleProcess}
            disabled={!textInput.trim() || processing || isLow}
            style={{ padding: '14px 32px', background: (!textInput.trim() || processing || isLow) ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #8b5cf6, #00d4aa)', border: 'none', borderRadius: 'var(--radius-md)', color: (!textInput.trim() || processing || isLow) ? 'var(--text-muted)' : 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', cursor: (!textInput.trim() || processing || isLow) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'var(--transition)', boxShadow: (textInput.trim() && !processing && !isLow) ? '0 0 32px rgba(139,92,246,0.3)' : 'none' }}>
            {processing
              ? <><div className="spinner" /> Processing with AI…</>
              : <><Sparkles size={17} /> {selectedTask?.label || 'Process'}</>
            }
          </button>

          {/* Result */}
          {result && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(0,212,170,0.05)', borderBottom: '1px solid rgba(0,212,170,0.15)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: ACCENT2, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✓ {result.task_display || selectedTask?.label} complete
                  {result.tokens_used > 0 && <span style={{ color: 'var(--text-muted)' }}>· {result.tokens_used.toLocaleString()} tokens</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopy} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Copy size={12} /> Copy
                  </button>
                  <button onClick={handleDownload} style={{ padding: '6px 12px', background: ACCENT2, border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={12} /> Download .txt
                  </button>
                </div>
              </div>
              <div style={{ padding: '20px', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto' }}>
                {result.result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}