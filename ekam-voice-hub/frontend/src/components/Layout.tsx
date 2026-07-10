import { useState } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Volume2, Mic, FileText, Languages, Library, Settings,
  Ear, Shield, Wrench, Crown, User, LogOut,
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
  const { isAdmin, signOut } = useAuth()

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

    </div>
  )
}
