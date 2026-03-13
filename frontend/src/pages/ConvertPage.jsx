import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import AdBanner from '../components/AdBanner.jsx'
import LoginPromptModal from '../components/LoginPromptModal'
import {
  Upload, ArrowRight, Download, X,
  AlertCircle, Lock, RefreshCw, ShoppingCart,
} from 'lucide-react'

const CONVERT_CSS = `
  .conv-root   { padding: 32px 28px; max-width: 760px; animation: fadeUp 0.4s ease; }
  .conv-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 28px; }
  @media (max-width: 560px) {
    .conv-root   { padding: 20px 16px; }
    .conv-header { flex-direction: column; gap: 8px; }
    .conv-badge  { align-self: flex-start; }
  }
`

const CONVERSION_MAP = {
  pdf:  ['docx','txt'],
  docx: ['pdf','txt','html'],
  doc:  ['pdf','txt','html'],
  txt:  ['docx','pdf'],
  md:   ['pdf','docx','html'],
  html: ['pdf','docx'],
  jpg:  ['png','webp'], jpeg: ['png','webp'],
  png:  ['jpg','webp'], webp: ['jpg','png'],
  heic: ['jpg','png'],  svg:  ['png'],
  gif:  ['png','jpg'],  csv:  ['xlsx'], xlsx: ['csv'],
}
const FORMAT_ICONS = {
  pdf:'📄',docx:'📝',txt:'📋',html:'🌐',md:'📑',
  jpg:'🖼️',png:'🖼️',webp:'🖼️',gif:'🎞️',csv:'📊',xlsx:'📊',svg:'🎨',heic:'📸',
}

export default function ConvertPage() {
  const { user, refreshUser, deductTokensOptimistic, setShowUpgradeModal } = useStore()
  const [file,          setFile]          = useState(null)
  const [targetFormat,  setTargetFormat]  = useState('')
  const [converting,    setConverting]    = useState(false)
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Guest = no token. They can still use the UI up to the Convert button.
  const isGuest   = !user
  const balance   = user?.tokens_balance   ?? 0
  const isPaid    = (user?.tokens_purchased ?? 0) > 0
  const isImage   = file ? ['jpg','jpeg','png','webp','heic','svg','gif'].includes(file.name.split('.').pop().toLowerCase()) : false
  const tokenCost = isImage ? 200 : 500
  const canAfford = isGuest ? true : balance >= tokenCost  // guests see no balance warning
  const inputExt  = file ? file.name.split('.').pop().toLowerCase() : null
  const availableFormats = inputExt ? (CONVERSION_MAP[inputExt] || []) : []

  useEffect(() => {
    if (!document.getElementById('df-conv-css')) {
      const el = document.createElement('style'); el.id = 'df-conv-css'
      el.textContent = CONVERT_CSS; document.head.appendChild(el)
    }
  }, [])

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setTargetFormat(''); setResult(null); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, maxSize: 25 * 1024 * 1024,
    onDropRejected: (r) => {
      if (r[0]?.errors[0]?.code === 'file-too-large') toast.error('File too large. Max 25 MB.')
      else toast.error('File type not supported.')
    }
  })

  const handleConvert = async () => {
    if (!file || !targetFormat) return

    // Gate guests at the convert button — show signup prompt
    if (isGuest) {
      setShowLoginPrompt(true)
      return
    }

    if (!canAfford) { setShowUpgradeModal(true); return }
    setConverting(true); setResult(null); setError(null)
    deductTokensOptimistic(tokenCost)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('output_format', targetFormat)
    try {
      const res = await api.post('/convert/', formData, { responseType: 'blob' })
      const outputFilename = `${file.name.replace(/\.[^.]+$/, '')}.${targetFormat}`
      const url = URL.createObjectURL(res.data)
      const watermarked   = res.headers['x-watermarked'] === 'true'
      const tokensCharged = parseInt(res.headers['x-tokens-charged'] || tokenCost, 10)
      setResult({ url, filename: outputFilename, watermarked, size: res.data.size, tokensCharged })
      await refreshUser()
      toast.success(`✓ Converted — ${tokensCharged.toLocaleString()} tokens used`)
    } catch (err) {
      await refreshUser()
      const status = err.response?.status
      let errMsg = 'Conversion failed. Please try again.'
      if (status === 402) {
        errMsg = `Not enough tokens. This conversion costs ${tokenCost.toLocaleString()} tokens.`
        setShowUpgradeModal(true)
      } else if (status === 400) {
        errMsg = err.response?.data?.detail || 'Format not supported.'
      } else if (status === 413) {
        errMsg = 'File too large. Max 25 MB.'
      } else if (!err.response) {
        errMsg = 'Cannot reach server. Check your connection.'
      } else if (typeof err.response?.data?.detail === 'string') {
        errMsg = err.response.data.detail
      }
      setError(errMsg)
      if (errMsg.length <= 60) toast.error(errMsg)
    } finally { setConverting(false) }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.url; a.download = result.filename; a.click()
  }

  const handleReset = () => {
    setFile(null); setTargetFormat(''); setResult(null); setError(null)
    if (result?.url) URL.revokeObjectURL(result.url)
  }

  return (
    <div className="conv-root">
      {showLoginPrompt && (
        <LoginPromptModal
          filename={file?.name}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Header */}
      <div className="conv-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            File Converter
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Convert documents & images between formats — free to try
          </p>
        </div>
        {!isGuest && (
          <div className="conv-badge" style={{ padding: '8px 14px', background: canAfford ? 'rgba(0,212,170,0.1)' : 'rgba(255,107,107,0.1)', border: `1px solid ${canAfford ? 'rgba(0,212,170,0.3)' : 'rgba(255,107,107,0.3)'}`, borderRadius: 'var(--radius-sm)', fontSize: '13px', color: canAfford ? '#00d4aa' : '#ff6b6b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {balance.toLocaleString()} tokens
          </div>
        )}
      </div>

      {/* Drop zone or file panel */}
      {!file ? (
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border-bright)'}`, borderRadius: 'var(--radius-xl)', padding: 'clamp(36px,8vw,64px) clamp(20px,5vw,40px)', textAlign: 'center', cursor: 'pointer', background: isDragActive ? 'rgba(108,99,255,0.04)' : 'var(--bg-card)', transition: 'var(--transition)' }}>
          <input {...getInputProps()} />
          <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', background: isDragActive ? 'rgba(108,99,255,0.15)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={24} color={isDragActive ? 'var(--accent)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
            {isDragActive ? 'Drop to upload' : 'Drop your file here'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>or click to browse · max 25 MB</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
            {['PDF','DOCX','TXT','HTML','MD','JPG','PNG','WEBP','SVG','CSV','XLSX'].map(f => (
              <span key={f} style={{ padding: '3px 10px', background: 'var(--bg-elevated)', borderRadius: '100px', fontSize: '12px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{f}</span>
            ))}
          </div>
          {isGuest && (
            <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              No account needed to upload — sign in only to convert
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File info */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', background: 'rgba(108,99,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
              {FORMAT_ICONS[inputExt] || '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{(file.size/1024/1024).toFixed(2)} MB · .{inputExt?.toUpperCase()}</div>
            </div>
            <button onClick={handleReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}>
              <X size={17} />
            </button>
          </div>

          {/* Format selector */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Convert to</div>
            {availableFormats.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 'var(--radius-md)', color: '#ff9f43', fontSize: '14px' }}>
                <AlertCircle size={15} /> No conversions available for .{inputExt}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {availableFormats.map(fmt => (
                  <button key={fmt} onClick={() => setTargetFormat(fmt)}
                    style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: `2px solid ${targetFormat === fmt ? 'var(--accent)' : 'var(--border)'}`, background: targetFormat === fmt ? 'rgba(108,99,255,0.12)' : 'var(--bg-elevated)', color: targetFormat === fmt ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{FORMAT_ICONS[fmt] || '📄'}</span> .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Watermark notice (logged-in free users only) */}
          {!isGuest && !isPaid && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(255,159,67,0.06)', border: '1px solid rgba(255,159,67,0.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ff9f43' }}>
              <Lock size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Free tier: output will include a watermark.{' '}
                <button onClick={() => setShowUpgradeModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontFamily: 'var(--font-body)', fontSize: '13px', textDecoration: 'underline', padding: 0 }}>
                  Remove →
                </button>
              </span>
            </div>
          )}

          {/* Guest CTA hint */}
          {isGuest && targetFormat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-light)' }}>
              <span style={{ fontSize: '16px' }}>🎉</span>
              Free account gets 10,000 tokens — enough for 20 conversions.
            </div>
          )}

          {/* Insufficient token warning */}
          {!isGuest && !canAfford && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ff6b6b' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '3px' }}>Not enough tokens</div>
                <div style={{ lineHeight: 1.5 }}>
                  Needs <strong>{tokenCost.toLocaleString()}</strong> · you have <strong>{balance.toLocaleString()}</strong>.{' '}
                  <a href="/buy-tokens" style={{ color: '#ff6b6b', fontWeight: 600 }}>Buy more →</a>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#ff6b6b' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '3px' }}>Conversion failed</div>
                <div style={{ lineHeight: 1.5, color: '#ffaaaa' }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b', padding: 0, flexShrink: 0 }}><X size={14} /></button>
            </div>
          )}

          {/* Convert button */}
          <button onClick={handleConvert}
            disabled={!targetFormat || converting || availableFormats.length === 0 || (!isGuest && !canAfford)}
            style={{ padding: '14px 32px', background: (!targetFormat || converting || (!isGuest && !canAfford)) ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent), #8b84ff)', border: 'none', borderRadius: 'var(--radius-md)', color: (!targetFormat || converting || (!isGuest && !canAfford)) ? 'var(--text-muted)' : 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', cursor: (!targetFormat || converting) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'var(--transition)', boxShadow: (targetFormat && !converting && (isGuest || canAfford)) ? 'var(--shadow-accent)' : 'none' }}>
            {converting
              ? <><div className="spinner" /> Converting…</>
              : isGuest
                ? <><ArrowRight size={17} /> Convert {inputExt ? `.${inputExt.toUpperCase()}` : ''}{targetFormat ? ` → .${targetFormat.toUpperCase()}` : ''} — free</>
                : <><ArrowRight size={17} /> Convert {inputExt ? `.${inputExt.toUpperCase()}` : ''}{targetFormat ? ` → .${targetFormat.toUpperCase()}` : ''}</>
            }
          </button>

          {/* Result */}
          {result && (
            <>
              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', animation: 'fadeUp 0.3s ease' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#00d4aa', marginBottom: '3px' }}>✓ Ready to download</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {result.filename} · {(result.size/1024).toFixed(1)} KB
                      {result.watermarked && ' · Watermarked (free tier)'}
                      {result.tokensCharged && ` · ${result.tokensCharged.toLocaleString()} tokens used`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={handleReset} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <RefreshCw size={12} /> New
                    </button>
                    <button onClick={handleDownload} style={{ padding: '8px 18px', background: '#00d4aa', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Ad banner — only for free logged-in users, shown after result */}
              {!isGuest && (
                <AdBanner variant="convert-result" isPaid={isPaid} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}