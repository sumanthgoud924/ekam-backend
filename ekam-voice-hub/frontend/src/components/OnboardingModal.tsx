import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Upload, Headphones, Languages, Sparkles } from 'lucide-react'

interface OnboardingModalProps {
  step: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  onGoToStep: (s: number) => void
}

const steps = [
  {
    title: 'Welcome to Ekam Tools',
    description: 'Your AI-powered voice assistant for studying and work. Read documents aloud, transcribe lectures, translate text, and more — all in one place.',
    icon: Sparkles,
    color: 'from-teal-500 to-indigo-600',
    emoji: '🚀',
  },
  {
    title: 'Upload Any Document',
    description: 'Upload PDFs, DOCX files, images (OCR), presentations, and more. We extract the text so you can listen, study, and take notes hands-free.',
    icon: Upload,
    color: 'from-blue-500 to-cyan-500',
    emoji: '📄',
  },
  {
    title: 'Listen & Learn',
    description: 'Choose from 30+ languages and natural AI voices. Adjust speed (0.5x–4x), follow along with word highlighting, and learn while you commute or relax.',
    icon: Headphones,
    color: 'from-purple-500 to-pink-500',
    emoji: '🎧',
  },
  {
    title: 'Translate & Study Smarter',
    description: 'Translate between 30+ languages, transcribe lectures to text, bookmark important pages, and speed-read with RSVP mode.',
    icon: Languages,
    color: 'from-orange-500 to-red-500',
    emoji: '🌍',
  },
  {
    title: "You're All Set!",
    description: 'Start by uploading a document, pasting text, or recording your voice. Everything syncs across your library for easy access.',
    icon: Check,
    color: 'from-green-500 to-emerald-500',
    emoji: '🎉',
  },
]

export default function OnboardingModal({
  step, totalSteps, onNext, onPrev, onClose, onGoToStep,
}: OnboardingModalProps) {
  const [dontShow, setDontShow] = useState(false)
  const s = steps[step]
  const Icon = s.icon
  const isLast = step === totalSteps - 1
  const isFirst = step === 0

  const handleFinish = () => {
    if (dontShow) {
      localStorage.setItem('ekam-onboarding-complete', 'true')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ backgroundColor: 'var(--overlay)' }}>
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fadeInUp"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${s.color} p-8 pb-12 text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative">
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl shadow-lg backdrop-blur">
                {s.emoji}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{s.title}</h2>
            <p className="text-sm text-white/80 leading-relaxed max-w-sm mx-auto">
              {s.description}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 -mt-3 relative z-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              onClick={() => onGoToStep(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-primary-500'
                  : 'w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Content + actions */}
        <div className="p-6 pt-5 space-y-4">
          {/* Don't show again */}
          {isLast && (
            <label className="flex items-center gap-3 cursor-pointer py-2">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                  dontShow
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => setDontShow(!dontShow)}
              >
                {dontShow && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Don't show this again
              </span>
            </label>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            {!isFirst ? (
              <button onClick={onPrev} className="btn-secondary flex-1">
                <ChevronLeft size={18} /> Back
              </button>
            ) : (
              <div />
            )}

            {isLast ? (
              <button onClick={handleFinish} className="btn-primary flex-1">
                <Sparkles size={18} /> Get Started
              </button>
            ) : (
              <button onClick={onNext} className="btn-primary flex-1">
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
