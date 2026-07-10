import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Sparkles, Upload, Loader2, Download, X, Camera, Copy, Check, Info, RefreshCw,
} from 'lucide-react'
import { aiDescribeImage } from '../api/client'
import CameraCapture from '../components/CameraCapture'
import { useAuth } from '../contexts/AuthContext'

const PRESET_PROMPTS = [
  { label: 'Detailed Description', text: 'Describe this image in detail, capturing all visible objects, colors, text, and context.' },
  { label: 'Accessibility Alt-Text', text: 'Generate a descriptive, concise alt text suitable for web accessibility (HTML img alt attribute).' },
  { label: 'Extract Layout & Symbols', text: 'Analyze and list all visual components, symbols, layout sections, and key elements in this image.' },
  { label: 'Chart & Diagram Breakdown', text: 'Analyze this chart, graph, or diagram. Explain its metrics, axes, flows, and core insights.' },
  { label: 'Translate Visible Text', text: 'Find any text visible in this image and translate it to English, preserving headings.' },
]

export default function AIVision() {
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [customPrompt, setCustomPrompt] = useState(PRESET_PROMPTS[0].text)
  const [activePreset, setActivePreset] = useState(0)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (f: File) => {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setResult('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) {
      handleFileChange(f)
    } else {
      toast.error('Please upload an image file')
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileChange(f)
  }

  const handleCameraCapture = (blob: Blob) => {
    const f = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' })
    handleFileChange(f)
  }

  const handlePresetSelect = (idx: number, text: string) => {
    setActivePreset(idx)
    setCustomPrompt(text)
  }

  const runAnalysis = async () => {
    if (!file) {
      toast.error('Please upload or capture an image first')
      return
    }
    if (!isPro) {
      const remaining = getRemainingUsage('stt')
      if (remaining <= 0) {
        toast.error('Daily AI Vision limit reached! Upgrade to Pro for unlimited vision operations.', { duration: 4000 })
        navigate('/upgrade')
        return
      }
    }
    setLoading(true)
    setResult('')
    try {
      const res = await aiDescribeImage(file, customPrompt.trim())
      setResult(res.description)
      trackUsage('stt')
      toast.success('Analysis completed!')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'Failed to analyze image')
    } finally {
      setLoading(false)
    }
  }

  const copyText = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  const downloadText = () => {
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ekam_ai_vision_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Description file downloaded')
  }

  const resetAll = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setResult('')
    setActivePreset(0)
    setCustomPrompt(PRESET_PROMPTS[0].text)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={24} className="text-amber-500" /> NVIDIA AI Vision Analyzer
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Understand diagrams, charts, UI mockups, and photos in detail using multimodal NVIDIA NIM.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Column */}
        <div className="space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="card border-2 border-dashed text-center py-10 transition-all duration-200 flex flex-col justify-center min-h-[250px] relative overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            {previewUrl ? (
              <div className="space-y-4 p-2 relative z-10">
                <img src={previewUrl} alt="Preview" className="max-h-[200px] mx-auto rounded-lg object-contain border" style={{ borderColor: 'var(--border)' }} />
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{file?.name}</span>
                  <button onClick={resetAll} className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-red-500">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="cursor-pointer block space-y-3">
                  <Upload size={36} className="mx-auto text-gray-400" />
                  <div>
                    <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Drag an image here or browse</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Supports PNG, JPG, JPEG, WEBP</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" ref={fileInputRef} />
                </label>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>or</span>
                </div>
                <button onClick={() => setShowCamera(true)} className="btn-secondary text-xs !py-1.5 flex items-center gap-1.5 mx-auto">
                  <Camera size={14} /> Scan with Camera
                </button>
              </div>
            )}
          </div>

          {/* Prompts Preset & Input */}
          <div className="card space-y-3">
            <label className="label !mb-1">Analysis Preset</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(idx, preset.text)}
                  className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                    activePreset === idx
                      ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                      : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Custom Analysis Instructions</label>
              <textarea
                value={customPrompt}
                onChange={e => {
                  setCustomPrompt(e.target.value)
                  setActivePreset(-1)
                }}
                placeholder="What should the AI look for in this image?"
                rows={3}
                className="input text-xs"
              />
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading || !file}
              className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing Image...</>
              ) : (
                <><Sparkles size={14} fill="#fff" /> Analyze with NVIDIA AI</>
              )}
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="card flex flex-col justify-between min-h-[350px]">
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Analysis Output</h3>
              {result && (
                <div className="flex gap-1">
                  <button onClick={copyText} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Copy Output">
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <button onClick={downloadText} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Download Text">
                    <Download size={14} />
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-center">
                <Loader2 size={36} className="animate-spin text-amber-500 mb-2" />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>NVIDIA Multimodal Nim is Processing...</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This can take up to 5-15 seconds depending on file resolution.</p>
              </div>
            ) : result ? (
              <div className="text-xs leading-relaxed overflow-y-auto max-h-[400px] whitespace-pre-wrap font-sans p-1" style={{ color: 'var(--text-primary)' }}>
                {result}
              </div>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-center">
                <Info size={36} className="text-gray-300 dark:text-gray-700 mb-2" />
                <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Output Display</p>
                <p className="text-[10px] max-w-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Upload an image and run analysis. The detailed multimodal intelligence breakdown will be shown here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
