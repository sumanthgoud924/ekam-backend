import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, RotateCw, Loader2, Download, X } from 'lucide-react'
import { api } from '../api/client'

const angleOptions = [
  { value: 90, label: '90° Clockwise' },
  { value: 180, label: '180° Flip' },
  { value: 270, label: '90° Counter-clockwise' },
]

export default function PdfRotate() {
  const [file, setFile] = useState<File | null>(null)
  const [angle, setAngle] = useState(90)
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

  const rotate = async () => {
    if (!file) { toast.error('Select a PDF'); return }
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('angle', String(angle))
      const res = await api.post('/tools/pdf/rotate', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rotated.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF rotated')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Rotation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <RotateCw size={24} className="text-primary-500" /> Rotate PDF
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Rotate all pages in a PDF by a chosen angle.
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
              <label className="label">Rotation Angle</label>
              <div className="flex gap-2">
                {angleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAngle(opt.value)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                      angle === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={{ color: angle === opt.value ? undefined : 'var(--text-secondary)', backgroundColor: angle === opt.value ? undefined : 'var(--bg-secondary)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={rotate} disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Rotating...</> : <><Download size={18} /> Rotate & Download</>}
            </button>
          </div>
        ) : (
          <label className="cursor-pointer space-y-3">
            <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop a PDF here or click to upload</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select a PDF file to rotate</p>
            </div>
            <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}