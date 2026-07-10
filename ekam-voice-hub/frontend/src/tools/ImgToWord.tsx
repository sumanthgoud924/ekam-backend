import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, Loader2, Download, X, Camera } from 'lucide-react'
import { api } from '../api/client'
import CameraCapture from '../components/CameraCapture'

export default function ImgToWord() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) setFile(f)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleCamera = (blob: Blob) => {
    const f = new File([blob], 'scan.jpg', { type: 'image/jpeg' })
    setFile(f)
  }

  const convert = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('language', 'eng')
      const res = await api.post('/tools/image-to-word', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${file.name.replace(/\.[^/.]+$/, '')}.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Word document downloaded')
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
          <FileSpreadsheet size={24} className="text-primary-500" /> Image to Word
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Extract text from images using OCR and save as a Word document.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="card border-2 border-dashed text-center py-12 transition-colors hover:border-primary-400"
        style={{ borderColor: 'var(--border)' }}
      >
        {file ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({Math.round(file.size / 1024)} KB)</span>
              <button onClick={() => setFile(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>
            <button onClick={convert} disabled={loading} className="btn-primary">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Converting...</> : <><Download size={18} /> Convert to Word</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="cursor-pointer block space-y-3">
              <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop an image here or click to upload</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG, JPEG, WEBP — up to 50MB</p>
              </div>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
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