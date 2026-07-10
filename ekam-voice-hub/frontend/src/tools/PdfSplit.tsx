import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, Scissors, Loader2, Download, X } from 'lucide-react'
import { api } from '../api/client'

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null)
  const [ranges, setRanges] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const split = async () => {
    if (!file) { toast.error('Select a PDF'); return }
    if (!ranges.trim()) { toast.error('Enter page ranges'); return }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('page_ranges', ranges)
      const res = await api.post('/tools/pdf/split', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'split.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF split downloaded')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Split failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Scissors size={24} className="text-primary-500" /> Split PDF
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Extract specific pages from a PDF using page ranges.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="card border-2 border-dashed text-center py-10 transition-colors hover:border-primary-400"
        style={{ borderColor: 'var(--border)' }}
      >
        {file ? (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
              <button onClick={() => setFile(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>
            <div className="text-left">
              <label className="label">Page Ranges</label>
              <input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="e.g. 1-3, 5, 7-9"
                className="input"
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Comma-separated page numbers or ranges (e.g., &quot;1-3, 5, 7-9&quot;)
              </p>
            </div>
            <button onClick={split} disabled={loading || !ranges.trim()} className="btn-primary w-full">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Splitting...</> : <><Download size={18} /> Split & Download</>}
            </button>
          </div>
        ) : (
          <label className="cursor-pointer space-y-3">
            <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop a PDF here or click to upload</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select a PDF file to split</p>
            </div>
            <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}