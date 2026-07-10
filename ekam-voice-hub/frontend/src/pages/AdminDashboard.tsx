import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Shield, Server, Cpu, Globe, RotateCw, Key, Copy, Trash2,
  Settings, Info, Award, Calendar, ToggleLeft, ToggleRight, Sparkles,
} from 'lucide-react'
import { getHealth, HealthResponse } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function AdminDashboard() {
  const {
    licenses,
    adminGenerateLicense,
    adminRevokeLicense,
  } = useAuth()

  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [checking, setChecking] = useState(false)

  // AI Model switcher states
  const [prefTts, setPrefTts] = useState(() => localStorage.getItem('ekam-pref-tts-engine') || 'edge_tts')
  const [prefStt, setPrefStt] = useState(() => localStorage.getItem('ekam-pref-stt-size') || 'base')

  // License generator states
  const [genEmail, setGenEmail] = useState('')
  const [genDuration, setGenDuration] = useState<30 | 365 | 0>(0) // 0 = Lifetime
  const [recentGenKey, setRecentGenKey] = useState('')

  const checkConnection = () => {
    setChecking(true)
    getHealth()
      .then(res => {
        setHealth(res)
        toast.success('Connection verified')
      })
      .catch(() => {
        setHealth(null)
        toast.error('Backend offline')
      })
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const handleSavePrefTts = (val: string) => {
    setPrefTts(val)
    localStorage.setItem('ekam-pref-tts-engine', val)
    toast.success(`Default TTS Engine set to ${val}`)
  }

  const handleSavePrefStt = (val: string) => {
    setPrefStt(val)
    localStorage.setItem('ekam-pref-stt-size', val)
    toast.success(`Default STT Model Size set to ${val}`)
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genEmail.trim()) {
      toast.error('Enter an email address')
      return
    }
    if (!genEmail.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    try {
      const days = genDuration > 0 ? genDuration : undefined
      const key = await adminGenerateLicense(genEmail.trim(), days)
      setRecentGenKey(key)
      setGenEmail('')
      toast.success('License key generated')
    } catch (e) {
      toast.error('Failed to generate license')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Server size={18} className="mx-auto text-teal-500 mb-2" />
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {health ? 'Active' : 'Offline'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Backend Connection</div>
        </div>
        <div className="card p-4 text-center">
          <Cpu size={18} className="mx-auto text-green-500 mb-2" />
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {health ? `v${health.version}` : 'N/A'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Engine Version</div>
        </div>
        <div className="card p-4 text-center">
          <Globe size={18} className="mx-auto text-blue-500 mb-2" />
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {health ? health.languages_available : 'N/A'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Supported Languages</div>
        </div>
        <div className="card p-4 text-center">
          <Award size={18} className="mx-auto text-amber-500 mb-2" />
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {licenses.filter(l => l.status === 'active').length}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Active Licenses</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Key Generator */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Key size={16} className="text-amber-500" /> License Key Generator
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Create cryptographic license keys to activate Ekam Pro tiers for users.
          </p>

          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div>
              <label className="label">User Email Address</label>
              <input
                type="email"
                placeholder="customer@example.com"
                className="input text-xs"
                value={genEmail}
                onChange={e => setGenEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Validity Period</label>
              <select
                className="input text-xs"
                value={genDuration}
                onChange={e => setGenDuration(Number(e.target.value) as any)}
              >
                <option value={0}>Lifetime (Unlimited)</option>
                <option value={30}>30 Days (Monthly)</option>
                <option value={365}>365 Days (Yearly)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs font-semibold">
              <Sparkles size={14} /> Generate & Register
            </button>
          </form>

          {recentGenKey && (
            <div className="rounded-xl border p-3 border-amber-200 dark:border-amber-900/30 bg-amber-500/5 mt-3 space-y-2">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Generated Key:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono font-bold select-all flex-1" style={{ color: 'var(--text-primary)' }}>{recentGenKey}</code>
                <button onClick={() => copyToClipboard(recentGenKey)} className="btn-secondary !p-1.5">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Engine Settings */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Settings size={16} className="text-teal-500" /> Default AI Engine & Fallbacks
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure default models and parameters globally for text-to-speech and transcription.
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Default TTS Engine</label>
              <select
                value={prefTts}
                onChange={e => handleSavePrefTts(e.target.value)}
                className="input text-xs"
              >
                <option value="edge_tts">Edge TTS (Fast, Online)</option>
                <option value="gtts">Google TTS (Lightweight)</option>
                <option value="voxcpm">VoxCPM2 (Cloning, Multilingual)</option>
                <option value="kittentts">KittenTTS (Offline CPU)</option>
              </select>
            </div>
            <div>
              <label className="label">Default STT Model Size</label>
              <select
                value={prefStt}
                onChange={e => handleSavePrefStt(e.target.value)}
                className="input text-xs"
              >
                <option value="tiny">Tiny (Fastest)</option>
                <option value="base">Base (Recommended default)</option>
                <option value="small">Small (Balanced)</option>
                <option value="medium">Medium (Accurate)</option>
                <option value="large">Large (Max Accuracy)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* License Registry list */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award size={16} className="text-emerald-500" /> License Keys Database
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            View and manage active license tokens. Revoked keys immediately deactivate Pro status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">License Key</th>
                <th className="py-2.5 px-3">Expires At</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    No licenses generated yet. Use the Key Generator above.
                  </td>
                </tr>
              ) : (
                licenses.map(lic => (
                  <tr key={lic.key} className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/10" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{lic.email}</td>
                    <td className="py-3 px-3"><code className="font-mono">{lic.key}</code></td>
                    <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>
                      {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Lifetime'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge ${
                        lic.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button onClick={() => copyToClipboard(lic.key)} className="btn-ghost !p-1.5" title="Copy Key">
                        <Copy size={12} />
                      </button>
                      {lic.status === 'active' && (
                        <button onClick={() => adminRevokeLicense(lic.key)} className="btn-ghost text-red-500 hover:text-red-600 !p-1.5" title="Revoke License">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Info size={16} /> Premium Engine Configuration commands
        </h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { name: 'VoxCPM2', desc: 'Voice cloning engine', cmd: 'pip install voxcpm' },
            { name: 'KittenTTS', desc: 'Ultra-fast offline CPU engine', cmd: 'pip install kittentts' },
            { name: 'Whisper', desc: 'Speech recognition engine', cmd: 'pip install openai-whisper' },
          ].map(e => (
            <div key={e.name} className="rounded-xl border p-3.5 space-y-2 bg-gray-50/50 dark:bg-gray-800/10" style={{ borderColor: 'var(--border)' }}>
              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{e.name}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.desc}</p>
              <code className="block select-all bg-gray-200 dark:bg-gray-800 rounded p-1.5 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{e.cmd}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
