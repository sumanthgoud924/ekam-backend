import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Library as LibraryIcon, Search, Trash2, ArrowRight, Clock, FileText,
  Volume2, Languages, BookOpen, Grid3X3, List, SortAsc, X,
} from 'lucide-react'
import { getLibrary, deleteFromLibrary, LibraryItem } from '../api/client'
import toast from 'react-hot-toast'

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadItems = async () => {
    setLoading(true)
    try {
      const items = await getLibrary()
      setItems(items)
    } catch {
      toast.error('Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteFromLibrary(id)
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Removed from library')
  }

  const handleOpen = (item: LibraryItem) => {
    if (item.type === 'document') {
      const params = item.filename ? `?file=${encodeURIComponent(item.filename)}` : ''
      navigate(`/documents${params}`)
    } else if (item.type === 'tts') {
      navigate('/tts')
    } else {
      navigate('/translate')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'document': return BookOpen
      case 'tts': return Volume2
      case 'translation': return Languages
      default: return FileText
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
      case 'tts': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      case 'translation': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }
  }

  let filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.preview.toLowerCase().includes(search.toLowerCase())
  )

  switch (sortBy) {
    case 'title':
      filtered.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'progress':
      filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0))
      break
    default:
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return (
    <div className="space-y-6">
      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search library..."
            className="input pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="input w-auto text-sm"
          >
            <option value="recent">Recent</option>
            <option value="title">Title</option>
            <option value="progress">Progress</option>
          </select>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn-secondary px-3"
            aria-label="Toggle view"
          >
            {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-4 w-3/4 mb-3" />
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl p-4 bg-gray-100 dark:bg-gray-800">
              <LibraryIcon size={40} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {search ? 'No results found' : 'Your library is empty'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {search
              ? 'Try a different search term'
              : 'Upload documents or generate speech to see them here'
            }
          </p>
          {!search && (
            <button onClick={() => navigate('/documents')} className="btn-primary">
              <BookOpen size={18} /> Upload a Document
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const Icon = getIcon(item.type)
            const color = getColor(item.type)
            return (
              <div
                key={item.id}
                onClick={() => handleOpen(item)}
                className="card cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`rounded-xl p-2.5 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <Trash2 size={14} className="text-red-400 hover:text-red-500" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {item.preview}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} className="inline mr-1" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {item.progress > 0 && (
                    <span className="text-xs font-semibold text-primary-500">
                      {Math.round(item.progress * 100)}%
                    </span>
                  )}
                </div>
                {item.progress > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full progress-bar-fill"
                      style={{ width: `${item.progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filtered.map(item => {
            const Icon = getIcon(item.type)
            const color = getColor(item.type)
            return (
              <div
                key={item.id}
                onClick={() => handleOpen(item)}
                className="card flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all duration-200 !py-3"
              >
                <div className={`rounded-xl p-2.5 ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.progress > 0 && (
                    <span className="text-xs font-semibold text-primary-500">{Math.round(item.progress * 100)}%</span>
                  )}
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
