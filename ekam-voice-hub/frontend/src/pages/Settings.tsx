import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Moon, Sun, Monitor, Trash2, Download, Upload,
  Keyboard, Palette, Crown, Settings as SettingsIcon,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../contexts/AuthContext'

const keyboardShortcuts = [
  { keys: 'Ctrl + Enter', action: 'Generate / Submit' },
  { keys: 'Space', action: 'Play / Pause audio' },
  { keys: 'Escape', action: 'Close modals / Stop' },
  { keys: 'Ctrl + K', action: 'Search' },
  { keys: 'Ctrl + V', action: 'Paste text (TTS)' },
  { keys: 'Ctrl + Shift + R', action: 'Start / Stop recording (STT)' },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { isPro, user, deactivatePro } = useAuth()

  const clearCache = () => {
    localStorage.removeItem('ekam-library')
    localStorage.removeItem('ekam-onboarding-complete')
    toast.success('Cache cleared')
  }

  const exportLibrary = () => {
    const data = localStorage.getItem('ekam-library')
    if (!data) {
      toast.error('No library data to export')
      return
    }
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ekam-library-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Library exported')
  }

  const importLibrary = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        localStorage.setItem('ekam-library', JSON.stringify(data))
        toast.success(`Imported ${data.length} items`)
      } catch {
        toast.error('Invalid file format')
      }
    }
    input.click()
  }

  const getStorageUsage = () => {
    let total = 0
    for (const key in localStorage) {
      if (key.startsWith('ekam-')) {
        total += localStorage.getItem(key)?.length || 0
      }
    }
    return (total / 1024).toFixed(1)
  }

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Subscription Plan */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Crown size={18} className="text-amber-500" /> Subscription Plan
        </h2>
        <div className="flex items-center justify-between p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {isPro ? 'Ekam Pro Plan' : 'Free Trial Tier'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {isPro
                ? `Unlimited usage activated${user.proExpiresAt ? ` (expires ${new Date(user.proExpiresAt).toLocaleDateString()})` : ' (Lifetime)'}`
                : '10 bulk messages and 20 voice operations limit per day.'}
            </p>
          </div>
          {isPro ? (
            <button onClick={deactivatePro} className="btn-secondary text-xs !py-1.5 !px-3 hover:text-red-500 hover:border-red-300">
              Downgrade
            </button>
          ) : (
            <Link to="/upgrade" className="btn-primary text-xs !py-1.5 !px-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Palette size={18} /> Appearance
        </h2>
        <div className="flex gap-2">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
              style={{ backgroundColor: theme === value ? undefined : 'var(--bg-secondary)' }}
            >
              <Icon size={22} className={theme === value ? 'text-primary-500' : ''} style={{ color: theme === value ? undefined : 'var(--text-secondary)' }} />
              <span className={`text-sm font-medium ${theme === value ? 'text-primary-600' : ''}`} style={{ color: theme === value ? undefined : 'var(--text-secondary)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Data & Storage</h2>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Storage Used</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{getStorageUsage()} KB</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportLibrary} className="btn-secondary text-xs">
            <Download size={14} /> Export Library
          </button>
          <button onClick={importLibrary} className="btn-secondary text-xs">
            <Upload size={14} /> Import Library
          </button>
          <button onClick={clearCache} className="btn-secondary text-xs text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={14} /> Clear Cache
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Keyboard size={18} /> Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {keyboardShortcuts.map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{action}</span>
              <kbd className="rounded-lg border px-2 py-1 text-[10px] font-mono" style={{
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-secondary)',
              }}>
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Link Footer */}
      <div className="text-center pt-2">
        <Link to="/legal" className="text-xs text-teal-500 hover:text-teal-600 hover:underline">
          Privacy & Terms
        </Link>
      </div>
    </div>
  )
}