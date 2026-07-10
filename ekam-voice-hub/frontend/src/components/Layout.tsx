import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Volume2, Mic, FileText, Languages, Library, Settings,
  Ear, Shield, Wrench, Crown, User, LogOut, X, Mail, Lock, UserPlus, LogIn,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
  const { isAdmin, isAuthenticated, signOut, registerUser, authenticateUser } = useAuth()
  const [authOpen, setAuthOpen] = useState(!isAuthenticated)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated || isAdmin) setAuthOpen(false)
  }, [isAuthenticated, isAdmin])

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    if (authTab === 'signup') {
      const result = registerUser(authEmail, authPassword, authName)
      if (result.success) {
        setAuthOpen(false)
        setAuthLoading(false)
        return
      }
      setAuthError(result.error || 'Registration failed')
      setAuthLoading(false)
      return
    }

    const result = authenticateUser(authEmail, authPassword)
    if (result.success) {
      setAuthOpen(false)
      setAuthLoading(false)
      return
    }
    setAuthError(result.error || 'Invalid email or password')
    setAuthLoading(false)
  }

  const dismissAuth = () => {
    if (isAuthenticated || isAdmin) {
      setAuthOpen(false)
    }
  }

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin Console', shortLabel: 'Admin' }] : [])
  ]

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
      {/* Auth Modal */}
      {authOpen && !isAuthenticated && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => { setAuthTab('signin'); setAuthError('') }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${authTab === 'signin' ? 'text-primary-500' : ''}`}
                style={{ color: authTab === 'signin' ? 'var(--gradient-start)' : 'var(--text-muted)' }}
              >
                <LogIn size={14} className="inline mr-1.5" />
                Sign In
                {authTab === 'signin' && <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }} />}
              </button>
              <button
                onClick={() => { setAuthTab('signup'); setAuthError('') }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${authTab === 'signup' ? 'text-primary-500' : ''}`}
                style={{ color: authTab === 'signup' ? 'var(--gradient-start)' : 'var(--text-muted)' }}
              >
                <UserPlus size={14} className="inline mr-1.5" />
                Sign Up
                {authTab === 'signup' && <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }} />}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              <div className="text-center mb-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 text-white text-lg font-bold mb-2">E</div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Welcome to Ekam Tools</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{authTab === 'signin' ? 'Sign in to your account' : 'Create a new account'}</p>
              </div>

              {authError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-600 dark:text-red-400">
                  {authError}
                </div>
              )}

              {authTab === 'signup' && (
                <div>
                  <label className="label">Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text" value={authName} onChange={e => setAuthName(e.target.value)}
                      placeholder="Your name" required
                      className="input !pl-9 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="input !pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                    placeholder={authTab === 'signup' ? 'At least 4 characters' : 'Your password'} required
                    minLength={4}
                    className="input !pl-9 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={authLoading}
                className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' }}
              >
                {authLoading ? 'Please wait...' : authTab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="text-center space-y-2">
                <button type="button" onClick={dismissAuth} className="text-xs font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
                  Continue as Guest
                </button>
                {authTab === 'signin' && (
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Admin? Sign in with the admin email
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

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

          {isAdmin ? (
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Shield size={12} className="text-amber-500" />
              <span>Admin</span>
              <LogOut size={12} className="ml-auto" />
            </button>
          ) : null}
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
        {isAdmin && (
          <button onClick={() => signOut()} className="rounded-lg bg-white/15 p-1.5 text-white" title="Sign out">
            <LogOut size={14} />
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
        <div className="flex items-center gap-0.5 px-1 py-0.5 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {navItems.map(({ to, icon: Icon, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `bottom-tab snap-center shrink-0 ${isActive ? 'active' : ''}`
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

    </div>
  )
}
