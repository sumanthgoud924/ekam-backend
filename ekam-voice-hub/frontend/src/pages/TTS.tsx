import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Loader2, Clipboard, Sparkles, Ear, Shield,
} from 'lucide-react'
import { textToSpeech, getVoices, VoiceInfo, TTSRequest } from '../api/client'
import { useAudio } from '../contexts/AudioContext'
import { useAuth } from '../contexts/AuthContext'
import LanguageSelector from '../components/LanguageSelector'
import TextHighlighter from '../components/TextHighlighter'

const providers = [
  { value: 'edge_tts', label: 'Edge TTS', desc: '20+ languages, natural voices' },
  { value: 'gtts', label: 'gTTS', desc: 'Fast, lightweight' },
  { value: 'voxcpm', label: 'VoxCPM2', desc: '30 languages, voice cloning' },
  { value: 'kittentts', label: 'KittenTTS', desc: 'CPU-optimized' },
]

const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

const sampleTexts = [
  'The quick brown fox jumps over the lazy dog.',
  'Artificial intelligence is transforming the way we learn and work every day.',
  'In a world full of noise, find your voice and let it be heard clearly.',
]

const GENDER_COLORS: Record<string, string> = {
  Female: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Male: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Any: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function TTS() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('en')
  const [provider, setProvider] = useState(() => localStorage.getItem('ekam-pref-tts-engine') || 'edge_tts')
  const [speed, setSpeed] = useState(1.0)
  const [voice, setVoice] = useState<VoiceInfo | null>(null)
  const [voiceDescription, setVoiceDescription] = useState('')
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)

  const audio = useAudio()
  const navigate = useNavigate()
  const { isAdmin, isPro, trackUsage, getRemainingUsage } = useAuth()

  useEffect(() => {
    if (isAdmin) {
      loadVoices(provider)
    }
  }, [provider, isAdmin])

  useEffect(() => {
    if (!isAdmin) {
      setVoice(null)
      setVoices([])
    }
  }, [isAdmin])

  const loadVoices = async (p: string) => {
    try {
      const v = await getVoices(p)
      const voiceList = v[p] || []
      setVoices(voiceList)
      if (voiceList.length > 0) {
        const saved = localStorage.getItem(`ekam-voice-${p}`)
        const match = saved ? voiceList.find(vc => vc.name === saved) : null
        setVoice(match || voiceList[0])
      } else {
        setVoice(null)
      }
    } catch {
      setVoices([])
      setVoice(null)
    }
  }

  const handleProviderChange = useCallback((p: string) => {
    setProvider(p)
  }, [])

  const selectVoice = useCallback((v: VoiceInfo) => {
    setVoice(v)
    if (isAdmin) {
      localStorage.setItem(`ekam-voice-${provider}`, v.name)
    }
  }, [provider, isAdmin])

  const handlePreview = useCallback(async (v: VoiceInfo) => {
    setPreviewLoading(v.name)
    try {
      const res = await textToSpeech({
        text: `Hello, this is ${v.description}.`,
        language,
        voice: v.name,
        speed: 1.0,
        provider,
      })
      audio.playBase64(res.audio_base64, res.sample_rate)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Preview failed')
    } finally {
      setPreviewLoading(null)
    }
  }, [language, provider, audio])

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to synthesize')
      return
    }
    if (!isPro) {
      const remaining = getRemainingUsage('tts')
      if (remaining <= 0) {
        toast.error('Daily Text-to-Speech limit reached! Upgrade to Pro for unlimited conversions.', { duration: 4000 })
        navigate('/upgrade')
        return
      }
    }
    setLoading(true)
    try {
      const req: TTSRequest = {
        text: text.trim(),
        language,
        voice: voice?.name || 'default',
        speed: Number(speed),
        provider,
      }
      if (provider === 'voxcpm' && voiceDescription.trim()) {
        req.voice_description = voiceDescription.trim()
      }
      const res = await textToSpeech(req)
      trackUsage('tts')
      setGeneratedText(text.trim())
      audio.playBase64(res.audio_base64, res.sample_rate)
      toast.success(`Generated (${res.duration_seconds}s)`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }


  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText) {
        setText(clipText)
        toast.success('Pasted from clipboard')
      }
    } catch {
      toast.error('Unable to read clipboard')
    }
  }

  const charCount = text.length
  const maxChars = 50000

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <label className="label !mb-0">Text to convert</label>
          <button onClick={handlePasteClipboard} className="btn-ghost text-xs">
            <Clipboard size={14} /> Paste
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type, paste, or select a sample below..."
          rows={6}
          className="input resize-y min-h-[120px]"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {sampleTexts.map((s, i) => (
              <button
                key={i}
                onClick={() => setText(s)}
                className="badge bg-gray-100 dark:bg-gray-800 text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {charCount.toLocaleString()}/{maxChars.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <LanguageSelector value={language} onChange={setLanguage} label="Language" />

          {isAdmin ? (
            <>
              <div>
                <label className="label">Engine</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="input"
                >
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Speed</label>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="input"
                >
                  {speedOptions.map((s) => (
                    <option key={s} value={s}>{s}x</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Speed</label>
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="input"
              >
                {speedOptions.map((s) => (
                  <option key={s} value={s}>{s}x</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Admin-only: Voice Cards */}
        {isAdmin && voices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label !mb-0">Voice</label>
              <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1">
                <Shield size={10} /> Admin
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {voices.map((v) => {
                const isSelected = voice?.name === v.name
                return (
                  <button
                    key={v.name}
                    onClick={() => selectVoice(v)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {v.name.replace(/Neural$/, '')}
                        </span>
                        <span className={`badge text-[10px] px-1.5 py-0.5 ${GENDER_COLORS[v.gender] || ''}`}>
                          {v.gender === 'Any' ? 'Mixed' : v.gender}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {v.locale} &middot; {v.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(v)
                      }}
                      disabled={previewLoading === v.name}
                      className="shrink-0 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      title="Preview voice"
                    >
                      {previewLoading === v.name
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Ear size={16} />}
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {isAdmin && provider === 'voxcpm' && (
          <div>
            <label className="label">Voice Description</label>
            <input
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              placeholder='e.g., "A young woman, gentle voice" or "Deep male voice, serious tone"'
              className="input"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Describe the voice you want. Leave empty for default.
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !text.trim()}
          className="btn-primary w-full sm:w-auto"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Generating...</>
          ) : (
            <><Sparkles size={18} /> Generate Speech</>
          )}
        </button>
      </div>

      {/* Reading Along */}
      {generatedText && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading Along</h2>
            {audio.isPlaying && (
              <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 animate-pulse-soft">
                Playing
              </span>
            )}
          </div>
          <TextHighlighter
            text={generatedText}
            currentWordIndex={audio.isHighlightActive ? audio.currentWordIndex : -1}
            fontSize={17}
            className="rounded-xl border"
          />
        </div>
      )}

      {/* Admin-only: Engine info */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Engine Details</h3>
            <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] flex items-center gap-1">
              <Shield size={10} /> Admin
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {providers.map(p => (
              <div key={p.value} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium">{p.label}:</span> {p.desc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}