import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import toast from 'react-hot-toast'
import {
  Languages, ArrowLeftRight, Loader2, Copy, Check, Volume2,
  Trash2, Clock,
} from 'lucide-react'
import { translateText, textToSpeech } from '../api/client'
import { useAudio } from '../contexts/AudioContext'
import { useAuth } from '../contexts/AuthContext'
import LanguageSelector from '../components/LanguageSelector'


interface HistoryItem {
  id: string
  sourceText: string
  translatedText: string
  sourceLang: string
  targetLang: string
  timestamp: Date
}

export default function Translator() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [detectedLang, setDetectedLang] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const sourceRef = useRef<HTMLTextAreaElement>(null)

  const audio = useAudio()
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage } = useAuth()


  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error('Enter text to translate')
      return
    }
    if (!isPro) {
      const remaining = getRemainingUsage('translate')
      if (remaining <= 0) {
        toast.error('Daily Translation limit reached! Upgrade to Pro for unlimited translations.', { duration: 4000 })
        navigate('/upgrade')
        return
      }
    }
    setLoading(true)
    try {
      const res = await translateText(sourceText, targetLang, sourceLang)
      trackUsage('translate')

      setTranslatedText(res.translated_text)
      const detected = sourceLang === 'auto' ? res.source_lang : ''
      setDetectedLang(detected)

      setHistory(prev => [{
        id: `${Date.now()}`,
        sourceText: sourceText.trim(),
        translatedText: res.translated_text,
        sourceLang: sourceLang === 'auto' ? res.source_lang : sourceLang,
        targetLang: targetLang,
        timestamp: new Date(),
      }, ...prev].slice(0, 20))
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const swapLanguages = () => {
    if (sourceLang === 'auto') {
      toast.error('Cannot swap while auto-detect is active')
      return
    }
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const speakText = async (text: string, lang: string) => {
    if (!text.trim()) return
    try {
      const res = await textToSpeech({ text, language: lang === 'auto' ? 'en' : lang })
      audio.playBase64(res.audio_base64, res.sample_rate)
    } catch {
      toast.error('Failed to speak text')
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    setSourceText('')
    setTranslatedText('')
    setDetectedLang('')
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setSourceText(item.sourceText)
    setTranslatedText(item.translatedText)
    setSourceLang(item.sourceLang)
    setTargetLang(item.targetLang)
    setDetectedLang('')
    setShowHistory(false)
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        {/* Language Selectors */}
        <div className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1">
            <LanguageSelector
              value={sourceLang}
              onChange={setSourceLang}
              label="Source"
            />
          </div>
          <button
            onClick={swapLanguages}
            disabled={sourceLang === 'auto'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border mb-0.5 transition-colors disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            aria-label="Swap languages"
          >
            <ArrowLeftRight size={18} />
          </button>
          <div className="flex-1">
            <LanguageSelector
              value={targetLang}
              onChange={setTargetLang}
              label="Target"
            />
          </div>
        </div>

        {/* Source Text */}
        <div className="relative">
          <label className="label">Source Text</label>
          <textarea
            ref={sourceRef}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter text to translate..."
            rows={4}
            className="input resize-y min-h-[100px]"
          />
          {detectedLang && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Detected: <span className="font-medium text-primary-500">{detectedLang}</span>
            </p>
          )}
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            {sourceText && (
              <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={14} />
              </button>
            )}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {sourceText.length}
            </span>
          </div>
        </div>

        {/* Translate Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTranslate}
            disabled={loading || !sourceText.trim()}
            className="btn-primary flex-1 sm:flex-none"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Translating...</> : 'Translate'}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`btn-secondary ${showHistory ? 'text-primary-500 border-primary-300' : ''}`}
          >
            <Clock size={18} /> History
          </button>
        </div>

        {/* Result */}
        {translatedText && (
          <div className="animate-fadeInUp">
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">Translation</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => speakText(translatedText, targetLang)}
                  className="btn-ghost p-2"
                  aria-label="Speak translation"
                >
                  <Volume2 size={16} />
                </button>
                <button
                  onClick={() => copyText(translatedText)}
                  className="btn-ghost p-2"
                  aria-label="Copy translation"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <button
                  onClick={() => speakText(sourceText, sourceLang)}
                  className="btn-ghost p-2"
                  aria-label="Speak source"
                >
                  <Volume2 size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-sm leading-relaxed"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <p style={{ color: 'var(--text-primary)' }}>{translatedText}</p>
            </div>
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="card animate-fadeInUp">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock size={16} /> Translation History
          </h3>
          {history.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No translations yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="rounded-lg p-2 bg-orange-100 dark:bg-orange-900/20">
                    <Languages size={14} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.sourceText.slice(0, 80)}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      → {item.translatedText.slice(0, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {item.sourceLang} → {item.targetLang}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
