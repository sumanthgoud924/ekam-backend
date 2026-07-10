import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Mic, Square, Loader2, Upload, Play, Languages,
  Copy, Check, Download, Volume2, FileAudio,
} from 'lucide-react'
import { audioTranslate } from '../api/client'
import { useAudio } from '../contexts/AudioContext'
import LanguageSelector from '../components/LanguageSelector'

type PipelineStep = 'idle' | 'transcribing' | 'translating' | 'synthesizing' | 'done' | 'error'

const stepLabels: Record<string, string> = {
  transcribing: 'Transcribing audio...',
  translating: 'Translating text...',
  synthesizing: 'Generating speech...',
}

const stepIcons: Record<string, string> = {
  transcribing: '\u{1F3A4}',
  translating: '\u{1F310}',
  synthesizing: '\u{1F508}',
}

export default function AudioTranslate() {
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('en')
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle')
  const [result, setResult] = useState<{
    transcription: string
    translatedText: string
    sourceLang: string
    targetLang: string
    audioBase64: string
    sampleRate: number
    duration: number
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const audio = useAudio()

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = []
      setRecordingTime(0)
      setResult(null)
      setRecordedBlob(null)
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
    } catch {
      toast.error('Microphone access denied.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)

    return new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach(t => t.stop())
        if (blob.size > 0) {
          setRecordedBlob(blob)
        }
        resolve()
      }
      recorder.stop()
    })
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setRecordedBlob(file)
    e.target.value = ''
  }, [])

  const handleTranslate = async () => {
    if (!recordedBlob) {
      toast.error('Please record or upload audio first')
      return
    }
    setLoading(true)
    setPipelineStep('transcribing')
    try {
      const res = await audioTranslate(recordedBlob, sourceLang, targetLang)
      setPipelineStep('translating')
      setPipelineStep('synthesizing')
      setResult({
        transcription: res.transcription,
        translatedText: res.translated_text,
        sourceLang: res.source_lang,
        targetLang: res.target_lang,
        audioBase64: res.audio_base64,
        sampleRate: res.sample_rate,
        duration: res.duration_seconds,
      })
      setPipelineStep('done')
      toast.success('Audio translated successfully')
    } catch (e: any) {
      setPipelineStep('error')
      toast.error(e?.response?.data?.detail || 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const playTranslated = () => {
    if (result) {
      audio.playBase64(result.audioBase64, result.sampleRate)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadText = (text: string, label: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${label}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <LanguageSelector value={sourceLang} onChange={setSourceLang} label="Source Language" />
          <LanguageSelector value={targetLang} onChange={setTargetLang} label="Target Language" />
        </div>

        {/* Record / Upload */}
        <div className="flex flex-col items-center gap-4 py-6">
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
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Record Audio to Translate</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Or upload a file below</p>
              </>
            )}
          </div>

          {recordedBlob && !isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-300">
              <FileAudio size={16} />
              Audio ready ({Math.round(recordedBlob.size / 1024)} KB)
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
        </div>

        {/* Translate button */}
        <button
          onClick={handleTranslate}
          disabled={loading || !recordedBlob}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <Loader2 size={18} className="animate-spin" />
              <span>{stepLabels[pipelineStep] || 'Processing...'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              <Languages size={18} /> Translate Audio
            </span>
          )}
        </button>

        {/* Pipeline progress */}
        {loading && (
          <div className="flex items-center justify-center gap-4 py-2">
            {['transcribing', 'translating', 'synthesizing'].map((step) => {
              const currentIdx = ['transcribing', 'translating', 'synthesizing'].indexOf(pipelineStep)
              const stepIdx = ['transcribing', 'translating', 'synthesizing'].indexOf(step)
              const isActive = pipelineStep === step
              const isDone = stepIdx < currentIdx
              return (
                <div key={step} className="flex items-center gap-1.5 text-xs"
                  style={{
                    color: isDone ? 'var(--color-primary, #6366f1)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <span>{isDone ? '\u2705' : isActive ? '\u23F3' : stepIcons[step]}</span>
                  <span className="hidden sm:inline">{stepLabels[step].replace('...', '')}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fadeInUp">
          {/* Transcription */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Mic size={16} /> Transcription ({result.sourceLang})
              </h2>
              <div className="flex gap-1">
                <button onClick={() => copyText(result.transcription)} className="btn-ghost text-xs p-1.5">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button onClick={() => downloadText(result.transcription, 'transcription')} className="btn-ghost text-xs p-1.5">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {result.transcription}
              </p>
            </div>
          </div>

          {/* Translation + Audio */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Languages size={16} /> Translation ({result.targetLang})
              </h2>
              <div className="flex gap-1">
                <button onClick={() => copyText(result.translatedText)} className="btn-ghost text-xs p-1.5">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button onClick={() => downloadText(result.translatedText, 'translation')} className="btn-ghost text-xs p-1.5">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {result.translatedText}
              </p>
            </div>

            {/* Play translated audio */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <button
                onClick={playTranslated}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                {audio.isPlaying ? <Volume2 size={18} /> : <Play size={18} />}
              </button>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Translated Speech</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {result.duration.toFixed(1)}s &middot; {result.targetLang}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}