import { useEffect, useState, useRef } from 'react'
import { getLanguages } from '../api/client'
import { Globe, Search, ChevronDown, Check } from 'lucide-react'

interface LanguageSelectorProps {
  value: string
  onChange: (code: string) => void
  label?: string
  filter?: string[]
}

const flagEmojis: Record<string, string> = {
  en: '🇬🇧', hi: '🇮🇳', bn: '🇧🇩', te: '🇮🇳', mr: '🇮🇳',
  ta: '🇮🇳', gu: '🇮🇳', kn: '🇮🇳', ml: '🇮🇳', pa: '🇮🇳',
  ur: '🇵🇰', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', ja: '🇯🇵',
  ko: '🇰🇷', zh: '🇨🇳', ar: '🇸🇦', pt: '🇵🇹', ru: '🇷🇺',
  it: '🇮🇹', nl: '🇳🇱', tr: '🇹🇷', pl: '🇵🇱', vi: '🇻🇳',
  th: '🇹🇭', sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴',
  cs: '🇨🇿', ro: '🇷🇴', hu: '🇭🇺', el: '🇬🇷', he: '🇮🇱',
  id: '🇮🇩', ms: '🇲🇾',
}

const commonLanguages = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'ur', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'pt', 'ru']

export default function LanguageSelector({
  value, onChange, label, filter,
}: LanguageSelectorProps) {
  const [languages, setLanguages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getLanguages()
      .then(setLanguages)
      .catch(() => {
        setLanguages({
          en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu',
          mr: 'Marathi', ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada',
          ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu',
          es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese',
          ko: 'Korean', zh: 'Chinese', ar: 'Arabic', pt: 'Portuguese',
          ru: 'Russian', it: 'Italian', nl: 'Dutch', tr: 'Turkish',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let entries = Object.entries(languages)
  if (filter) {
    entries = entries.filter(([code]) => filter.includes(code))
  }

  const getLanguageName = (code: string) => {
    const match = entries.find(([c]) => c === code)
    return match ? match[1] : code
  }

  if (loading) {
    return (
      <div>
        {label && <label className="label">{label}</label>}
        <div className="input flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Globe size={16} />
          Loading languages...
        </div>
      </div>
    )
  }

  const filteredEntries = search
    ? entries.filter(([code, name]) =>
        name.toLowerCase().includes(search.toLowerCase()) ||
        code.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  const commonEntries = entries.filter(([code]) => commonLanguages.includes(code))
  const otherEntries = entries.filter(([code]) => !commonLanguages.includes(code))

  const selectedName = getLanguageName(value)

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="input flex items-center gap-2 text-left cursor-pointer"
        >
          {value !== 'auto' && flagEmojis[value] && (
            <span className="text-base">{flagEmojis[value]}</span>
          )}
          <Globe size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span className="flex-1 truncate">
            {value === 'auto' ? 'Auto-detect' : (selectedName || value)}
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>

        {open && (
          <div
            className="absolute z-50 mt-1 w-full rounded-2xl border shadow-2xl overflow-hidden animate-fadeInDown"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              maxHeight: '320px',
            }}
          >
            {/* Search */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full rounded-xl border-0 bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
              {value !== 'auto' && !filter && (
                <button
                  onClick={() => { onChange('auto'); setOpen(false); setSearch('') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Globe size={16} />
                  Auto-detect
                </button>
              )}

              {!search && commonEntries.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Common
                  </div>
                  {commonEntries.map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => { onChange(code); setOpen(false); setSearch('') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: code === value ? '#4f46e5' : 'var(--text-primary)' }}
                    >
                      <span className="text-base w-6">{flagEmojis[code] || '🌐'}</span>
                      <span className="flex-1 text-left">{name}</span>
                      {code === value && <Check size={14} className="text-primary-500" />}
                    </button>
                  ))}
                </>
              )}

              {!search && otherEntries.length > 0 && (
                <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  All Languages
                </div>
              )}

              {(search ? filteredEntries : otherEntries).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { onChange(code); setOpen(false); setSearch('') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: code === value ? '#4f46e5' : 'var(--text-primary)' }}
                >
                  <span className="text-base w-6">{flagEmojis[code] || '🌐'}</span>
                  <span className="flex-1 text-left">{name}</span>
                  {code === value && <Check size={14} className="text-primary-500" />}
                </button>
              ))}

              {filteredEntries.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No languages found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
