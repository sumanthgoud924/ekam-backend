import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, FileImage, FileArchive, Link, Camera, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import CameraCapture from './CameraCapture'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  accept?: Record<string, string[]>
  label?: string
  maxSize?: number
  showUrlInput?: boolean
}

const defaultAccept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt', '.md', '.rtf'],
  'text/html': ['.html', '.htm'],
  'application/epub+zip': ['.epub'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

const fileTypeConfig: Record<string, { icon: typeof FileText; color: string }> = {
  pdf: { icon: FileText, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  docx: { icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  pptx: { icon: FileText, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  xlsx: { icon: FileText, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
  txt: { icon: FileText, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
  png: { icon: FileImage, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  jpg: { icon: FileImage, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  jpeg: { icon: FileImage, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  epub: { icon: FileArchive, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
}

function getFileConfig(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return fileTypeConfig[ext] || { icon: FileText, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' }
}

export default function FileUploader({
  onFileSelect, accept, label, maxSize = 50, showUrlInput = false,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [showCamera, setShowCamera] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSize}MB`)
      return
    }
    setSelectedFile(file)
    onFileSelect(file)
  }, [onFileSelect, maxSize])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFile(acceptedFiles[0])
    }
  }, [handleFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || defaultAccept,
    maxFiles: 1,
    maxSize: maxSize * 1024 * 1024,
  })

  const handleUrlSubmit = () => {
    if (!urlValue.trim()) {
      toast.error('Please enter a URL')
      return
    }
    toast.success('URL submitted (backend will fetch content)')
    setUrlValue('')
    setShowUrl(false)
  }

  if (selectedFile) {
    const config = getFileConfig(selectedFile.name)
    const Icon = config.icon
    return (
      <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-800 p-5 animate-fadeIn" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <div className={`rounded-xl p-3 ${config.color}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {selectedFile.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 scale-[1.01]'
            : 'hover:border-primary-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
        }`}
        style={{
          borderColor: isDragActive ? '#6366f1' : 'var(--border)',
          backgroundColor: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`rounded-2xl p-4 ${isDragActive ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isDragActive ? (
              <Upload size={36} className="text-primary-500" />
            ) : (
              <FileText size={36} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <div>
            {label && <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</p>}
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isDragActive ? 'Drop file here' : 'Drag & drop or click to browse'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">PDF</span>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">DOCX</span>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">TXT</span>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">EPUB</span>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Images (OCR)</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Max {maxSize}MB per file
          </p>
        </div>
      </div>

      {/* URL Import */}
      {showUrlInput && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          {!showUrl ? (
            <button
              onClick={() => setShowUrl(true)}
              className="btn-secondary w-full"
            >
              <Link size={18} /> Import from URL
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                placeholder="https://example.com/article"
                className="input flex-1"
                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              />
              <button onClick={handleUrlSubmit} className="btn-primary shrink-0">
                Fetch
              </button>
              <button onClick={() => { setShowUrl(false); setUrlValue('') }} className="btn-secondary shrink-0">
                <X size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Camera option */}
      {showUrlInput && (
        <button onClick={() => setShowCamera(true)} className="btn-secondary w-full">
          <Camera size={18} /> Scan with Camera
        </button>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={(blob) => {
            const f = new File([blob], 'scan.jpg', { type: 'image/jpeg' })
            handleFile(f)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
