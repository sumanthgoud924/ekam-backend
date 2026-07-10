import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Wrench, Copy, Check, Trash2, FileJson, ArrowLeftRight, Link as LinkIcon, Sparkles,
} from 'lucide-react'

type StudioTab = 'json' | 'base64' | 'url'

export default function DevStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>('json')

  // JSON States
  const [jsonInput, setJsonInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [jsonCopied, setJsonCopied] = useState(false)

  // Base64 States
  const [b64Input, setB64Input] = useState('')
  const [b64Output, setB64Output] = useState('')
  const [b64Copied, setB64Copied] = useState(false)

  // URL States
  const [urlInput, setUrlInput] = useState('')
  const [urlOutput, setUrlOutput] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)

  // ── JSON Formatter Operations ────────────────────────────────────
  const handleBeautifyJson = () => {
    setJsonError('')
    if (!jsonInput.trim()) return
    try {
      const parsed = JSON.parse(jsonInput)
      setJsonOutput(JSON.stringify(parsed, null, 2))
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax')
      toast.error('JSON parsing failed')
    }
  }

  const handleMinifyJson = () => {
    setJsonError('')
    if (!jsonInput.trim()) return
    try {
      const parsed = JSON.parse(jsonInput)
      setJsonOutput(JSON.stringify(parsed))
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax')
      toast.error('JSON parsing failed')
    }
  }

  // ── Base64 Operations ───────────────────────────────────────────
  const handleBase64Encode = () => {
    if (!b64Input.trim()) return
    try {
      setB64Output(btoa(unescape(encodeURIComponent(b64Input))))
    } catch {
      toast.error('Failed to encode input')
    }
  }

  const handleBase64Decode = () => {
    if (!b64Input.trim()) return
    try {
      setB64Output(decodeURIComponent(escape(atob(b64Input))))
    } catch {
      toast.error('Invalid Base64 sequence')
    }
  }

  // ── URL Operations ──────────────────────────────────────────────
  const handleUrlEncode = () => {
    if (!urlInput.trim()) return
    setUrlOutput(encodeURIComponent(urlInput))
  }

  const handleUrlDecode = () => {
    if (!urlInput.trim()) return
    try {
      setUrlOutput(decodeURIComponent(urlInput))
    } catch {
      toast.error('Invalid URL encoded string')
    }
  }

  // Helper copy function
  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Wrench size={24} className="text-teal-500" /> Developer Studio
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Essential utilities for formatting data, encoding strings, and testing payloads offline.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'json', label: 'JSON Formatter', icon: FileJson },
          { id: 'base64', label: 'Base64 Encoder', icon: ArrowLeftRight },
          { id: 'url', label: 'URL Encoder/Decoder', icon: LinkIcon },
        ].map(t => {
          const Icon = t.icon
          const isSelected = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as StudioTab)}
              className={`flex-1 sm:flex-initial pb-2.5 px-4 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'border-teal-500 text-teal-500'
                  : 'border-transparent text-gray-400 hover:text-gray-500'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content Columns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Input Data</h3>
            <button
              onClick={() => {
                if (activeTab === 'json') { setJsonInput(''); setJsonOutput(''); setJsonError('') }
                else if (activeTab === 'base64') { setB64Input(''); setB64Output('') }
                else { setUrlInput(''); setUrlOutput('') }
              }}
              className="btn-ghost text-red-500 !p-1.5"
              title="Clear input"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {activeTab === 'json' && (
            <div className="space-y-4">
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='Paste raw JSON string here e.g. {"name":"Ekam","active":true}'
                rows={10}
                className="input font-mono text-xs leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={handleBeautifyJson} className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1">
                  <Sparkles size={12} /> Beautify JSON
                </button>
                <button onClick={handleMinifyJson} className="btn-secondary flex-1 text-xs py-2">
                  Minify JSON
                </button>
              </div>
            </div>
          )}

          {activeTab === 'base64' && (
            <div className="space-y-4">
              <textarea
                value={b64Input}
                onChange={e => setB64Input(e.target.value)}
                placeholder="Paste plain text to encode, or Base64 string to decode..."
                rows={10}
                className="input font-mono text-xs leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={handleBase64Encode} className="btn-primary flex-1 text-xs py-2">
                  Encode to Base64
                </button>
                <button onClick={handleBase64Decode} className="btn-secondary flex-1 text-xs py-2">
                  Decode from Base64
                </button>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <textarea
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Paste raw URL or string to encode/decode..."
                rows={10}
                className="input font-mono text-xs leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={handleUrlEncode} className="btn-primary flex-1 text-xs py-2">
                  URL Encode
                </button>
                <button onClick={handleUrlDecode} className="btn-secondary flex-1 text-xs py-2">
                  URL Decode
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Formatted Output</h3>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const out = activeTab === 'json' ? jsonOutput : activeTab === 'base64' ? b64Output : urlOutput
                  const setCopy = activeTab === 'json' ? setJsonCopied : activeTab === 'base64' ? setB64Copied : setUrlCopied
                  copyToClipboard(out, setCopy)
                }}
                disabled={!(activeTab === 'json' ? jsonOutput : activeTab === 'base64' ? b64Output : urlOutput)}
                className="btn-ghost !p-1.5 disabled:opacity-50"
                title="Copy output"
              >
                {((activeTab === 'json' && jsonCopied) || (activeTab === 'base64' && b64Copied) || (activeTab === 'url' && urlCopied)) ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            {activeTab === 'json' && jsonError && (
              <div className="rounded-xl border border-red-200 bg-red-500/5 p-3 text-red-500 font-mono text-[11px] mb-2 leading-relaxed">
                <p className="font-bold">JSON Error:</p>
                <p>{jsonError}</p>
              </div>
            )}

            <pre className="input font-mono text-[11px] leading-normal h-[290px] overflow-auto whitespace-pre-wrap select-all block" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>
              {activeTab === 'json' ? jsonOutput : activeTab === 'base64' ? b64Output : urlOutput || 'No output data.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
