import { useState, useMemo } from 'react'
import { Type, Hash, AlignLeft, Copy, Check, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

type TransformType = 'uppercase' | 'lowercase' | 'titlecase' | 'sentencecase' | 'camelcase' | 'reverse'

const transforms: { key: TransformType; label: string }[] = [
  { key: 'uppercase', label: 'UPPER CASE' },
  { key: 'lowercase', label: 'lower case' },
  { key: 'titlecase', label: 'Title Case' },
  { key: 'sentencecase', label: 'Sentence case' },
  { key: 'camelcase', label: 'camelCase' },
  { key: 'reverse', label: 'Reverse Text' },
]

export default function WordCounter() {
  const [text, setText] = useState('')
  const [activeTransform, setActiveTransform] = useState<TransformType | null>(null)
  const [copied, setCopied] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    const charsNoSpace = text.replace(/\s/g, '').length
    const sentences = text ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0
    const paragraphs = text ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0
    const lines = text ? text.split('\n').length : 0
    const readingTime = Math.ceil(words / 200)
    const speakingTime = Math.ceil(words / 150)

    return { words, chars, charsNoSpace, sentences, paragraphs, lines, readingTime, speakingTime }
  }, [text])

  const transformedText = useMemo(() => {
    if (!activeTransform || !text) return text
    switch (activeTransform) {
      case 'uppercase': return text.toUpperCase()
      case 'lowercase': return text.toLowerCase()
      case 'titlecase': return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      case 'sentencecase': return text.replace(/(?:^\s*|\.\s+)(\w)/g, (_, c) => c.toUpperCase())
      case 'camelcase': return text.replace(/[\s\-_]+(\w)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase())
      case 'reverse': return text.split('').reverse().join('')
      default: return text
    }
  }, [text, activeTransform])

  const handleReplace = () => {
    if (!findText) return
    setText(prev => prev.split(findText).join(replaceText))
    toast.success(`Replaced all "${findText}" with "${replaceText}"`)
  }

  const copyText = () => {
    navigator.clipboard.writeText(transformedText || text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  const clearText = () => {
    setText('')
    setActiveTransform(null)
    toast.success('Cleared')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(reader.result as string)
    reader.readAsText(file)
    toast.success(`Loaded ${file.name}`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Type size={24} className="text-primary-500" /> Text Tools
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Word counter, character counter, case converter, and find & replace.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 card space-y-3">
          <div className="flex items-center justify-between">
            <label className="label !mb-0">Input Text</label>
            <div className="flex gap-1">
              <label className="btn-ghost text-xs !py-1.5 !px-2 cursor-pointer">
                <Upload size={12} /> .txt
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
              <button onClick={clearText} className="btn-ghost text-xs !py-1.5 !px-2">
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            className="input min-h-[200px] resize-y"
            rows={8}
          />

          {/* Find & Replace */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Find</label>
              <input
                type="text"
                value={findText}
                onChange={e => setFindText(e.target.value)}
                placeholder="Find text..."
                className="input !py-1.5 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Replace with</label>
              <input
                type="text"
                value={replaceText}
                onChange={e => setReplaceText(e.target.value)}
                placeholder="Replace..."
                className="input !py-1.5 text-sm"
              />
            </div>
            <button onClick={handleReplace} disabled={!findText} className="btn-secondary text-sm !py-1.5 !px-3">
              Replace All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Statistics</h3>
          {[
            { label: 'Words', value: stats.words },
            { label: 'Characters', value: stats.chars },
            { label: 'Characters (no space)', value: stats.charsNoSpace },
            { label: 'Sentences', value: stats.sentences },
            { label: 'Paragraphs', value: stats.paragraphs },
            { label: 'Lines', value: stats.lines },
            { label: 'Reading Time', value: `${stats.readingTime} min` },
            { label: 'Speaking Time', value: `${stats.speakingTime} min` },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transform */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Case Converter</h3>
          <button onClick={copyText} className="btn-ghost text-xs !py-1.5 !px-2">
            {copied ? <Check size={12} /> : <Copy size={12} />} Copy
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {transforms.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTransform(activeTransform === t.key ? null : t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTransform === t.key
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={{ color: activeTransform === t.key ? 'white' : 'var(--text-secondary)', borderColor: 'var(--border)' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {activeTransform && transformedText && (
          <div
            className="rounded-xl border p-4 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap break-all"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {transformedText}
          </div>
        )}
      </div>
    </div>
  )
}
