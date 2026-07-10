import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import toast from 'react-hot-toast'
import {
  Mic, Square, Loader2, Upload, FileAudio, Copy, Check, Download,
  Trash2, Clock, Volume2,
} from 'lucide-react'
import { speechToText, textToSpeech } from '../api/client'
import { useAudio } from '../contexts/AudioContext'
import { useAuth } from '../contexts/AuthContext'
import LanguageSelector from '../components/LanguageSelector'


interface TranscriptionResult {
  id: string
  text: string
  confidence: number
  language: string
  timestamp: Date
}

export default function STT() {
  const [language, setLanguage] = useState('en')
  const [modelSize, setModelSize] = useState('base')
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ text: string; confidence: number; language: string; segments: { start: number; end: number; text: string }[] } | null>(null)
  const [copied, setCopied] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionResult[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const audio = useAudio()
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage } = useAuth()


  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = []
      setRecordingTime(0)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)

      const actx = new AudioContext()
      audioContextRef.current = actx
      const source = actx.createMediaStreamSource(stream)
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setAudioLevel(avg / 255)
          setIsSpeaking(avg > 20)
        }
        animFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch {
      toast.error('Microphone access denied. Check browser permissions.')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    setAudioLevel(0)

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach((t) => t.stop())

        if (blob.size > 0) {
          await transcribeBlob(blob)
        }
        resolve()
      }
      recorder.stop()
    })
  }, [language, modelSize])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await transcribeBlob(file)
    e.target.value = ''
  }, [language, modelSize])

  const transcribeBlob = async (audioBlob: Blob) => {
    if (!isPro) {
      const remaining = getRemainingUsage('stt')
      if (remaining <= 0) {
        toast.error('Daily Speech-to-Text limit reached! Upgrade to Pro for unlimited transcription.', { duration: 4000 })
        navigate('/upgrade')
        return
      }
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await speechToText(audioBlob, language, modelSize)
      trackUsage('stt')
      setResult(res)
      if (res.text) {

        const pct = (res.confidence * 100).toFixed(0)
        toast.success(`Transcribed (${pct}% confidence)`)

        setRecentTranscriptions(prev => [{
          id: `${Date.now()}`,
          text: res.text,
          confidence: res.confidence,
          language: res.language,
          timestamp: new Date(),
        }, ...prev].slice(0, 10))
      } else {
        toast.error('No speech detected')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Transcription failed')
    } finally {
      setLoading(false)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const speakResult = async (text: string, lang: string) => {
    try {
      const res = await textToSpeech({ text, language: lang })
      audio.playBase64(res.audio_base64, res.sample_rate)
    } catch {
      toast.error('Failed to speak result')
    }
  }

  const downloadResult = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const modelOptions = [
    { value: 'tiny', label: 'Tiny (fastest)', desc: '~1GB RAM' },
    { value: 'base', label: 'Base (balanced)', desc: '~1.5GB RAM' },
    { value: 'small', label: 'Small (accurate)', desc: '~2.5GB RAM' },
    { value: 'medium', label: 'Medium (more accurate)', desc: '~5GB RAM' },
    { value: 'large', label: 'Large (most accurate)', desc: '~10GB RAM' },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <LanguageSelector value={language} onChange={setLanguage} label="Language" />
          <div>
            <label className="label">Model Size</label>
            <select value={modelSize} onChange={(e) => setModelSize(e.target.value)} className="input">
              {modelOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {modelOptions.find(m => m.value === modelSize)?.desc}
            </p>
          </div>
        </div>

        {/* Recording UI */}
        <div className="flex flex-col items-center gap-4 py-8">
          {/* Mic button with pulse */}
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full animate-pulse-recording bg-red-400/30" style={{ transform: 'scale(1.3)' }} />
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 shadow-xl ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse-recording'
                  : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <Square size={28} /> : <Mic size={28} />}
            </button>
          </div>

          <div className="text-center">
            {isRecording ? (
              <>
                <div className="flex items-center gap-2 justify-center mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Recording</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-red-500">{formatTime(recordingTime)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tap to Record</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Or upload an audio file below
                </p>
              </>
            )}
          </div>

          {/* Audio level visualization */}
          {isRecording && (
            <div className="flex items-end justify-center gap-1 h-12 w-64">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(2, (audioLevel * 48) * (0.5 + Math.sin(i * 0.5 + Date.now() * 0.01) * 0.5))}px`,
                    backgroundColor: isSpeaking ? '#4f46e5' : '#94a3b8',
                    opacity: 0.4 + audioLevel * 0.6,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <label className="btn-secondary cursor-pointer w-full sm:w-auto inline-flex items-center gap-2">
            <Upload size={18} /> Upload Audio File
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Supports WAV, MP3, M4A, OGG, WebM
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className="animate-spin" />
            Transcribing...
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card space-y-4 animate-fadeInUp">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Transcription</h2>
            <div className="flex items-center gap-1">
              <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {(result.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {result.text}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copyText(result.text)} className="btn-secondary text-sm">
              {copied ? <Check size={14} /> : <Copy size={14} />} Copy
            </button>
            <button onClick={() => downloadResult(result.text)} className="btn-secondary text-sm">
              <Download size={14} /> Download
            </button>
            <button onClick={() => speakResult(result.text, result.language)} className="btn-secondary text-sm">
              <Volume2 size={14} /> Read Aloud
            </button>
          </div>

          {/* Segments */}
          {result.segments.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium" style={{ color: 'var(--text-secondary)' }}>
                Show timestamps ({result.segments.length} segments)
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5">
                {result.segments.map((seg, i) => (
                  <div key={i} className="flex gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                      [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                    </span>
                    <span>{seg.text}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Recent Transcriptions */}
      {recentTranscriptions.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock size={16} /> Recent Transcriptions
          </h3>
          <div className="space-y-2">
            {recentTranscriptions.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setResult({ text: t.text, confidence: t.confidence, language: t.language, segments: [] })
                }}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <FileAudio size={16} className="text-primary-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {t.text.slice(0, 100)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {(t.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setRecentTranscriptions(prev => prev.filter(r => r.id !== t.id))
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
