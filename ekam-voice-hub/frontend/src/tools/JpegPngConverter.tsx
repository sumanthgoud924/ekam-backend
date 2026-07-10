import { useState, useRef } from 'react'
import { Image, Upload, Download, RefreshCw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import toast from 'react-hot-toast'

type FormatType = 'png' | 'jpeg' | 'webp' | 'bmp'
const formats: FormatType[] = ['png', 'jpeg', 'webp', 'bmp']

export default function JpegPngConverter() {
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [targetFormat, setTargetFormat] = useState<FormatType>('png')
  const [quality, setQuality] = useState(85)
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [newWidth, setNewWidth] = useState(0)
  const [newHeight, setNewHeight] = useState(0)
  const [maintainAspect, setMaintainAspect] = useState(true)

  const loadImageDimensions = (dataUrl: string) => {
    const img = document.createElement('img')
    img.onload = () => {
      setWidth(img.naturalWidth)
      setHeight(img.naturalHeight)
      setNewWidth(img.naturalWidth)
      setNewHeight(img.naturalHeight)
    }
    img.src = dataUrl
  }

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif', 'image/tiff', 'image/heic', 'image/heif', 'image/svg+xml']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif|tiff|heic|heif)$/i)) {
      toast.error('Unsupported image format')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setSourceImage(dataUrl)
      setSourceName(file.name)
      setConvertedUrl(null)
      loadImageDimensions(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const convert = () => {
    if (!sourceImage || !canvasRef.current) return
    setConverting(true)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = document.createElement('img')
    img.onload = () => {
      canvas.width = newWidth || width
      canvas.height = newHeight || height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : `image/${targetFormat}`
      const qualityVal = targetFormat === 'png' ? undefined : quality / 100
      const dataUrl = canvas.toDataURL(mimeType, qualityVal)
      setConvertedUrl(dataUrl)
      setConverting(false)
      toast.success(`Converted to ${targetFormat.toUpperCase()}`)
    }
    img.src = sourceImage
  }

  const downloadConverted = () => {
    if (!convertedUrl) return
    const a = document.createElement('a')
    const baseName = sourceName.replace(/\.[^.]+$/, '')
    a.href = convertedUrl
    a.download = `${baseName}-converted.${targetFormat}`
    a.click()
    toast.success('Downloaded')
  }

  const handleWidthChange = (w: number) => {
    setNewWidth(w)
    if (maintainAspect && width > 0) {
      setNewHeight(Math.round(w * (height / width)))
    }
  }

  const handleHeightChange = (h: number) => {
    setNewHeight(h)
    if (maintainAspect && height > 0) {
      setNewWidth(Math.round(h * (width / height)))
    }
  }

  const sizeLabel = (format: FormatType) => {
    switch (format) {
      case 'jpeg': return '.jpg'
      case 'png': return '.png'
      case 'webp': return '.webp'
      case 'bmp': return '.bmp'
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Image size={24} className="text-primary-500" /> JPEG/PNG Converter
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Convert between JPEG, PNG, WebP, and BMP formats. Resize while converting.
        </p>
      </div>

      {/* Upload */}
      {!sourceImage && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="card border-2 border-dashed py-12 text-center cursor-pointer hover:shadow-lg transition-all"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => document.getElementById('img-upload')?.click()}
        >
          <input
            id="img-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Upload an image</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Supports JPG, PNG, WebP, BMP, GIF, TIFF, HEIC</p>
        </div>
      )}

      {/* Editor */}
      {sourceImage && (
        <>
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sourceName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{width} × {height}px</p>
              </div>
              <button onClick={() => { setSourceImage(null); setConvertedUrl(null) }} className="btn-ghost text-sm !py-1.5">
                <RefreshCw size={14} /> New Image
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <img ref={imgRef} src={sourceImage} alt="Source" className="w-full max-h-64 object-contain" style={{ backgroundColor: 'var(--bg-secondary)' }} />
            </div>

            {/* Controls */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Target Format</label>
                <div className="flex gap-2">
                  {formats.map(f => (
                    <button
                      key={f}
                      onClick={() => setTargetFormat(f)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        targetFormat === f
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      style={{ color: targetFormat === f ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      {sizeLabel(f)}
                    </button>
                  ))}
                </div>
              </div>

              {targetFormat !== 'png' && (
                <div>
                  <label className="label">Quality: {quality}%</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Resize */}
            <div>
              <label className="label">Resize (optional)</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Width (px)</label>
                  <input
                    type="number"
                    value={newWidth}
                    onChange={e => handleWidthChange(Number(e.target.value))}
                    min="1"
                    max="10000"
                    className="input !py-1.5 text-sm"
                  />
                </div>
                <span className="text-lg mt-5" style={{ color: 'var(--text-muted)' }}>×</span>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Height (px)</label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={e => handleHeightChange(Number(e.target.value))}
                    min="1"
                    max="10000"
                    className="input !py-1.5 text-sm"
                  />
                </div>
                <label className="flex items-center gap-1.5 mt-5 cursor-pointer text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={maintainAspect}
                    onChange={e => setMaintainAspect(e.target.checked)}
                    className="rounded"
                  />
                  Lock ratio
                </label>
              </div>
            </div>

            <button onClick={convert} disabled={converting} className="btn-primary w-full">
              <RotateCw size={16} className={converting ? 'animate-spin' : ''} />
              {converting ? 'Converting...' : `Convert to ${targetFormat.toUpperCase()}`}
            </button>
          </div>

          {/* Result */}
          {convertedUrl && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Converted</h3>
                <button onClick={downloadConverted} className="btn-primary text-sm !py-2 !px-4">
                  <Download size={14} /> Download {sizeLabel(targetFormat)}
                </button>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <img src={convertedUrl} alt="Converted" className="w-full max-h-64 object-contain" style={{ backgroundColor: 'var(--bg-secondary)' }} />
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
    </div>
  )
}
