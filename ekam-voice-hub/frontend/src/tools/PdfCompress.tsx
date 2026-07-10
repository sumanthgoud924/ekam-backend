import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, ImageDown, Loader2, Download, X } from 'lucide-react'
import { api } from '../api/client'

export default function PdfCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState(60)
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

  const compress = async () => {
    if (!file) { toast.error('Select a PDF'); return }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('quality', String(quality))
      const res = await api.post('/tools/pdf/compress', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compressed.pdf'
      a.click()
      URL.revokeObjectURL(url)
      const saved = Math.round((1 - res.data.size / file.size) * 100)
      toast.success(`Compressed! Saved ~${saved}%`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Compression failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ImageDown size={24} className="text-primary-500" /> Compress PDF
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Reduce PDF file size while keeping good quality.
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({Math.round(file.size / 1024)} KB)</span>
              <button onClick={() => setFile(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>
            <div className="text-left">
              <label className="label">Quality: {quality}%</label>
              <input
                type="range"
                min={10}
                max={95}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Smaller</span>
                <span>Better quality</span>
              </div>
            </div>
            <button onClick={compress} disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Compressing...</> : <><Download size={18} /> Compress & Download</>}
            </button>
          </div>
        ) : (
          <label className="cursor-pointer space-y-3">
            <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop a PDF here or click to upload</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select a PDF file to compress</p>
            </div>
            <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}