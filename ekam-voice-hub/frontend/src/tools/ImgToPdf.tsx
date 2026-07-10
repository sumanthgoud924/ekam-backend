import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileImage, Loader2, Download, X, Plus, Camera } from 'lucide-react'
import { api } from '../api/client'
import CameraCapture from '../components/CameraCapture'

export default function ImgToPdf() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (dropped.length) setFiles(prev => [...prev, ...dropped])
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (selected.length) setFiles(prev => [...prev, ...selected])
  }

  const handleCamera = (blob: Blob) => {
    const f = new File([blob], 'scan.jpg', { type: 'image/jpeg' })
    setFiles(prev => [...prev, f])
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const convert = async () => {
    if (!files.length) return
    setLoading(true)
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      const res = await api.post('/tools/image-to-pdf', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'converted.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Conversion failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileImage size={24} className="text-primary-500" /> Image to PDF
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Convert one or more images into a single PDF document.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="card border-2 border-dashed text-center py-12 transition-colors hover:border-primary-400"
        style={{ borderColor: 'var(--border)' }}
      >
        {files.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(f.size / 1024)}KB</span>
                  <button onClick={() => removeFile(i)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <label className="btn-secondary text-sm cursor-pointer">
                <Plus size={16} /> Add Images
                <input type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />
              </label>
              <button onClick={() => setShowCamera(true)} className="btn-secondary text-sm">
                <Camera size={16} /> Scan
              </button>
              <button onClick={convert} disabled={loading} className="btn-primary">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Converting...</> : <><Download size={18} /> Convert to PDF</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="cursor-pointer block space-y-3">
              <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop images here or click to upload</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG, WEBP — multiple files supported</p>
              </div>
              <input type="file" accept="image/*" multiple onChange={handleFile} className="hidden" />
            </label>
            <div className="flex items-center gap-3 justify-center">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
            </div>
            <button onClick={() => setShowCamera(true)} className="btn-secondary">
              <Camera size={18} /> Scan with Camera
            </button>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCamera}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}