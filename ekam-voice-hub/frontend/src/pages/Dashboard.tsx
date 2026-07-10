import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Volume2, Mic, FileText, Languages, ArrowRight, Zap, Globe, BookOpen,
  Clock, TrendingUp, Sparkles, Library, Wrench, FileImage, QrCode, MessageSquare, Network,
} from 'lucide-react'
import { getHealth, getLibrary, LibraryItem, HealthResponse } from '../api/client'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../contexts/AuthContext'

const quickActions = [
  { to: '/tts', icon: Volume2, label: 'Text to Speech', desc: 'Convert text to natural speech', gradient: 'from-blue-500 to-cyan-500' },
  { to: '/stt', icon: Mic, label: 'Speech to Text', desc: 'Transcribe audio to text', gradient: 'from-green-500 to-emerald-500' },
  { to: '/documents', icon: FileText, label: 'Document Reader', desc: 'Read docs aloud with AI', gradient: 'from-purple-500 to-pink-500' },
  { to: '/translate', icon: Languages, label: 'Translate', desc: 'Translate between languages', gradient: 'from-orange-500 to-red-500' },
  { to: '/tools/bulk-whatsapp', icon: MessageSquare, label: 'Bulk WhatsApp', desc: 'Send messages to multiple contacts', gradient: 'from-green-500 to-emerald-600' },
  { to: '/tools/ai-vision', icon: Sparkles, label: 'AI Vision Analyzer', desc: 'Analyze images & diagrams using NVIDIA AI', gradient: 'from-amber-500 to-orange-500' },
  { to: '/tools/image-to-word', icon: FileImage, label: 'Image to Word', desc: 'Extract text from images via OCR', gradient: 'from-cyan-500 to-teal-500' },
  { to: '/tools/pdf-merge', icon: Wrench, label: 'PDF Tools', desc: 'Merge, split, compress & rotate PDFs', gradient: 'from-pink-500 to-rose-500' },
  { to: '/tools/qr-generator', icon: QrCode, label: 'QR Generator', desc: 'Create QR codes instantly', gradient: 'from-violet-500 to-purple-500' },
  { to: '/tools/dev-studio', icon: Wrench, label: 'Developer Studio', desc: 'Format JSON, Base64 encode and decode data', gradient: 'from-sky-500 to-blue-500' },
]

const userTips = [
  'Upload PDFs, DOCX, or images and listen to them with natural voices',
  'Transcribe lectures and meetings to text with high accuracy',
  'Translate text between 30+ languages instantly',
  'Adjust speech speed for better comprehension while studying',
  'Use the Library to save and organize your documents and conversions',
]

const adminTips = [
  'Upload PDFs, DOCX, or images (OCR) and listen to them with natural voices',
  'Use VoxCPM2 for 30-language multilingual support with voice cloning',
  'Edge-TTS works offline with 20+ languages and natural voices',
  'Transcribe lectures/meetings and translate to any language',
  'Adjust speech speed for better comprehension while studying',
  'Use the Library to save and organize your documents and conversions',
]

const greetings = ['Good morning', 'Good afternoon', 'Good evening']

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [recentItems, setRecentItems] = useState<LibraryItem[]>([])
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const { isAdmin, isSignedUp, user, usage, limits, isPro } = useAuth()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? greetings[0] : hour < 17 ? greetings[1] : greetings[2]

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {})
    getLibrary().then(items => setRecentItems(items.slice(0, 4)))
  }, [])

  const stats = [
    { icon: Globe, label: 'Languages', value: health?.languages_available || '30+' },
    { icon: Volume2, label: 'Voices', value: '20+' },
    { icon: BookOpen, label: 'Doc Formats', value: '16' },
  ]
  if (isAdmin) {
    stats.push({ icon: Zap, label: 'TTS Engines', value: '4' })
  }

  return (
    <div className="space-y-5">
      {/* Hero Section with Stats */}
      <div className="rounded-2xl text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg sm:text-xl font-bold">{greeting}{isSignedUp ? `, ${user.name}` : ''}</h1>
            <Sparkles size={18} className="text-white/50" />
          </div>
          <p className="text-sm text-white/70 max-w-xl leading-relaxed mb-4">
            Your AI-powered productivity hub for documents, speech, translation, and more.
          </p>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-all"
          >
            <BookOpen size={15} /> Start Reading
          </Link>

          <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon size={16} className="mx-auto text-white/60 mb-1" />
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Usage (compact) */}
      {!isPro && (
        <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Credits Remaining</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                WhatsApp: {limits.bulkWhatsApp - usage.bulkWhatsApp}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                TTS: {limits.tts - usage.tts}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                STT: {limits.stt - usage.stt}
              </span>
            </div>
          </div>
          <Link
            to="/profile"
            className="text-xs font-medium text-teal-500 hover:text-teal-600 whitespace-nowrap flex items-center gap-1"
          >
            Upgrade <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Zap size={16} className="text-primary-500" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {quickActions.map(({ to, icon: Icon, label, desc, gradient }) => (
            <Link
              key={to}
              to={to}
              className="rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className={`rounded-xl p-2.5 bg-gradient-to-br ${gradient} shadow-sm inline-flex mb-2.5`}>
                <Icon size={16} className="text-white" />
              </div>
              <h3 className="text-xs font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                {label}
              </h3>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity + Tips row */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent Items */}
        {recentItems.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Clock size={16} className="text-primary-500" /> Recent Activity
            </h2>
            <div className="space-y-2">
              {recentItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate('/library')}
                  className="rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all duration-200"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${
                      item.type === 'document' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600' :
                      item.type === 'tts' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                      'bg-orange-100 dark:bg-orange-900/20 text-orange-600'
                    }`}>
                      <Library size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {item.progress > 0 && (
                      <span className="text-[10px] font-semibold text-teal-500">{Math.round(item.progress * 100)}%</span>
                    )}
                  </div>
                  {item.progress > 0 && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div className="h-full rounded-full progress-bar-fill" style={{ width: `${item.progress * 100}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tips */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp size={16} className="text-primary-500" /> Pro Tips
          </h2>
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="space-y-2.5">
              {(isAdmin ? adminTips : userTips).map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
