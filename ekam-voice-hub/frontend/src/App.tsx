import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { ThemeProvider } from './hooks/useTheme'
import { AudioProvider } from './contexts/AudioContext'
import { AuthProvider } from './contexts/AuthContext'
import { DocumentProvider } from './contexts/DocumentContext'
import Layout from './components/Layout'
import AudioPlayer from './components/AudioPlayer'
import OnboardingModal from './components/OnboardingModal'
import { useOnboarding } from './hooks/useOnboarding'
import Dashboard from './pages/Dashboard'

import TTS from './pages/TTS'
import STT from './pages/STT'
import DocumentReader from './pages/DocumentReader'
import Library from './pages/Library'
import Translator from './pages/Translator'
import AudioTranslate from './pages/AudioTranslate'
import Settings from './pages/Settings'
import ProUpgrade from './pages/ProUpgrade'
import ToolsLanding from './tools/ToolsLanding'
import JpegToWord from './tools/JpegToWord'
import JpegToPdf from './tools/JpegToPdf'
import JpegPngConverter from './tools/JpegPngConverter'
import ImageResizer from './tools/ImageResizer'
import PdfMerge from './tools/PdfMerge'
import PdfSplit from './tools/PdfSplit'
import PdfCompress from './tools/PdfCompress'
import PdfRotate from './tools/PdfRotate'
import PdfToText from './tools/PdfToText'
import TextToPdf from './tools/TextToPdf'
import QrGenerator from './tools/QrGenerator'
import WordCounter from './tools/WordCounter'
import UnitConverter from './tools/UnitConverter'
import BulkWhatsApp from './tools/BulkWhatsApp'
import Legal from './pages/Legal'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import DevStudio from './tools/DevStudio'
import PasswordGenerator from './tools/PasswordGenerator'
import ColorPicker from './tools/ColorPicker'
import { useAuth } from './contexts/AuthContext'

import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'



function AppContent() {
  const onboarding = useOnboarding()
  const { isAdmin } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }


  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          },
        }}
      />

      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tts" element={<TTS />} />
          <Route path="/stt" element={<STT />} />
          <Route path="/documents" element={<DocumentReader />} />
          <Route path="/library" element={<Library />} />
          <Route path="/translate" element={<Translator />} />
          <Route path="/audio-translate" element={<AudioTranslate />} />
          <Route path="/tools" element={<ToolsLanding />} />
          <Route path="/tools/jpeg-to-word" element={<JpegToWord />} />
          <Route path="/tools/jpeg-to-pdf" element={<JpegToPdf />} />
          <Route path="/tools/jpeg-png-converter" element={<JpegPngConverter />} />
          <Route path="/tools/image-resizer" element={<ImageResizer />} />
          <Route path="/tools/pdf-merge" element={<PdfMerge />} />
          <Route path="/tools/pdf-split" element={<PdfSplit />} />
          <Route path="/tools/pdf-compress" element={<PdfCompress />} />
          <Route path="/tools/pdf-rotate" element={<PdfRotate />} />
          <Route path="/tools/pdf-to-text" element={<PdfToText />} />
          <Route path="/tools/text-to-pdf" element={<TextToPdf />} />
          <Route path="/tools/qr-generator" element={<QrGenerator />} />
          <Route path="/tools/text-tools" element={<WordCounter />} />
          <Route path="/tools/unit-converter" element={<UnitConverter />} />
          <Route path="/tools/bulk-whatsapp" element={<BulkWhatsApp />} />

          <Route path="/tools/dev-studio" element={<DevStudio />} />
          <Route path="/tools/password-generator" element={<PasswordGenerator />} />
          <Route path="/tools/color-picker" element={<ColorPicker />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/upgrade" element={<ProUpgrade />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      <AudioPlayer />

      {onboarding.isOpen && (
        <OnboardingModal
          step={onboarding.step}
          totalSteps={onboarding.totalSteps}
          onNext={onboarding.nextStep}
          onPrev={onboarding.prevStep}
          onClose={onboarding.completeOnboarding}
          onGoToStep={onboarding.goToStep}
        />
      )}

      {showInstallBanner && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md rounded-2xl border p-4 shadow-2xl flex items-center justify-between gap-4 animate-slideUp"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 text-white text-sm font-bold">
              E
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Install Ekam App</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Add to home screen for native-like experience.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInstallBanner(false)} className="btn-secondary !py-1.5 !px-3 text-xs">
              Dismiss
            </button>
            <button onClick={handleInstallClick} className="btn-primary !py-1.5 !px-3 text-xs" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}>
              Install
            </button>
          </div>
        </div>
      )}

    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AudioProvider>
            <DocumentProvider>
              <AppContent />
            </DocumentProvider>
          </AudioProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
