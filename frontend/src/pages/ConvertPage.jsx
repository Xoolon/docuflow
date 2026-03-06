import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../store/useStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  Upload, ArrowRight, Download, X, FileText,
  Image, AlertCircle, Lock, Sparkles, RefreshCw
} from 'lucide-react'

const CONVERSION_MAP = {
  pdf: ['docx', 'txt'],
  docx: ['pdf', 'txt', 'html'],
  doc: ['pdf', 'txt', 'html'],
  txt: ['docx', 'pdf'],
  md: ['pdf', 'docx', 'html'],
  html: ['pdf', 'docx'],
  jpg: ['png', 'webp'],
  jpeg: ['png', 'webp'],
  png: ['jpg', 'webp'],
  webp: ['jpg', 'png'],
  heic: ['jpg', 'png'],
  svg: ['png'],
  gif: ['png', 'jpg'],
  csv: ['xlsx'],
  xlsx: ['csv'],
}

const FORMAT_ICONS = {
  pdf: '📄', docx: '📝', txt: '📋', html: '🌐',
  md: '📑', jpg: '🖼️', png: '🖼️', webp: '🖼️',
  gif: '🎞️', csv: '📊', xlsx: '📊', svg: '🎨', heic: '📸',
}

export default function ConvertPage() {
  const { user, refreshUser, deductTokensOptimistic, setShowUpgradeModal } = useStore()
  const [file, setFile] = useState(null)
  const [targetFormat, setTargetFormat] = useState('')
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState(null)

  const balance   = user?.tokens_balance   ?? 0
  const isPaying  = (user?.tokens_purchased ?? 0) > 0
  const isImage   = file ? ['jpg','jpeg','png','webp','heic','svg','gif'].includes(
    file.name.split('.').pop().toLowerCase()
  ) : false
  const tokenCost = isImage ? 200 : 500
  const canAfford = balance >= tokenCost

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setTargetFormat('')
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    onDropRejected: (r) => {
      if (r[0]?.errors[0]?.code === 'file-too-large') toast.error('File too large. Maximum 25MB.')
      else toast.error('File rejected.')
    }
  })

  const inputExt = file ? file.name.split('.').pop().toLowerCase() : null
  const availableFormats = inputExt ? (CONVERSION_MAP[inputExt] || []) : []

  const handleConvert = async () => {
    if (!file || !targetFormat) return

    if (!canAfford) {
      setShowUpgradeModal(true)
      return
    }

    setConverting(true)
    setResult(null)

    // Optimistic deduction so the sidebar meter updates instantly
    deductTokensOptimistic(tokenCost)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('output_format', targetFormat)

    try {
      const res = await api.post('/convert/', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const outputFilename = `${file.name.replace(/\.[^.]+$/, '')}.${targetFormat}`
      const url = URL.createObjectURL(res.data)
      const watermarked = res.headers['x-watermarked'] === 'true'
      const tokensCharged = parseInt(res.headers['x-tokens-charged'] || tokenCost, 10)

      setResult({ url, filename: outputFilename, watermarked, size: res.data.size, tokensCharged })
      // Refresh actual balance from server
      await refreshUser()
      toast.success(`Converted! ${tokensCharged} tokens used.`)
    } catch (err) {
      // Roll back optimistic deduction
      await refreshUser()
      if (err.response?.status === 402) {
        setShowUpgradeModal(true)
        toast.error('Not enough tokens. Buy more to continue.')
      } else {
        const detail = err.response?.data?.detail
        toast.error(typeof detail === 'string' ? detail : 'Conversion failed. Please try again.')
      }
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.url
    a.download = result.filename
    a.click()
  }

  const handleReset = () => {
    setFile(null)
    setTargetFormat('')
    setResult(null)
    if (result?.url) URL.revokeObjectURL(result.url)
  }

  return (
    <div style={{ padding: '40px', animation: 'fadeUp 0.4s ease', maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            File Converter
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Convert documents & images between formats instantly
          </p>
        </div>
{!isPaying && (
  <div style={{
    padding: '8px 14px',
    background: balance < 500 ? 'rgba(255,107,107,0.1)' : 'rgba(108,99,255,0.1)',
    border: `1px solid ${balance < 500 ? 'rgba(255,107,107,0.3)' : 'rgba(108,99,255,0.3)'}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: balance < 500 ? '#ff6b6b' : 'var(--accent-light)',
    fontWeight: 500,
  }}>
    {balance.toLocaleString()} tokens left
  </div>
)}
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border-bright)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '64px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragActive ? 'rgba(108,99,255,0.04)' : 'var(--bg-card)',
            transition: 'var(--transition)',
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: '64px', height: '64px',
            background: 'rgba(108,99,255,0.1)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Upload size={28} color="var(--accent)" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>
            {isDragActive ? 'Drop it here!' : 'Drop your file here'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            or click to browse — max 25MB
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {['PDF', 'DOCX', 'TXT', 'MD', 'HTML', 'JPG', 'PNG', 'WEBP', 'CSV', 'XLSX'].map(f => (
              <span key={f} style={{
                padding: '3px 10px',
                background: 'var(--bg-elevated)',
                borderRadius: '100px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File info card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'rgba(108,99,255,0.1)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', flexShrink: 0,
            }}>
              {FORMAT_ICONS[inputExt] || '📄'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 500, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB · .{inputExt?.toUpperCase()}
              </div>
            </div>
            <button onClick={handleReset} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px',
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Format selector */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Convert to
            </div>

            {availableFormats.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b', fontSize: '14px' }}>
                <AlertCircle size={16} />
                No conversions available for .{inputExt} files
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {availableFormats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${targetFormat === fmt ? 'var(--accent)' : 'var(--border)'}`,
                      background: targetFormat === fmt ? 'rgba(108,99,255,0.12)' : 'var(--bg-elevated)',
                      color: targetFormat === fmt ? 'var(--accent-light)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{FORMAT_ICONS[fmt] || '📄'}</span>
                    .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Free tier notice */}
          {!isPaying && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: 'rgba(255,159,67,0.06)',
              border: '1px solid rgba(255,159,67,0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: '#ff9f43',
            }}>
              <Lock size={14} />
              Free tier: Output will include a DocuFlow watermark.{' '}
              <button onClick={() => setShowUpgradeModal(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-light)', fontFamily: 'var(--font-body)', fontSize: '13px',
                textDecoration: 'underline', padding: 0,
              }}>
                Upgrade to remove →
              </button>
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={handleConvert}
            disabled={!targetFormat || converting || availableFormats.length === 0}
            style={{
              padding: '14px 32px',
              background: !targetFormat || converting ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent), #8b84ff)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: !targetFormat || converting ? 'var(--text-muted)' : 'white',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '15px',
              cursor: !targetFormat || converting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'var(--transition)',
              boxShadow: targetFormat && !converting ? 'var(--shadow-accent)' : 'none',
            }}
          >
            {converting ? (
              <><div className="spinner" /> Converting...</>
            ) : (
              <><ArrowRight size={18} /> Convert {inputExt ? `.${inputExt.toUpperCase()}` : ''} {targetFormat ? `→ .${targetFormat.toUpperCase()}` : ''}</>
            )}
          </button>

          {/* Result */}
          {result && (
            <div style={{
              background: 'rgba(0,212,170,0.06)',
              border: '1px solid rgba(0,212,170,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              animation: 'fadeUp 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--accent2)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✓ Ready to download
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {result.filename} · {(result.size / 1024).toFixed(1)} KB
                    {result.watermarked && ' · Watermarked (Free tier)'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleReset} style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <RefreshCw size={13} /> New
                  </button>
                  <button onClick={handleDownload} style={{
                    padding: '8px 20px',
                    background: 'var(--accent2)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}