import { useState, useCallback } from 'react'
import { Shield, Copy, RefreshCw, Key, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function PasswordGenerator() {
  const { trackUsage, getRemainingUsage } = useAuth()
  const [password, setPassword] = useState('')
  const [length, setLength] = useState(16)
  const [useUppercase, setUseUppercase] = useState(true)
  const [useLowercase, setUseLowercase] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [copied, setCopied] = useState(false)

  const generatePassword = useCallback(() => {
    // We'll treat this as a free local tool, but maybe track it for usage analytics if needed
    // Actually, let's just let it be free without limits since it's client-side, 
    // or we can track it under a general 'tools' category if we had one.
    // For now we don't need to enforce a hard API limit, it's just a basic tool.

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-='

    let chars = ''
    if (useUppercase) chars += upper
    if (useLowercase) chars += lower
    if (useNumbers) chars += numbers
    if (useSymbols) chars += symbols

    if (chars === '') {
      toast.error('Please select at least one character type')
      return
    }

    let generated = ''
    const array = new Uint32Array(length)
    window.crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      generated += chars[array[i] % chars.length]
    }

    setPassword(generated)
    setCopied(false)
  }, [length, useUppercase, useLowercase, useNumbers, useSymbols])

  const copyToClipboard = () => {
    if (!password) return
    navigator.clipboard.writeText(password)
    setCopied(true)
    toast.success('Password copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const getStrength = () => {
    if (!password) return { label: 'None', color: 'bg-gray-200 text-gray-500' }
    let score = 0
    if (length > 8) score++
    if (length > 12) score++
    if (useUppercase && useLowercase) score++
    if (useNumbers) score++
    if (useSymbols) score++

    if (score < 3) return { label: 'Weak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    if (score < 5) return { label: 'Good', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
    return { label: 'Strong', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  }

  const strength = getStrength()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="page-header">
        <div className="page-header-icon bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
          <Shield size={24} />
        </div>
        <div>
          <h1>Password Generator</h1>
          <p>Create secure, random passwords locally</p>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="relative">
          <div className="p-4 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full text-center sm:text-left overflow-x-auto">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-gray-900 dark:text-gray-100 select-all whitespace-nowrap">
                {password || 'Click Generate'}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={copyToClipboard}
                disabled={!password}
                className="btn-secondary flex-1 sm:flex-none"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <button
                onClick={generatePassword}
                className="btn-primary flex-1 sm:flex-none"
              >
                <RefreshCw size={18} className={!password ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
          {password && (
            <div className="absolute -top-3 right-4">
              <span className={`badge ${strength.color} px-3 py-1 shadow-sm border border-white dark:border-gray-800`}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex justify-between mb-2">
              <label className="label">Password Length</label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{length}</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={useUppercase}
                onChange={(e) => setUseUppercase(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">Uppercase (A-Z)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={useLowercase}
                onChange={(e) => setUseLowercase(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">Lowercase (a-z)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={(e) => setUseNumbers(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">Numbers (0-9)</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">Symbols (!@#$)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
