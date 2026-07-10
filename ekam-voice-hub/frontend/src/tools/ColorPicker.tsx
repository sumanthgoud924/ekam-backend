import { useState, useRef } from 'react'
import { Palette, Upload, Copy, Check, Crosshair } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ColorPicker() {
  const [image, setImage] = useState<string | null>(null)
  const [color, setColor] = useState<string>('#0d9488')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!canvasRef.current || !imgRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    if (!ctx) return

    // Ensure canvas matches image natural size for accurate pixel reading
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    }

    const rect = img.getBoundingClientRect()
    // Calculate scale between display size and natural size
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const pixelData = ctx.getImageData(x, y, 1, 1).data
    const hex = rgbToHex(pixelData[0], pixelData[1], pixelData[2])
    setColor(hex)
  }

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? 
      `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 
      'rgb(0, 0, 0)'
  }

  const copyColor = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Color copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="page-header">
        <div className="page-header-icon bg-gradient-to-br from-pink-500 to-rose-500 text-white">
          <Palette size={24} />
        </div>
        <div>
          <h1>Color Picker</h1>
          <p>Extract colors from images or pick any color</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="section-title">
            <Crosshair size={18} className="text-pink-500" /> Image Color Extractor
          </h2>
          
          {!image ? (
            <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Click to upload image</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 cursor-crosshair group">
                <img 
                  ref={imgRef}
                  src={image} 
                  alt="Upload preview" 
                  className="w-full h-auto object-contain max-h-[300px]"
                  onClick={handleImageClick}
                  crossOrigin="anonymous"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                  <span className="text-white text-sm font-medium flex items-center gap-2">
                    <Crosshair size={16} /> Click anywhere to pick color
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <label className="btn-secondary cursor-pointer text-xs py-1.5">
                  <Upload size={14} /> Replace Image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-6">
          <h2 className="section-title">
            <Palette size={18} className="text-rose-500" /> Selected Color
          </h2>
          
          <div className="flex items-center gap-6">
            <div 
              className="w-24 h-24 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 space-y-3">
              <div className="relative">
                <input 
                  type="color" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer opacity-0 absolute inset-0"
                />
                <div className="input flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <span className="font-mono font-bold tracking-wider">{color.toUpperCase()}</span>
                  <Palette size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="input flex-1 font-mono text-sm">{color.toUpperCase()}</div>
              <button onClick={() => copyColor(color.toUpperCase())} className="btn-secondary !p-2.5">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="input flex-1 font-mono text-sm">{hexToRgb(color)}</div>
              <button onClick={() => copyColor(hexToRgb(color))} className="btn-secondary !p-2.5">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
