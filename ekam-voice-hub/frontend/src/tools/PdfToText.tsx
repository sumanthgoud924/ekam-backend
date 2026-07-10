import { useState } from 'react'
import { FileText, Upload, Download, Copy, Check, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function PdfToText() {
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage } = useAuth()
  const [extracting, setExtracting] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [fileName, setFileName] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    if (!isPro) {
      const remaining = getRemainingUsage('pdfTools')
      if (remaining <= 0) {
        toast.error('Daily PDF credit limit reached! Upgrade to Pro.', { duration: 4000 })
        navigate('/upgrade')
        return
      }
    }

    setFileName(file.name)
    setError('')
    setExtracting(true)

    try {
      const text = await readPdfText(file)
      setExtractedText(text)
      trackUsage('pdfTools')
      if (!text.trim()) {
        toast.error('No text could be extracted. The PDF may be scanned.')
      } else {
        toast.success(`Extracted ${text.split(/\s+/).length} words`)
      }
    } catch (err) {
      setError('Failed to extract text. Try a different file.')
      toast.error('Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const readPdfText = async (file: File): Promise<string> => {
    const text = await file.text()
    const match = text.match(/<<\s*\/Type\s*\/Catalog[\s\S]*?>>/i)
    if (match) {
      const clean = text
        .replace(/\(([^)]*)\)/g, (_, content) => content + ' ')
        .replace(/<<[\s\S]*?>>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      return clean || 'Text extraction limited. Try using the Document Reader page for better results.'
    }

    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string
        const textMatch = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').match(/[A-Za-z0-9\s.,!?;:'"()-]{20,}/g)
        if (textMatch) {
          resolve(textMatch.join('\n').trim())
        } else {
          resolve('No readable text found. This PDF may contain only images.')
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\.pdf$/i, '') + '-extracted.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Text file downloaded')
  }

  const copyText = () => {
    navigator.clipboard.writeText(extractedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0
  const charCount = extractedText.length

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileText size={24} className="text-primary-500" /> PDF to Text
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Extract text content from PDF files. Works best with text-based PDFs.
        </p>
      </div>

      {/* Upload */}
      {!extractedText && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="card border-2 border-dashed py-12 text-center cursor-pointer hover:shadow-lg transition-all"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => document.getElementById('pdf-upload')?.click()}
        >
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload a PDF file</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Drag & drop or click to browse</p>
        </div>
      )}

      {extracting && (
        <div className="card text-center py-8">
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-primary-500" />
          <p style={{ color: 'var(--text-secondary)' }}>Extracting text from PDF...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => { setError(''); setExtractedText('') }} className="text-xs text-red-500 hover:underline mt-1">
              Try another file
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {extractedText && !extracting && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fileName}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {wordCount} words · {charCount} characters
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyText} className="btn-secondary text-sm !py-2 !px-3">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={downloadText} className="btn-primary text-sm !py-2 !px-3">
                <Download size={14} /> Download .txt
              </button>
            </div>
          </div>

          <div
            className="rounded-xl border p-4 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed font-mono"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {extractedText}
          </div>

          <button onClick={() => { setExtractedText(''); setFileName('') }} className="btn-ghost text-sm">
            Extract another PDF
          </button>
        </div>
      )}
    </div>
  )
}
