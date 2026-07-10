import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'

export interface AudioState {
  isPlaying: boolean
  currentTime: number
  duration: number
  error: string | null
  volume: number
  speechRate: number
  analyserData: Uint8Array | null
}

interface AudioContextType extends AudioState {
  playBase64: (base64: string, sampleRate?: number) => void
  playUrl: (url: string) => void
  togglePlayback: () => void
  stopPlayback: () => void
  seekTo: (time: number) => void
  setVolume: (v: number) => void
  setSpeechRate: (r: number) => void
  downloadAudio: (base64: string, filename?: string) => void
  playWithHighlight: (text: string, onWord: (wordIndex: number) => void) => void
  isHighlightActive: boolean
  currentWordIndex: number
  lastBase64: string
}

const AudioCtx = createContext<AudioContextType | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(1)
  const [speechRate, setSpeechRateState] = useState(1)
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null)
  const [isHighlightActive, setIsHighlightActive] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [lastBase64, setLastBase64] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const highlightWordsRef = useRef<string[]>([])
  const highlightCallbackRef = useRef<((wordIndex: number) => void) | null>(null)
  const highlightIntervalRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current)
      highlightIntervalRef.current = 0
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setIsHighlightActive(false)
    setCurrentWordIndex(0)
    highlightCallbackRef.current = null
  }, [])

  const startAnalyser = useCallback((audio: HTMLAudioElement) => {
    try {
      const actx = new AudioContext()
      audioContextRef.current = actx
      const source = actx.createMediaElementSource(audio)
      const analyser = actx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyser.connect(actx.destination)
      sourceRef.current = source
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const update = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          setAnalyserData(new Uint8Array(dataArray))
        }
        animFrameRef.current = requestAnimationFrame(update)
      }
      update()
    } catch {
      // analyser not available (CORS issues etc)
    }
  }, [])

  const setupAudioElement = useCallback((audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime)
    audio.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current)
        highlightIntervalRef.current = 0
      }
      setIsHighlightActive(false)
      setCurrentWordIndex(0)
      setAnalyserData(null)
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
    audio.onerror = () => setError('Audio playback failed')
    audio.playbackRate = speechRate
    audio.volume = volume
    audioRef.current = audio
  }, [speechRate, volume])

  const playBase64 = useCallback((base64: string, sampleRate = 24000) => {
    try {
      setLastBase64(base64)
      cleanupAudio()
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setupAudioElement(audio)

      audio.addEventListener('canplay', () => {
        startAnalyser(audio)
        audio.play()
        setIsPlaying(true)
        setError(null)
      }, { once: true })
    } catch {
      setError('Failed to play audio')
    }
  }, [cleanupAudio, setupAudioElement, startAnalyser])

  const playUrl = useCallback((url: string) => {
    try {
      cleanupAudio()
      const audio = new Audio(url)
      setupAudioElement(audio)

      audio.addEventListener('canplay', () => {
        startAnalyser(audio)
        audio.play()
        setIsPlaying(true)
        setError(null)
      }, { once: true })
    } catch {
      setError('Failed to play audio')
    }
  }, [cleanupAudio, setupAudioElement, startAnalyser])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speechRate
    }
  }, [speechRate])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const stopPlayback = useCallback(() => {
    cleanupAudio()
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
    setAnalyserData(null)
  }, [cleanupAudio])

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  const setSpeechRate = useCallback((r: number) => {
    setSpeechRateState(Math.max(0.5, Math.min(4, r)))
  }, [])

  const downloadAudio = useCallback((base64: string, filename = 'audio.wav') => {
    try {
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Download failed')
    }
  }, [])

  const playWithHighlight = useCallback((text: string, onWord: (wordIndex: number) => void) => {
    if (!audioRef.current || !isPlaying) return

    const words = text.split(/\s+/)
    highlightWordsRef.current = words
    highlightCallbackRef.current = onWord
    setIsHighlightActive(true)
    setCurrentWordIndex(0)

    const estimatedDuration = (duration || 10) * 1000
    const wordDuration = estimatedDuration / words.length

    let idx = 0
    if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current)

    highlightIntervalRef.current = window.setInterval(() => {
      if (idx >= words.length) {
        clearInterval(highlightIntervalRef.current)
        highlightIntervalRef.current = 0
        setIsHighlightActive(false)
        return
      }
      setCurrentWordIndex(idx)
      onWord(idx)
      idx++
    }, wordDuration)
  }, [isPlaying, duration])

  const value: AudioContextType = {
    isPlaying, currentTime, duration, error, volume, speechRate, analyserData,
    playBase64, playUrl, togglePlayback, stopPlayback, seekTo,
    setVolume, setSpeechRate, downloadAudio, lastBase64,
    playWithHighlight, isHighlightActive, currentWordIndex,
  }

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
