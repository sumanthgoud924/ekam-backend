import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { DocumentResponse } from '../api/client'

interface PageDetail {
  page_number: number
  text: string
  characters: number
}

interface Chapter {
  title: string
  page: number
}

interface Bookmark {
  id: string
  page: number
  text: string
  timestamp: Date
}

interface Note {
  id: string
  page: number
  text: string
  timestamp: Date
}

interface DocumentState {
  doc: DocumentResponse | null
  content: string
  fullContent: string
  pageContents: string[]
  chapters: Chapter[]
  bookmarks: Bookmark[]
  notes: Note[]
  currentPage: number
  libraryId: string | null
}

interface DocumentContextType extends DocumentState {
  setDocument: (
    doc: DocumentResponse,
    detail: { content: string; page_details?: PageDetail[] },
    filename?: string
  ) => void
  clearDocument: () => void
  setCurrentPage: (page: number) => void
  toggleBookmark: (page: number, text: string) => void
  addNote: (page: number, text: string) => void
  deleteNote: (id: string) => void
  setLibraryId: (id: string | null) => void
}

const defaultState: DocumentState = {
  doc: null,
  content: '',
  fullContent: '',
  pageContents: [],
  chapters: [],
  bookmarks: [],
  notes: [],
  currentPage: 1,
  libraryId: null,
}

const DocCtx = createContext<DocumentContextType | null>(null)

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [doc, setDocState] = useState<DocumentResponse | null>(null)
  const [content, setContent] = useState('')
  const [fullContent, setFullContent] = useState('')
  const [pageContents, setPageContents] = useState<string[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [currentPage, setCurrentPageState] = useState(1)
  const [libraryId, setLibraryIdState] = useState<string | null>(null)

  const setDocument = useCallback((
    newDoc: DocumentResponse,
    detail: { content: string; page_details?: PageDetail[] },
    _filename?: string,
  ) => {
    setDocState(newDoc)
    const pages = detail.page_details?.length
      ? detail.page_details.map((p: PageDetail) => p.text)
      : [detail.content || '']
    setPageContents(pages)
    setFullContent(detail.content || pages.join('\n\n'))
    setContent(pages[0] || '')
    setCurrentPageState(1)

    if (pages.length > 1) {
      setChapters(pages.map((_, i) => ({
        title: `Page ${i + 1}`,
        page: i + 1,
      })))
    } else {
      setChapters([])
    }
  }, [])

  const clearDocument = useCallback(() => {
    setDocState(null)
    setContent('')
    setFullContent('')
    setPageContents([])
    setChapters([])
    setBookmarks([])
    setNotes([])
    setCurrentPageState(1)
    setLibraryIdState(null)
  }, [])

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page)
    setContent(pageContents[page - 1] || fullContent)
  }, [pageContents, fullContent])

  const toggleBookmark = useCallback((page: number, text: string) => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.page === page)
      if (existing) return prev.filter(b => b.id !== existing.id)
      const bm: Bookmark = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        page,
        text: text.slice(0, 80) + '...',
        timestamp: new Date(),
      }
      return [...prev, bm]
    })
  }, [])

  const addNote = useCallback((page: number, text: string) => {
    if (!text.trim()) return
    setNotes(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      page,
      text: text.trim(),
      timestamp: new Date(),
    }])
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
  }, [])

  const setLibraryId = useCallback((id: string | null) => {
    setLibraryIdState(id)
  }, [])

  return (
    <DocCtx.Provider value={{
      doc, content, fullContent, pageContents, chapters,
      bookmarks, notes, currentPage, libraryId,
      setDocument, clearDocument, setCurrentPage,
      toggleBookmark, addNote, deleteNote, setLibraryId,
    }}>
      {children}
    </DocCtx.Provider>
  )
}

export function useDocument() {
  const ctx = useContext(DocCtx)
  if (!ctx) throw new Error('useDocument must be inside DocumentProvider')
  return ctx
}
