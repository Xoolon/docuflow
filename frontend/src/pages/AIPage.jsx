import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  Sparkles, Upload, Copy, Download,
  AlertCircle, Zap,
} from 'lucide-react'

const TASKS = [
  { id: 'generate',     label: '✨ Generate Document',  desc: 'Create from a description' },
  { id: 'improve',      label: '🔧 Improve Writing',     desc: 'Enhance clarity & flow'    },
  { id: 'professional', label: '💼 Make Professional',   desc: 'Formal business tone'      },
  { id: 'ats',          label: '🎯 Optimize for ATS',    desc: 'Resume/CV optimization'    },
  { id: 'summarize',    label: '📋 Summarize',           desc: 'Concise key points'        },
  { id: 'reformat',     label: '✂️ Reformat Cleanly',    desc: 'Clean structure & layout'  },
]

const DOC_TYPES = ['Resume/CV', 'Cover Letter', 'Business Email', 'Report', 'Proposal', 'Meeting Notes', 'Blog Post', 'Other']
const ACCENT2   = '#00d4aa'
const MIN_TOKENS = 100  // minimum needed to try a job

export default function AIPage() {
  const { user, refreshUser, deductTokensOptimistic } = useStore()
  const [task,       setTask]       = useState('improve')
  const [textInput,  setTextInput]  = useState('')
  const [docType,    setDocType]    = useState('')
  const [formatSpec, setFormatSpec] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result,     setResult]     = useState(null)
  const [extracting, setExtracting] = useState(false)
  const textareaRef = useRef(null)

  const balance    = user?.tokens_balance ?? 0
  const wordCount  = textInput.trim().split(/\s+/).filter(Boolean).length
  // Rough estimate: 1 word ≈ 1.3 tokens for input, assume ~2x output → 3.9x total
  const estTokens  = Math.ceil(wordCount * 3.9)
  const canAfford  = balance >= Math.max(MIN_TOKENS, estTokens)
  const isLow      = balance < MIN_TOKENS

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      if (!files[0]) return
      setExtracting(true)
      const fd = new FormData()
      fd.append('file', files[0])
      try {
        const res = await api.post('/ai/extract-text', fd)
        setTextInput(res.data.text)
        toast.success('Text extracted!')
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Could not extract text.')
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
    if (isLow) { toast.error('Not enough tokens. Top up to continue.'); return }

    setProcessing(true)
    setResult(null)

    // Optimistically deduct estimated tokens so the meter updates instantly
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
        // Refresh actual balance from server (replaces optimistic value)
        await refreshUser()
        toast.success(`Done! ${res.data.tokens_used?.toLocaleString()} tokens used.`)
      }
    } catch (err) {
      // Roll back optimistic deduction
      await refreshUser()
      const detail = err.response?.data?.detail
      if (err.response?.status === 402) {
        toast.error('Not enough tokens. Buy more to continue.')
      } else {
        toast.error(typeof detail === 'string' ? detail : (detail?.message || 'Processing failed.'))
      }
    } finally { setProcessing(false) }
  }

  const handleCopy = () => {
    if (result?.result) { navigator.clipboard.writeText(result.result); toast.success('Copied!') }
  }

  const handleDownload = () => {
    if (!result?.result) return
    const a   = document.createElement('a')
    a.href    = URL.createObjectURL(new Blob([result.result], { type: 'text/plain' }))
    a.download = `docuflow_${task}.txt`
    a.click()
  }

  const selectedTask = TASKS.find(t => t.id === task)

  return (
    <div style={{ padding: '40px', animation: 'fadeUp 0.4s ease', maxWidth: '920px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            AI Document Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Generate, improve, and transform documents with AI
          </p>
        </div>

        {/* Live token balance badge */}
        <div style={{
          padding: '8px 14px',
          background: isLow ? 'rgba(255,107,107,0.1)' : 'rgba(0,212,170,0.1)',
          border: `1px solid ${isLow ? 'rgba(255,107,107,0.3)' : 'rgba(0,212,170,0.3)'}`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          color: isLow ? '#ff6b6b' : ACCENT2,
          fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Zap size={13} />
          {balance.toLocaleString()} tokens remaining
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Task selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', padding: '0 4px' }}>
            AI Mode
          </div>
          {TASKS.map(t => (
            <button
              key={t.id}
              onClick={() => setTask(t.id)}
              style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${task === t.id ? 'rgba(108,99,255,0.4)' : 'transparent'}`,
                background: task === t.id ? 'rgba(108,99,255,0.1)' : 'transparent',
                textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)',
              }}
              onMouseEnter={e => task !== t.id && (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => task !== t.id && (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: '13px', fontWeight: task === t.id ? 600 : 400, color: task === t.id ? 'var(--accent-light)' : 'var(--text-primary)', marginBottom: '2px' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Input / Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Optional settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: docType ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', appearance: 'none' }}>
                <option value="">Optional...</option>
                {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Format Requirements</label>
              <input type="text" placeholder="e.g. 2 pages, formal tone..." value={formatSpec} onChange={e => setFormatSpec(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Text input */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {task === 'generate' ? 'Description / Instructions' : 'Your Text'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <button type="button"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: extracting ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {extracting ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : <Upload size={12} />}
                    Upload file
                  </button>
                </div>
                {wordCount > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ~{estTokens.toLocaleString()} tokens est.
                  </span>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={task === 'generate'
                ? 'Describe the document you want to create...\n\nE.g. "A formal resignation letter giving 2 weeks notice, professional and grateful tone."'
                : 'Paste your text here, or upload a file above...'
              }
              rows={10}
              style={{
                width: '100%', padding: '16px',
                background: 'var(--bg-card)',
                border: `1px solid ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
                fontSize: '14px', lineHeight: 1.7, resize: 'vertical', outline: 'none',
              }}
            />
          </div>

          {/* Insufficient token warning */}
          {isLow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ff6b6b' }}>
              <AlertCircle size={14} />
              Not enough tokens. <a href="/buy-tokens" style={{ color: '#ff6b6b', fontWeight: 600, marginLeft: '4px' }}>Buy more →</a>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleProcess}
            disabled={!textInput.trim() || processing || isLow}
            style={{
              padding: '14px 32px',
              background: !textInput.trim() || processing || isLow
                ? 'var(--bg-elevated)'
                : 'linear-gradient(135deg, #8b5cf6, var(--accent2))',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: !textInput.trim() || processing || isLow ? 'var(--text-muted)' : 'white',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
              cursor: !textInput.trim() || processing || isLow ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'var(--transition)',
              boxShadow: textInput.trim() && !processing && !isLow ? '0 0 32px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            {processing
              ? <><div className="spinner" /> Processing with AI...</>
              : <><Sparkles size={18} /> {selectedTask?.label || 'Process'}</>
            }
          </button>

          {/* Result */}
          {result && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ padding: '14px 20px', background: 'rgba(0,212,170,0.05)', borderBottom: '1px solid rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', color: ACCENT2, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✓ {result.task_display} complete
                  {result.tokens_used > 0 && <span style={{ color: 'var(--text-muted)' }}>· {result.tokens_used.toLocaleString()} tokens used</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopy} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Copy size={12} /> Copy
                  </button>
                  <button onClick={handleDownload} style={{ padding: '6px 14px', background: ACCENT2, border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Download size={12} /> Download .txt
                  </button>
                </div>
              </div>
              <div style={{ padding: '24px', fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto' }}>
                {result.result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}