import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QrCode, Download, Copy, Check, Crown } from 'lucide-react'
import QRCode from 'qrcode'
import { useAuth } from '../contexts/AuthContext'


export default function QrGenerator() {
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage } = useAuth()
  const [text, setText] = useState('https://')
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [size, setSize] = useState(300)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const remaining = getRemainingUsage('qrCodes')
  const isLimitReached = !isPro && remaining <= 0


  useEffect(() => {
    generate()
  }, [text, fgColor, bgColor, size])

  const generate = async () => {
    if (isLimitReached) return
    if (!text.trim()) {
      setQrDataUrl('')
      return
    }
    try {
      setError('')
      const url = await QRCode.toDataURL(text.trim(), {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      })
      setQrDataUrl(url)
    } catch (e: any) {
      setError(e.message || 'Generation failed')
      setQrDataUrl('')
    }
  }

  const download = () => {
    if (!qrDataUrl) return
    if (!isPro && !trackUsage('qrCodes')) {
      toast.error('Limit reached!')
      return
    }
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qrcode-${Date.now()}.png`
    a.click()
    toast.success('QR code downloaded')
  }

  const copyImage = async () => {
    if (!qrDataUrl) return
    if (!isPro && !trackUsage('qrCodes')) {
      toast.error('Limit reached!')
      return
    }
    try {
      const blob = await (await fetch(qrDataUrl)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy not supported')
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <QrCode size={24} className="text-primary-500" /> QR Code Generator
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Generate QR codes for URLs, text, and more.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="card space-y-4">
          {isLimitReached && (
            <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-xs flex flex-col gap-2">
              <div className="flex gap-2">
                <Crown size={14} className="shrink-0 mt-0.5" />
                <span>You have reached your free daily limit for QR Code generations. Upgrade to Pro for unlimited access.</span>
              </div>
              <button onClick={() => navigate('/upgrade')} className="btn-primary !py-1.5 !px-3 text-xs w-full" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Upgrade to Pro
              </button>
            </div>
          )}
          <div>
            <label className="label">Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter URL or text..."
              rows={4}
              className="input resize-none"
              disabled={isLimitReached}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Foreground</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-10 w-10 rounded-lg cursor-pointer border"
                  style={{ borderColor: 'var(--border)' }}
                />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{fgColor}</span>
              </div>
            </div>
            <div>
              <label className="label">Background</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-10 rounded-lg cursor-pointer border"
                  style={{ borderColor: 'var(--border)' }}
                />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{bgColor}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="label">Size: {size}px</label>
            <input
              type="range"
              min={128}
              max={1024}
              step={16}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Preview */}
        <div className="card flex flex-col items-center justify-center gap-4 py-8">
          {qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="rounded-xl shadow-lg"
                style={{ width: size > 400 ? 300 : size, height: size > 400 ? 300 : size }}
              />
              <div className="flex gap-2">
                <button onClick={download} className="btn-primary text-sm">
                  <Download size={16} /> Download
                </button>
                <button onClick={copyImage} className="btn-secondary text-sm">
                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy
                </button>
              </div>
            </>
          ) : (
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              <QrCode size={64} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Enter content to generate QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}