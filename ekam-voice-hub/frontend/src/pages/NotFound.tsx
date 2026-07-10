import { useNavigate } from 'react-router-dom'
import { AlertCircle, Home, RotateCcw } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="rounded-3xl p-4 bg-red-50 dark:bg-red-950/20 text-red-500 mb-6 animate-pulse">
        <AlertCircle size={48} />
      </div>
      <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Page Not Found</h1>
      <p className="text-sm max-w-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">
          <RotateCcw size={16} /> Go Back
        </button>
        <button onClick={() => navigate('/')} className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}>
          <Home size={16} /> Home
        </button>
      </div>
    </div>
  )
}
