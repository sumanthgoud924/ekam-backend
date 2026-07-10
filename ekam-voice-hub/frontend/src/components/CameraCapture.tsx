import { useState, useRef, useEffect } from 'react'
import { Camera, X } from 'lucide-react'

interface Props {
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [captured, setCaptured] = useState<string | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('Camera access denied. Check browser permissions.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
    stopCamera()
  }

  const retake = () => {
    setCaptured(null)
    startCamera()
  }

  const confirm = () => {
    if (!captured) return
    fetch(captured)
      .then(r => r.blob())
      .then(blob => {
        onCapture(blob)
        onClose()
      })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Camera size={16} /> Scan Document
          </span>
          <button onClick={() => { stopCamera(); onClose() }} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black flex items-center justify-center min-h-[300px]">
          {error ? (
            <p className="text-red-400 text-sm p-4">{error}</p>
          ) : captured ? (
            <img src={captured} alt="Captured" className="max-h-[400px] w-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="max-h-[400px] w-full" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-center gap-3 p-4">
          {captured ? (
            <>
              <button onClick={retake} className="btn-secondary flex-1">Retake</button>
              <button onClick={confirm} className="btn-primary flex-1">Use Photo</button>
            </>
          ) : (
            <button
              onClick={capture}
              disabled={!!error}
              className="btn-primary px-8"
            >
              <Camera size={20} /> Capture
            </button>
          )}
        </div>
      </div>
    </div>
  )
}