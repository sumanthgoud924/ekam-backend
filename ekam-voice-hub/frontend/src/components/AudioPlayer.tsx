import { useState, useRef } from 'react'
import {
  Play, Pause, Square, Download, X, Maximize2,
  Volume2, Volume1, VolumeX, ChevronUp,
} from 'lucide-react'
import { useAudio } from '../contexts/AudioContext'

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface AudioPlayerProps {
  onClose?: () => void
  text?: string
  onWordClick?: (wordIndex: number) => void
}

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]

export default function AudioPlayer({ onClose, text, onWordClick }: AudioPlayerProps) {
  const [minimized, setMinimized] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const {
    isPlaying, currentTime, duration, error, volume, speechRate, analyserData,
    togglePlayback, stopPlayback, seekTo, setVolume, setSpeechRate, downloadAudio,
    lastBase64,
  } = useAudio()

  if (duration === 0 && !isPlaying) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    seekTo(pct * duration)
  }

  const handleWipe = () => {
    stopPlayback()
    onClose?.()
  }

  const bars = analyserData ? Array.from(analyserData).slice(0, 32) : []

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  if (minimized) {
    return (
      <div
        className="fixed bottom-[72px] left-2 right-2 z-40 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 floating-player rounded-2xl border px-4 py-3 animate-slideUp"
      >
        <div className="flex items-center gap-3">
          <button onClick={togglePlayback} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all active:scale-95 shadow-lg">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-full rounded-full progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {formatTime(currentTime)}
              </span>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <button onClick={() => setMinimized(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-[72px] left-2 right-2 z-40 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 floating-player rounded-2xl border overflow-hidden animate-fadeInUp shadow-2xl"
    >
      {/* Waveform visualization */}
      {bars.length > 0 && (
        <div className="flex items-end justify-center gap-[2px] h-12 px-4 pt-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {bars.map((val, i) => (
            <div
              key={i}
              className="waveform-bar flex-1"
              style={{
                height: `${Math.max(2, (val / 255) * 40)}px`,
                opacity: isPlaying ? 0.5 + (val / 255) * 0.5 : 0.3,
              }}
            />
          ))}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Top controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all active:scale-95 shadow-lg"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button
              onClick={handleWipe}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Stop"
            >
              <Square size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => { setShowSpeed(!showSpeed); setShowVolume(false) }}
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {speechRate}x
              </button>
              {showSpeed && (
                <div
                  className="absolute bottom-full right-0 mb-2 rounded-xl border p-2 shadow-xl z-50"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col gap-1 min-w-[80px]">
                    {speedOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setSpeechRate(s); setShowSpeed(false) }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors ${speechRate === s ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        style={{ color: speechRate === s ? undefined : 'var(--text-secondary)' }}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="relative">
              <button
                onClick={() => { setShowVolume(!showVolume); setShowSpeed(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <VolumeIcon size={14} />
              </button>
              {showVolume && (
                <div
                  className="absolute bottom-full right-0 mb-2 rounded-xl border p-3 shadow-xl z-50"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    className="h-1.5 w-24 accent-primary-600"
                    style={{ accentColor: '#4f46e5' }}
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => lastBase64 && downloadAudio(lastBase64, 'audio.wav')}
              disabled={!lastBase64}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Download"
            >
              <Download size={14} />
            </button>

            <button
              onClick={() => setMinimized(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Minimize"
            >
              <ChevronUp size={16} />
            </button>

            {onClose && (
              <button
                onClick={handleWipe}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="progress-bar cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="progress-bar-fill relative"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity border-2 border-primary-500" />
          </div>
        </div>

        {/* Time + Error */}
        <div className="flex items-center justify-between">
          <span className="text-xs tabular-nums font-medium" style={{ color: 'var(--text-muted)' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}
