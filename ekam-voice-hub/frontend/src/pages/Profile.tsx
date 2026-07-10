import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User, Mail, Crown, Key, Clock, Calendar, Check,
  MessageSquare, Volume2, Mic, Languages, FileText, QrCode, LogOut, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const navigate = useNavigate()
  const {
    user,
    isPro,
    isSignedUp,
    registerUser,
    signOut,
    usage,
    limits,
    getRemainingUsage,
    getUsagePercent,
    verifyAndActivatePro,
  } = useAuth()

  // Sign up input states
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')

  // License activation input state
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [activating, setActivating] = useState(false)

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
      toast.error('Fill all fields')
      return
    }
    if (!emailInput.includes('@')) {
      toast.error('Enter a valid email')
      return
    }
    const result = registerUser(emailInput.trim(), passwordInput, nameInput.trim())
    if (result.success) {
      toast.success('Welcome to Ekam Tools!')
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKeyInput.trim()) {
      toast.error('Please enter a license key')
      return
    }
    setActivating(true)
    setTimeout(() => {
      if (verifyAndActivatePro(user.email, licenseKeyInput.trim())) {
        toast.success('Pro features activated successfully!')
        setLicenseKeyInput('')
      } else {
        toast.error('Invalid or revoked license key for this email.')
      }
      setActivating(false)
    }, 800)
  }

  const usageCards = [
    { key: 'bulkWhatsApp', label: 'Bulk WhatsApp', limit: limits.bulkWhatsApp, used: usage.bulkWhatsApp, icon: MessageSquare, color: 'from-green-500 to-emerald-500' },
    { key: 'tts', label: 'Text to Speech', limit: limits.tts, used: usage.tts, icon: Volume2, color: 'from-blue-500 to-cyan-500' },
    { key: 'stt', label: 'Speech to Text', limit: limits.stt, used: usage.stt, icon: Mic, color: 'from-purple-500 to-indigo-500' },
    { key: 'translate', label: 'Translations', limit: limits.translate, used: usage.translate, icon: Languages, color: 'from-orange-500 to-red-500' },
    { key: 'pdfTools', label: 'PDF Tools', limit: limits.pdfTools, used: usage.pdfTools, icon: FileText, color: 'from-pink-500 to-rose-500' },
    { key: 'qrCodes', label: 'QR Generator', limit: limits.qrCodes, used: usage.qrCodes, icon: QrCode, color: 'from-violet-500 to-purple-500' },
  ] as const

  const getProgressBarColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500'
    if (percent < 80) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (!isSignedUp) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="card text-center space-y-6 border p-8" style={{ borderColor: 'var(--border)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white shadow-md">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Create Your Profile</h2>
            <p className="text-xs mt-1.5 leading-normal" style={{ color: 'var(--text-secondary)' }}>
              Set up your profile to track daily usage credits and activate Pro licenses.
            </p>
          </div>
          <form onSubmit={handleSignUp} className="space-y-4 text-left">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                className="input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="At least 4 characters"
                className="input"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
                minLength={4}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-xs font-semibold">
              Create Profile
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile summary header */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card flex flex-col justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 shrink-0 font-bold text-2xl border" style={{ borderColor: 'var(--border)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}</h2>
              <p className="text-xs flex items-center gap-1.5 mt-1" style={{ color: 'var(--text-secondary)' }}>
                <Mail size={12} /> {user.email}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={signOut} className="btn-secondary text-xs !py-1.5 flex items-center gap-1">
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* License/Crown Card */}
        <div className={`card overflow-hidden text-white flex flex-col justify-between p-6 relative`}
          style={{
            background: isPro
              ? 'linear-gradient(135deg, #d97706, #b45309)'
              : 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))'
          }}
        >
          {isPro ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Subscription Status</span>
                  <Crown size={20} className="text-amber-300 fill-amber-300" />
                </div>
                <h3 className="text-lg font-bold">Ekam Pro Plan</h3>
                <p className="text-xs text-amber-100 leading-normal">
                  All usage limit constraints are completely unlocked.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                <p className="text-[10px] text-amber-200 flex items-center gap-1">
                  <Calendar size={10} /> Activated Since: {user.proSince ? new Date(user.proSince).toLocaleDateString() : 'N/A'}
                </p>
                {user.proExpiresAt && (
                  <p className="text-[10px] text-amber-200 flex items-center gap-1">
                    <Clock size={10} /> Expires At: {new Date(user.proExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/70">Subscription Status</span>
                  <Crown size={20} className="text-white/40" />
                </div>
                <h3 className="text-lg font-bold">Free Trial Tier</h3>
                <p className="text-xs text-white/80 leading-normal">
                  Daily request quotas are active. Upgrade to unlock unlimited usage.
                </p>
              </div>
              <button onClick={() => navigate('/upgrade')} className="btn-secondary !bg-white/20 !border-white/20 !text-white text-xs !py-1.5 w-full flex items-center justify-center gap-1.5 mt-4">
                View Pro Plans <ArrowRight size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* License key activation section for Free users */}
      {!isPro && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Key size={16} className="text-teal-500" /> Activate License Key
          </h3>
          <form onSubmit={handleActivateLicense} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter license key (e.g. EKAM-XXXX-XXXX)"
              className="input text-xs"
              value={licenseKeyInput}
              onChange={e => setLicenseKeyInput(e.target.value)}
              required
            />
            <button type="submit" disabled={activating} className="btn-primary text-xs shrink-0 py-2.5 px-4">
              {activating ? 'Verifying...' : 'Activate Pro'}
            </button>
          </form>
        </div>
      )}

      {/* Daily Usage Meters */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Daily Usage Counters</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Track your daily operation limits. Resets at midnight local time.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {usageCards.map(item => {
            const Icon = item.icon
            const percent = getUsagePercent(item.key)
            const remaining = getRemainingUsage(item.key)
            return (
              <div key={item.key} className="rounded-xl border p-4 flex flex-col justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 bg-gradient-to-br ${item.color} text-white shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isPro ? 'Unlimited Access' : `${remaining} remaining today`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <span>{percent.toFixed(0)}% used</span>
                    <span>{item.used} / {isPro ? '∞' : item.limit}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
