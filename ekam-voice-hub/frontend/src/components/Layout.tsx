import { useState } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Volume2, Mic, FileText, Languages, Library, Settings,
  Ear, Shield, ShieldOff, Lock, LogOut, X, Wrench, Crown, Bot, User,
} from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const baseNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', shortLabel: 'Home' },
  { to: '/tts', icon: Volume2, label: 'Text to Speech', shortLabel: 'TTS' },
  { to: '/stt', icon: Mic, label: 'Speech to Text', shortLabel: 'STT' },
  { to: '/documents', icon: FileText, label: 'Documents', shortLabel: 'Docs' },
  { to: '/translate', icon: Languages, label: 'Translate', shortLabel: 'Trans' },
  { to: '/audio-translate', icon: Ear, label: 'Audio Translate', shortLabel: 'Aud Trans' },
  { to: '/tools', icon: Wrench, label: 'Tools', shortLabel: 'Tools' },
  { to: '/library', icon: Library, label: 'Library', shortLabel: 'Library' },
  { to: '/profile', icon: User, label: 'Profile', shortLabel: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings', shortLabel: 'Settings' },
]

export default function Layout() {
  const location = useLocation()
  const { isAdmin, isSignedUp, signOut, user } = useAuth()
  const { registerUser, authenticateUser } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'admin'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin Console', shortLabel: 'Admin' }] : [])
  ]

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
  }

  const closeModal = () => {
    setShowAuth(false)
    resetForm()
    setRecaptchaToken(null)
    setAgreedToPolicy(false)
  }

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter email and password')
      return
    }
    const result = authenticateUser(email.trim(), password)
    if (result.success) {
      closeModal()
      toast.success(result.role === 'admin' ? 'Admin mode enabled' : `Welcome back!`)
    } else {
      toast.error(result.error || 'Invalid credentials')
    }
  }

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToPolicy) {
      toast.error('You must agree to the Privacy Policy')
      return
    }
    if (!recaptchaToken) {
      toast.error('Please complete the reCAPTCHA verification')
      return
    }
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Please fill all fields')
      return
    }
    const result = registerUser(email.trim(), password, name.trim())
    if (result.success) {
      closeModal()
      toast.success(`Signed up as ${name.trim()}`)
      setAuthTab('signin')
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter admin email and password')
      return
    }
    const result = authenticateUser(email.trim(), password)
    if (result.success && result.role === 'admin') {
      closeModal()
      toast.success('Admin mode enabled')
    } else {
      toast.error('Invalid admin credentials')
    }
  }

  const getPageTitle = () => {
    const item = navItems.find(n => n.to === location.pathname)
    return item?.label || 'Ekam Tools'
  }

  const getPageIcon = () => {
    const item = navItems.find(n => n.to === location.pathname)
    const Icon = item?.icon || LayoutDashboard
    return <Icon size={22} className="text-white" />
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 border-r z-30"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="flex h-14 items-center gap-2.5 px-5 border-b" style={{ borderColor: 'var(--nav-border)' }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 text-white text-xs font-bold">
            E
          </div>
          <span className="text-base font-bold gradient-text">Ekam Tools</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--nav-border)' }}>
          {!isAdmin && (
            <Link
              to="/upgrade"
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-teal-600 to-indigo-600 p-2.5 text-white shadow-sm hover:shadow-md transition-all"
            >
              <Crown size={14} className="text-amber-300 fill-amber-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold">Ekam Pro</p>
                <p className="text-[9px] text-white/70 leading-tight">Unlock unlimited usage</p>
              </div>
            </Link>
          )}

          {isSignedUp || isAdmin ? (
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Shield size={12} className={isAdmin ? 'text-amber-500' : 'text-primary-500'} />
              <span>{isAdmin ? 'Exit Admin' : `Sign Out (${isAdmin ? 'Admin' : user.name})`}</span>
              <LogOut size={12} className="ml-auto" />
            </button>
          ) : (
            <button
              onClick={() => { setAuthTab('signin'); setShowAuth(true) }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--text-muted)' }}
            >
              <Lock size={12} />
              <span>Sign In / Sign Up</span>
            </button>
          )}
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ekam Tools v2.0</p>
        </div>
      </aside>

      {/* Mobile spacer */}
      <div className="lg:hidden h-12" />

      {/* Mobile header */}
      <header
        className="fixed top-0 left-0 right-0 z-20 lg:hidden flex items-center gap-3 px-4 py-2.5 shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white text-xs font-bold">E</div>
        <span className="text-base font-bold text-white flex-1">{getPageTitle()}</span>
        {isSignedUp || isAdmin ? (
          <button onClick={() => signOut()} className="rounded-lg bg-white/15 p-1.5 text-white" title="Sign out">
            <LogOut size={14} />
          </button>
        ) : (
          <button onClick={() => setShowAuth(true)} className="rounded-lg bg-white/15 p-1.5 text-white" title="Sign in">
            <User size={14} />
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Desktop header */}
        <div
          className="hidden lg:block px-6 py-5"
          style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 shadow-sm">
              {getPageIcon()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{getPageTitle()}</h1>
              <p className="text-xs text-white/70">
                {location.pathname === '/' && 'Your AI-powered productivity hub'}

                {location.pathname === '/tts' && 'Convert text to natural-sounding speech'}
                {location.pathname === '/stt' && 'Transcribe audio and recordings to text'}
                {location.pathname === '/documents' && 'Upload, read & listen to documents'}
                {location.pathname === '/translate' && 'Translate text between 30+ languages'}
                {location.pathname === '/audio-translate' && 'Record audio and get translated speech'}
                {location.pathname.startsWith('/tools') && 'Scan, convert, edit PDFs, generate QR codes, and send bulk messages'}
                {location.pathname === '/library' && 'Your saved documents and conversions'}
                {location.pathname === '/settings' && 'Appearance, data, and preferences'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 sm:px-5 lg:px-6 py-5 lg:py-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t pb-safe"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="flex items-center justify-around px-1 py-0.5">
          {navItems.map(({ to, icon: Icon, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `bottom-tab ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{shortLabel}</span>
              <div className="tab-indicator" />
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="lg:hidden h-14" />

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-modal border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                {authTab === 'signin' && <Lock size={16} className="text-primary-500" />}
                {authTab === 'signup' && <User size={16} className="text-primary-500" />}
                {authTab === 'admin' && <Shield size={16} className="text-amber-500" />}
                {authTab === 'signin' && 'Sign In'}
                {authTab === 'signup' && 'Create Account'}
                {authTab === 'admin' && 'Admin Access'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex border-b mb-4" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setAuthTab('signin')}
                className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-colors ${authTab === 'signin' ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-400 hover:text-gray-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthTab('signup')}
                className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-colors ${authTab === 'signup' ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-400 hover:text-gray-500'}`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setAuthTab('admin'); setEmail('admin@ekam.com'); setPassword('') }}
                className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-colors ${authTab === 'admin' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-500'}`}
              >
                Admin
              </button>
            </div>

            {authTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Sign in with your email and password.
                </p>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input text-xs" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="input text-xs" required />
                </div>
                <button type="submit" className="btn-primary w-full py-2 text-xs font-semibold">Sign In</button>
                <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setAuthTab('signup')} className="text-primary-500 font-semibold hover:underline">Sign Up</button>
                </p>
              </form>
            )}

            {authTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Create an account to get started.
                </p>
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" className="input text-xs" required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input text-xs" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 4 characters" className="input text-xs" required minLength={4} />
                </div>
                
                <div className="flex items-start gap-2 pt-1">
                  <input type="checkbox" id="policy" checked={agreedToPolicy} onChange={e => setAgreedToPolicy(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  <label htmlFor="policy" className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    I agree to the <Link to="/legal" onClick={closeModal} className="text-teal-600 hover:underline">Privacy Policy</Link> and Terms of Service.
                  </label>
                </div>

                <div className="flex justify-center pt-2">
                  <div className="scale-75 sm:scale-90 origin-top">
                    <ReCAPTCHA
                      sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                      onChange={(val) => setRecaptchaToken(val)}
                      theme="light"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full py-2 text-xs font-semibold">Create Account</button>
                <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setAuthTab('signin')} className="text-primary-500 font-semibold hover:underline">Sign In</button>
                </p>
              </form>
            )}

            {authTab === 'admin' && (
              <form onSubmit={handleAdminSignIn} className="space-y-3">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Sign in with admin credentials to access the admin console.
                </p>
                <div>
                  <label className="label">Admin Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@ekam.com" className="input text-xs" required />
                </div>
                <div>
                  <label className="label">Admin Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" className="input text-xs" required />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 text-xs py-2" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                    <Lock size={14} /> Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
