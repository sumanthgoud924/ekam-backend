import { useState, useRef } from 'react'
import { Image, Upload, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ImageResizer() {
  const [source, setSource] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [origW, setOrigW] = useState(0)
  const [origH, setOrigH] = useState(0)
  const [newW, setNewW] = useState(0)
  const [newH, setNewH] = useState(0)
  const [lockRatio, setLockRatio] = useState(true)
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [quality, setQuality] = useState(85)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadImage = (dataUrl: string) => {
    const img = document.createElement('img')
    img.onload = () => {
      setOrigW(img.naturalWidth)
      setOrigH(img.naturalHeight)
      setNewW(img.naturalWidth)
      setNewH(img.naturalHeight)
    }
    img.src = dataUrl
  }

  const handleFile = (file: File) => {
    const valid = ['image/jpeg', 'image/png']
    if (!valid.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png)$/i)) {
      toast.error('Please upload a JPEG or PNG image')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      setSource(url)
      setSourceName(file.name)
      setResultUrl(null)
      loadImage(url)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleWChange = (w: number) => {
    setNewW(w)
    if (lockRatio && origW > 0) setNewH(Math.round(w * (origH / origW)))
  }

  const handleHChange = (h: number) => {
    setNewH(h)
    if (lockRatio && origH > 0) setNewW(Math.round(h * (origW / origH)))
  }

  const resize = () => {
    if (!source || !canvasRef.current) return
    setProcessing(true)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = document.createElement('img')
    img.onload = () => {
      canvas.width = newW
      canvas.height = newH
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, newW, newH)

      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
      const q = format === 'png' ? undefined : quality / 100
      const url = canvas.toDataURL(mime, q)
      setResultUrl(url)
      setProcessing(false)
      toast.success(`Resized to ${newW} x ${newH}px`)
    }
    img.src = source
  }

  const download = () => {
    if (!resultUrl) return
    const base = sourceName.replace(/\.[^.]+$/, '')
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `${base}-${newW}x${newH}.${format}`
    a.click()
    toast.success('Downloaded')
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Image size={24} className="text-primary-500" /> Image Resizer
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Resize JPEG and PNG images to exact dimensions. Maintain quality with high-quality canvas resampling.
        </p>
      </div>

      {!source && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="card border-2 border-dashed py-12 text-center cursor-pointer hover:shadow-lg transition-all"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => document.getElementById('resizer-upload')?.click()}
        >
          <input
            id="resizer-upload"
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload a JPEG or PNG image</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Drag & drop or click to browse</p>
        </div>
      )}

      {source && (
        <>
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sourceName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{origW} x {origH}px</p>
              </div>
              <button onClick={() => { setSource(null); setResultUrl(null) }} className="btn-ghost text-sm !py-1.5">
                <RefreshCw size={14} /> New Image
              </button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <img src={source} alt="Source" className="w-full max-h-64 object-contain" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Output Format</label>
                <div className="flex gap-2">
                  {(['jpeg', 'png'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        format === f ? 'bg-primary-500 text-white shadow-md' : ''
                      }`}
                      style={{ color: format === f ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      .{f}
                    </button>
                  ))}
                </div>
              </div>
              {format === 'jpeg' && (
                <div>
                  <label className="label">JPEG Quality: {quality}%</label>
                  <input
                    type="range" min="10" max="100" value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="label">New Dimensions</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Width (px)</label>
                  <input
                    type="number" value={newW}
                    onChange={e => handleWChange(Number(e.target.value))}
                    min="1" max="10000" className="input !py-1.5 text-sm"
                  />
                </div>
                <span className="text-lg mt-5" style={{ color: 'var(--text-muted)' }}>x</span>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Height (px)</label>
                  <input
                    type="number" value={newH}
                    onChange={e => handleHChange(Number(e.target.value))}
                    min="1" max="10000" className="input !py-1.5 text-sm"
                  />
                </div>
                <label className="flex items-center gap-1.5 mt-5 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={lockRatio} onChange={e => setLockRatio(e.target.checked)} className="rounded" />
                  Lock
                </label>
              </div>
            </div>

            <button onClick={resize} disabled={processing} className="btn-primary w-full">
              {processing ? 'Resizing...' : `Resize to ${newW} x ${newH}px`}
            </button>
          </div>

          {resultUrl && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Resized ({newW} x {newH}px)</h3>
                <button onClick={download} className="btn-primary text-sm !py-2 !px-4">
                  <Download size={14} /> Download .{format}
                </button>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <img src={resultUrl} alt="Resized" className="w-full max-h-64 object-contain" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </div>
  )
}
