import { Link } from 'react-router-dom'
import {
  ImageDown, FileImage, FileSpreadsheet, FileUp, Scissors, RotateCw,
  ArrowRight, Wrench, QrCode, Camera, MessageSquare, FileText,
  Image, Type, ArrowLeftRight, Download, FileSearch, Network,
} from 'lucide-react'

const toolCategories = [
  {
    title: 'Messaging',
    tools: [
      { to: '/tools/bulk-whatsapp', icon: MessageSquare, label: 'Bulk WhatsApp', desc: 'Send personalized messages to multiple contacts', gradient: 'from-green-500 to-emerald-500' },
    ],
  },
  {
    title: 'Scan & Convert',
    tools: [
      { to: '/tools/jpeg-to-word', icon: FileSpreadsheet, label: 'JPEG to Word', desc: 'OCR text extraction to Word document', gradient: 'from-blue-500 to-cyan-500', badge: 'Camera' },
      { to: '/tools/jpeg-to-pdf', icon: FileImage, label: 'JPEG to PDF', desc: 'Convert images or scans to PDF', gradient: 'from-green-500 to-emerald-500', badge: 'Camera' },
      { to: '/tools/jpeg-png-converter', icon: Image, label: 'JPEG/PNG Converter', desc: 'Convert between JPEG, PNG, WebP, BMP — resize too', gradient: 'from-pink-500 to-rose-500' },
      { to: '/tools/image-resizer', icon: Image, label: 'Image Resizer', desc: 'Resize JPEG and PNG images to exact dimensions', gradient: 'from-amber-500 to-orange-500' },
      { to: '/tools/pdf-to-text', icon: FileSearch, label: 'PDF to Text', desc: 'Extract text content from PDF files', gradient: 'from-cyan-500 to-teal-500' },
      { to: '/tools/text-to-pdf', icon: FileText, label: 'Text to PDF', desc: 'Write text and generate a PDF document', gradient: 'from-amber-500 to-orange-500' },
      { to: '/tools/qr-generator', icon: QrCode, label: 'QR Generator', desc: 'Create QR codes from URLs and text', gradient: 'from-violet-500 to-purple-500' },
    ],
  },
  {
    title: 'PDF Tools',
    tools: [
      { to: '/tools/pdf-merge', icon: FileUp, label: 'Merge PDF', desc: 'Combine multiple PDFs into one', gradient: 'from-purple-500 to-pink-500' },
      { to: '/tools/pdf-split', icon: Scissors, label: 'Split PDF', desc: 'Extract pages by range', gradient: 'from-orange-500 to-red-500' },
      { to: '/tools/pdf-compress', icon: ImageDown, label: 'Compress PDF', desc: 'Reduce file size with quality control', gradient: 'from-teal-500 to-cyan-500' },
      { to: '/tools/pdf-rotate', icon: RotateCw, label: 'Rotate PDF', desc: 'Rotate pages by any angle', gradient: 'from-teal-500 to-indigo-500' },
    ],
  },

  {
    title: 'Utilities',
    tools: [
      { to: '/tools/text-tools', icon: Type, label: 'Text Tools', desc: 'Word count, case converter, find & replace', gradient: 'from-sky-500 to-blue-500' },
      { to: '/tools/unit-converter', icon: ArrowLeftRight, label: 'Unit Converter', desc: 'Length, weight, temperature, and more', gradient: 'from-emerald-500 to-green-500' },
      { to: '/tools/password-generator', icon: QrCode, label: 'Password Generator', desc: 'Secure, customizable password generator', gradient: 'from-indigo-500 to-purple-500' },
      { to: '/tools/color-picker', icon: Image, label: 'Color Picker', desc: 'Extract and pick colors from images', gradient: 'from-pink-500 to-rose-500' },
    ],
  },
]

export default function ToolsLanding() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Wrench size={24} className="text-primary-500" /> Tools
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          All-in-one toolkit for documents, images, text, and conversions — free and private.
        </p>
      </div>

      {toolCategories.map((cat) => {
        const colors = ['from-primary-500/10 to-purple-500/10', 'from-blue-500/10 to-cyan-500/10', 'from-amber-500/10 to-orange-500/10', 'from-green-500/10 to-emerald-500/10']
        const randomColor = colors[toolCategories.indexOf(cat) % colors.length]
        return (
          <div key={cat.title}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-5 rounded-full bg-primary-500 inline-block" />
              {cat.title}
              <span className="text-xs font-normal ml-auto" style={{ color: 'var(--text-muted)' }}>
                {cat.tools.length} tool{cat.tools.length > 1 ? 's' : ''}
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.tools.map(({ to, icon: Icon, label, desc, gradient, badge }) => (
                <Link
                  key={to}
                  to={to}
                  className="card group hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${randomColor}`} />
                  <div className="relative flex items-start gap-4">
                    <div className={`rounded-2xl p-3.5 bg-gradient-to-br ${gradient} shadow-lg shrink-0 relative`}>
                      <Icon size={22} className="text-white" />
                      {badge && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
                          <Camera size={8} />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
                        {label}
                      </h3>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors mt-1 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
