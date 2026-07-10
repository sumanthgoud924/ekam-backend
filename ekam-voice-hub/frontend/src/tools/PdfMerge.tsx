import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Upload, FileUp, Loader2, Download, X, Plus } from 'lucide-react'
import { api } from '../api/client'

export default function PdfMerge() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (dropped.length) setFiles(prev => [...prev, ...dropped])
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf')
    if (selected.length) setFiles(prev => [...prev, ...selected])
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const moveUp = (i: number) => {
    if (i === 0) return
    setFiles(prev => {
      const arr = [...prev];
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
      return arr
    })
  }

  const moveDown = (i: number) => {
    if (i === files.length - 1) return
    setFiles(prev => {
      const arr = [...prev];
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
      return arr
    })
  }

  const merge = async () => {
    if (files.length < 2) {
      toast.error('Need at least 2 PDF files')
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      const res = await api.post('/tools/pdf/merge', form, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDFs merged successfully')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Merge failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <FileUp size={24} className="text-primary-500" /> Merge PDF
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Combine multiple PDF files into a single document. Drag to reorder.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="card border-2 border-dashed text-center py-12 transition-colors hover:border-primary-400"
        style={{ borderColor: 'var(--border)' }}
      >
        {files.length > 0 ? (
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2 px-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="w-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="flex-1 truncate text-left">{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(f.size / 1024)}KB</span>
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30">&#9650;</button>
                  <button onClick={() => moveDown(i)} disabled={i === files.length - 1} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30">&#9660;</button>
                  <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <label className="btn-secondary text-sm cursor-pointer">
                <Plus size={16} /> Add PDF
                <input type="file" accept=".pdf" multiple onChange={handleFile} className="hidden" />
              </label>
              <button onClick={merge} disabled={loading || files.length < 2} className="btn-primary">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Merging...</> : <><Download size={18} /> Merge & Download</>}
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer space-y-3">
            <Upload size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Drop PDFs here or click to upload</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Select multiple PDF files to merge</p>
            </div>
            <input type="file" accept=".pdf" multiple onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}