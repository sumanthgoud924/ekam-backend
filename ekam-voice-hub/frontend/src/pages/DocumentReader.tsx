import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FileText, Book, Loader2, Volume2,
  Bookmark, BookmarkPlus, Sidebar, Type,
  ChevronLeft, ChevronRight, PenLine, Trash2, Gauge,
} from 'lucide-react'
import { uploadDocument, getDocument, textToSpeech, saveToLibrary, getLibrary, updateLibraryProgress } from '../api/client'
import { useAudio } from '../contexts/AudioContext'
import { useDocument } from '../contexts/DocumentContext'
import FileUploader from '../components/FileUploader'
import LanguageSelector from '../components/LanguageSelector'
import TextHighlighter from '../components/TextHighlighter'

export default function DocumentReader() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [language, setLanguage] = useState('en')
  const [voice, setVoice] = useState('default')
  const [speed, setSpeed] = useState(1.0)
  const [fontSize, setFontSize] = useState(16)
  const [lineSpacing, setLineSpacing] = useState(1.8)
  const [showChapters, setShowChapters] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [readMode, setReadMode] = useState<'normal' | 'speed'>('normal')
  const [speedWpm, setSpeedWpm] = useState(400)
  const [speedWord, setSpeedWord] = useState('')
  const speedTimerRef = useRef<number>(0)

  const audio = useAudio()
  const docCtx = useDocument()

  // Restore document from URL param on mount
  useEffect(() => {
    const filename = searchParams.get('file')
    if (filename && !docCtx.doc) {
      loadExistingDoc(filename)
    }
  }, [])

  const loadExistingDoc = async (filename: string) => {
    setLoading(true)
    try {
      const detail = await getDocument(filename)
      const uploadRes = {
        filename,
        pages: detail.pages || 1,
        content_preview: detail.content?.slice(0, 500) || '',
        total_characters: detail.total_characters || 0,
        language: detail.language || 'en',
        formats_detected: detail.formats_detected || [],
      }
      docCtx.setDocument(uploadRes, detail)
      setLanguage(detail.language !== 'unknown' ? detail.language : 'en')

      const items = await getLibrary()
      const found = items.find(i => i.filename === filename)
      if (found) docCtx.setLibraryId(found.id)

      toast.success(`Restored: ${filename}`)
    } catch {
      toast.error('Could not restore document. It may have been removed.')
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      const res = await uploadDocument(file)
      const detail = await getDocument(file.name)
      docCtx.setDocument(res, detail)
      setLanguage(res.language !== 'unknown' ? res.language : 'en')
      setSearchParams({ file: file.name }, { replace: true })

      saveToLibrary({
        type: 'document',
        title: file.name,
        preview: res.content_preview,
        progress: 0,
        filename: file.name,
        metadata: { total_pages: res.pages, language: res.language },
      }).then(() => {
        getLibrary().then(items => {
          const found = items.find(i => i.filename === file.name)
          if (found) docCtx.setLibraryId(found.id)
        })
      })

      toast.success(`Loaded: ${file.name} (${res.pages} page${res.pages > 1 ? 's' : ''})`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const handleReadAloud = async () => {
    const textToRead = docCtx.pageContents.length > 0
      ? docCtx.pageContents[docCtx.currentPage - 1] || docCtx.content
      : docCtx.content
    if (!textToRead?.trim()) {
      toast.error('No content to read')
      return
    }
    setTtsLoading(true)
    try {
      const res = await textToSpeech({ text: textToRead.slice(0, 5000), language, voice, speed: Number(speed) })
      audio.playBase64(res.audio_base64, res.sample_rate)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate speech')
    } finally {
      setTtsLoading(false)
    }
  }

  const changePage = (delta: number) => {
    const newPage = docCtx.currentPage + delta
    if (newPage < 1 || newPage > docCtx.pageContents.length) return
    docCtx.setCurrentPage(newPage)
    setCurrentWordIndex(-1)
    audio.stopPlayback()
    updateProgress(newPage)
  }

  const goToPage = (p: number) => {
    if (p < 1 || p > docCtx.pageContents.length) return
    docCtx.setCurrentPage(p)
    setCurrentWordIndex(-1)
    audio.stopPlayback()
    updateProgress(p)
  }

  const updateProgress = (page: number) => {
    if (docCtx.libraryId && docCtx.pageContents.length > 0) {
      updateLibraryProgress(docCtx.libraryId!, page / docCtx.pageContents.length)
    }
  }

  const handleToggleBookmark = () => {
    docCtx.toggleBookmark(docCtx.currentPage, docCtx.content)
    const isBookmarked = docCtx.bookmarks.some(b => b.page === docCtx.currentPage)
    toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmark added')
  }

  const handleAddNote = () => {
    docCtx.addNote(docCtx.currentPage, newNote)
    if (newNote.trim()) {
      setNewNote('')
      toast.success('Note added')
    }
  }

  const handleDeleteNote = (id: string) => {
    docCtx.deleteNote(id)
  }

  // Speed reading mode
  useEffect(() => {
    if (readMode !== 'speed') {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current)
      setSpeedWord('')
      return
    }

    const words = (docCtx.pageContents[docCtx.currentPage - 1] || docCtx.content).split(/\s+/)
    let idx = 0
    const msPerWord = 60000 / speedWpm

    const tick = () => {
      if (idx >= words.length) {
        clearInterval(speedTimerRef.current)
        setReadMode('normal')
        setSpeedWord('')
        return
      }
      setSpeedWord(words[idx])
      idx++
    }

    tick()
    speedTimerRef.current = window.setInterval(tick, msPerWord)

    return () => {
      if (speedTimerRef.current) clearInterval(speedTimerRef.current)
    }
  }, [readMode, speedWpm, docCtx.currentPage, docCtx.pageContents, docCtx.content])

  const pageNav = docCtx.pageContents.length > 1 && (
    <div className="flex items-center justify-between py-3">
      <button
        onClick={() => changePage(-1)}
        disabled={docCtx.currentPage <= 1}
        className="btn-secondary text-sm disabled:opacity-30"
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Page {docCtx.currentPage} of {docCtx.pageContents.length}
      </span>
      <button
        onClick={() => changePage(1)}
        disabled={docCtx.currentPage >= docCtx.pageContents.length}
        className="btn-secondary text-sm disabled:opacity-30"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  )

  if (!docCtx.doc && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-100 dark:bg-purple-900/20 p-3">
            <Book size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Document Reader</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Upload docs &mdash; listen, take notes, study smarter
            </p>
          </div>
        </div>

        <FileUploader onFileSelect={handleFile} label="Upload a document to read aloud" />

        <div className="card">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Supported Formats</h3>
          <div className="flex flex-wrap gap-1.5">
            {['PDF', 'DOCX', 'TXT', 'PPTX', 'XLSX', 'EPUB', 'MD', 'RTF', 'HTML', 'ODT', 'CSV', 'PNG (OCR)', 'JPG (OCR)'].map(f => (
              <span key={f} className="badge bg-gray-100 dark:bg-gray-800" style={{ color: 'var(--text-secondary)' }}>{f}</span>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Documents are processed locally. Uploaded files persist on the server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="card flex items-center justify-center gap-2 py-8" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 size={24} className="animate-spin" />
          Loading document...
        </div>
      )}

      {docCtx.doc && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={20} className="text-purple-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {docCtx.doc.filename}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {docCtx.doc.total_characters.toLocaleString()} chars &middot; {docCtx.doc.pages} page{docCtx.doc.pages > 1 ? 's' : ''} &middot; {docCtx.doc.language}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {docCtx.doc.formats_detected.map(f => (
              <span key={f} className="badge bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs">{f}</span>
            ))}
            <button
              onClick={() => { docCtx.clearDocument(); setSearchParams({}, { replace: true }) }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <LanguageSelector value={language} onChange={setLanguage} />
        <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="input w-20 text-sm">
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => <option key={s} value={s}>{s}x</option>)}
        </select>
        <button onClick={handleReadAloud} disabled={ttsLoading} className="btn-primary text-sm">
          {ttsLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
          Read Aloud
        </button>
        <button onClick={handleToggleBookmark} className="btn-secondary px-3" title="Toggle bookmark">
          {docCtx.bookmarks.some(b => b.page === docCtx.currentPage) ? <BookmarkPlus size={16} /> : <Bookmark size={16} />}
        </button>
        <button onClick={() => setShowChapters(!showChapters)} className={`btn-secondary px-3 ${showChapters ? 'ring-2 ring-primary-500' : ''}`} title="Chapters">
          <Sidebar size={16} />
        </button>
        <button onClick={() => setShowNotes(!showNotes)} className={`btn-secondary px-3 ${showNotes ? 'ring-2 ring-primary-500' : ''}`} title="Notes">
          <PenLine size={16} />
        </button>
        <button
          onClick={() => setReadMode(readMode === 'speed' ? 'normal' : 'speed')}
          className={`btn-secondary px-3 ${readMode === 'speed' ? 'ring-2 ring-primary-500' : ''}`}
          title="Speed read"
        >
          <Gauge size={16} />
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <Type size={14} style={{ color: 'var(--text-muted)' }} />
          <input type="range" min={12} max={28} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-16" />
        </div>
      </div>

      {/* Reading progress */}
      {docCtx.pageContents.length > 1 && (
        <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${(docCtx.currentPage / docCtx.pageContents.length) * 100}%` }} />
        </div>
      )}

      <div className="flex gap-4">
        {/* Chapters sidebar */}
        {showChapters && docCtx.chapters.length > 0 && (
          <div className="w-48 shrink-0 space-y-1">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Chapters</p>
            {docCtx.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => goToPage(ch.page)}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                  docCtx.currentPage === ch.page
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={{ color: docCtx.currentPage === ch.page ? undefined : 'var(--text-secondary)' }}
              >
                {ch.title}
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Speed reading overlay */}
          {readMode === 'speed' ? (
            <div className="card flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{speedWord}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{speedWpm} WPM</span>
                  <input type="range" min={100} max={900} step={50} value={speedWpm} onChange={e => setSpeedWpm(Number(e.target.value))} className="w-24" />
                  <button onClick={() => setReadMode('normal')} className="btn-secondary text-xs px-2 py-1">Stop</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineSpacing,
                  color: 'var(--text-primary)',
                }}
                className="whitespace-pre-wrap leading-relaxed select-text"
              >
                {docCtx.pageContents[docCtx.currentPage - 1] || docCtx.content || 'No text content found.'}
              </div>
            </div>
          )}
        </div>

        {/* Notes sidebar */}
        {showNotes && (
          <div className="w-56 shrink-0 space-y-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Notes</p>
            <div className="flex gap-1">
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="input text-xs flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
              />
              <button onClick={handleAddNote} className="btn-primary text-xs px-2">+</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {docCtx.notes.filter(n => n.page === docCtx.currentPage).map(n => (
                <div key={n.id} className="text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <p style={{ color: 'var(--text-primary)' }}>{n.text}</p>
                  <button onClick={() => handleDeleteNote(n.id)} className="text-red-400 hover:text-red-500 mt-1 text-[10px]">
                    <Trash2 size={12} className="inline" /> Delete
                  </button>
                </div>
              ))}
              {docCtx.notes.filter(n => n.page === docCtx.currentPage).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No notes on this page</p>
              )}
            </div>
            {docCtx.bookmarks.length > 0 && (
              <>
                <p className="text-xs font-semibold pt-2 border-t border-gray-200 dark:border-gray-700" style={{ color: 'var(--text-secondary)' }}>Bookmarks</p>
                {docCtx.bookmarks.map(b => (
                  <button
                    key={b.id}
                    onClick={() => goToPage(b.page)}
                    className="w-full text-left text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Bookmark size={10} className="inline mr-1 text-primary-500" />
                    Page {b.page}: {b.text}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {pageNav}
    </div>
  )
}
