import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MessageSquare, Upload, Send, Pause, Play, X, Download,
  Users, FileText, AlertTriangle, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Trash2, Plus, Copy,
  RotateCcw, Eye, Phone, Hash, Sparkles, Crown, Star, BookOpen,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── Types ──────────────────────────────────────────────────────────
interface Recipient {
  id: string
  phone: string
  name: string
  variables: Record<string, string>
  status: 'pending' | 'sent' | 'failed' | 'skipped'
}

interface Campaign {
  id: string
  name: string
  message: string
  recipients: Recipient[]
  createdAt: string
  completedAt?: string
  status: 'draft' | 'sending' | 'paused' | 'completed' | 'cancelled'
}

interface Template {
  id: string
  title: string
  body: string
  category: 'marketing' | 'support' | 'utility'
  isPro: boolean
  vars: string[]
}

// ── Constants & Templates ──────────────────────────────────────────
const STORAGE_KEY = 'ekam-wa-campaigns'
const DEFAULT_COUNTRY = '91'  // India

const PREMIUM_TEMPLATES: Template[] = [
  {
    id: 'promo-festival',
    title: '🎉 Festival Special Offer',
    category: 'marketing',
    isPro: false,
    body: 'Hi {{name}}! 🌟 Celebrate this festive season with an exclusive {{discount}} discount on all products. Use code {{code}} at checkout: {{link}}. Valid till {{expiry}}! - Ekam Digital',
    vars: ['name', 'discount', 'code', 'link', 'expiry']
  },
  {
    id: 'welcome-new',
    title: '🤝 New Customer Welcome',
    category: 'marketing',
    isPro: true,
    body: 'Hello {{name}}! Thank you for joining {{business}}. Here is a special welcome voucher: {{code}} for {{discount}} off your first order. Browse catalog: {{catalog_link}}',
    vars: ['name', 'business', 'code', 'discount', 'catalog_link']
  },
  {
    id: 'support-appt',
    title: '📅 Appointment Confirmation',
    category: 'support',
    isPro: false,
    body: 'Hi {{name}}, your appointment at {{business}} is confirmed for {{datetime}} with {{staff}}. If you need to reschedule, please call us or click: {{link}}.',
    vars: ['name', 'business', 'datetime', 'staff', 'link']
  },
  {
    id: 'support-shipping',
    title: '📦 Order Shipped Tracker',
    category: 'support',
    isPro: true,
    body: 'Hi {{name}}! Great news: your order {{order_id}} has been shipped via {{carrier}}. Track your shipment live here: {{tracking_link}}',
    vars: ['name', 'order_id', 'carrier', 'tracking_link']
  },
  {
    id: 'utility-event',
    title: '🎟️ Event Invitation & Link',
    category: 'utility',
    isPro: false,
    body: 'Hello {{name}}! You are cordially invited to {{event_name}} on {{date}} at {{time}}. Join live via this link: {{zoom_link}}. Looking forward to seeing you!',
    vars: ['name', 'event_name', 'date', 'time', 'zoom_link']
  },
  {
    id: 'utility-payment-reminder',
    title: '💳 Invoice Payment Reminder',
    category: 'utility',
    isPro: true,
    body: 'Dear {{name}}, this is a friendly reminder that invoice {{invoice_number}} of amount {{amount}} is due on {{due_date}}. Pay securely online: {{payment_link}}. Thank you!',
    vars: ['name', 'invoice_number', 'amount', 'due_date', 'payment_link']
  }
]

// ── Helpers ────────────────────────────────────────────────────────
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizePhone(raw: string, countryCode: string): string {
  let cleaned = raw.replace(/[\s\-\(\)\+\.]/g, '')
  if (!cleaned) return ''
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '')
  // If it doesn't start with country code and is a local number (10 digits for India)
  if (cleaned.length <= 10 && countryCode) {
    cleaned = countryCode + cleaned
  }
  // Must be all digits
  if (!/^\d{7,15}$/.test(cleaned)) return ''
  return cleaned
}

function parseTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

function loadCampaigns(): Campaign[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveCampaigns(campaigns: Campaign[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns.slice(0, 50)))
}

function exportCsv(recipients: Recipient[], campaignName: string) {
  const headers = ['Phone', 'Name', 'Status']
  const rows = recipients.map(r => [r.phone, r.name, r.status])
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaignName.replace(/\s+/g, '_')}_results.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ──────────────────────────────────────────────────────
export default function BulkWhatsApp() {
  const navigate = useNavigate()
  const { isPro, trackUsage, getRemainingUsage, isSignedUp, registerUser } = useAuth()

  // Sign up states for gating
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      toast.error('Please fill all fields')
      return
    }
    if (!signUpEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    const result = registerUser(signUpEmail.trim(), signUpPassword, signUpName.trim())
    if (result.success) {
      toast.success('Profile created successfully! Welcome to Ekam Tools.')
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  // Recipients state
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [rawInput, setRawInput] = useState('')
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY)

  // Message state
  const [message, setMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')

  // Sending state
  const [isSending, setIsSending] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [delaySeconds, setDelaySeconds] = useState(5)
  const sendingRef = useRef(false)
  const pausedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'history'>('compose')
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<'all' | 'marketing' | 'support' | 'utility'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep refs in sync
  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])

  // ── Parse Recipients ─────────────────────────────────────────────
  const parseRecipients = useCallback(() => {
    if (!rawInput.trim()) return
    const lines = rawInput.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
    const newRecipients: Recipient[] = []
    const seen = new Set(recipients.map(r => r.phone))

    for (const line of lines) {
      // Supports formats: "phone" or "phone,name" or "name <phone>"
      let phone = ''
      let name = ''

      const angleMatch = line.match(/^(.+?)\s*<(\d[\d\s\-\+\(\)\.]+)>$/)
      if (angleMatch) {
        name = angleMatch[1].trim()
        phone = normalizePhone(angleMatch[2], countryCode)
      } else {
        const parts = line.split(/[,\t]/)
        phone = normalizePhone(parts[0], countryCode)
        name = parts[1]?.trim() || ''
      }

      if (phone && !seen.has(phone)) {
        seen.add(phone)
        newRecipients.push({
          id: generateId(),
          phone,
          name: name || phone,
          variables: { name: name || 'there', phone },
          status: 'pending',
        })
      }
    }

    if (newRecipients.length === 0) {
      toast.error('No valid phone numbers found')
      return
    }
    setRecipients(prev => [...prev, ...newRecipients])
    setRawInput('')
    toast.success(`Added ${newRecipients.length} recipient${newRecipients.length > 1 ? 's' : ''}`)
  }, [rawInput, countryCode, recipients])

  // ── CSV Import ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      // Detect if first line is header
      const firstLine = lines[0].toLowerCase()
      const hasHeader = firstLine.includes('phone') || firstLine.includes('name') || firstLine.includes('number')
      const dataLines = hasHeader ? lines.slice(1) : lines

      const newRecipients: Recipient[] = []
      const seen = new Set(recipients.map(r => r.phone))

      // Try to detect columns from header
      const headerCols = hasHeader ? lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase()) : []
      const phoneCol = Math.max(0, headerCols.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile')))
      const nameCol = headerCols.findIndex(h => h.includes('name'))

      for (const line of dataLines) {
        const parts = line.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''))
        const phone = normalizePhone(parts[phoneCol] || '', countryCode)
        const name = nameCol >= 0 ? parts[nameCol] || '' : parts[1] || ''

        // Build variables from all CSV columns
        const variables: Record<string, string> = { name: name || 'there', phone }
        if (hasHeader) {
          headerCols.forEach((col, idx) => {
            if (parts[idx]) variables[col] = parts[idx]
          })
        }

        if (phone && !seen.has(phone)) {
          seen.add(phone)
          newRecipients.push({
            id: generateId(),
            phone,
            name: name || phone,
            variables,
            status: 'pending',
          })
        }
      }

      if (newRecipients.length > 0) {
        setRecipients(prev => [...prev, ...newRecipients])
        toast.success(`Imported ${newRecipients.length} contacts from ${file.name}`)
      } else {
        toast.error('No valid contacts found in file')
      }
    }
    reader.readAsText(file)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Remove Recipient ─────────────────────────────────────────────
  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  const clearRecipients = () => {
    setRecipients([])
    toast.success('All recipients cleared')
  }

  // ── Send Logic (wa.me deep links) ────────────────────────────────
  const startSending = () => {
    if (recipients.length === 0) {
      toast.error('Add at least one recipient')
      return
    }
    if (!message.trim()) {
      toast.error('Write a message first')
      return
    }

    const pendingCount = recipients.filter(r => r.status === 'pending').length
    if (!isPro) {
      const remaining = getRemainingUsage('bulkWhatsApp')
      if (pendingCount > remaining) {
        toast.error(`Daily limit exceeded! You can send up to ${remaining} more messages today. Upgrade to Pro for unlimited bulk messaging.`, {
          duration: 5000
        })
        navigate('/upgrade')
        return
      }
    }

    setShowConfirm(true)
  }

  const confirmAndSend = () => {
    setShowConfirm(false)

    // Reset statuses for pending recipients
    setRecipients(prev => prev.map(r =>
      r.status === 'pending' || r.status === 'failed' ? { ...r, status: 'pending' } : r
    ))

    const startIdx = recipients.findIndex(r => r.status === 'pending')
    if (startIdx < 0) {
      toast('All messages already sent', { icon: '✅' })
      return
    }

    setCurrentIndex(startIdx)
    setIsSending(true)
    setIsPaused(false)
    sendingRef.current = true
    pausedRef.current = false
    sendNext(startIdx)
  }

  const sendNext = (idx: number) => {
    if (!sendingRef.current) return

    // Find next pending recipient from idx
    const nextIdx = recipients.findIndex((r, i) => i >= idx && r.status === 'pending')
    if (nextIdx < 0) {
      finishSending()
      return
    }

    setCurrentIndex(nextIdx)
    const recipient = recipients[nextIdx]
    const finalMessage = parseTemplate(message, recipient.variables)
    const encodedMsg = encodeURIComponent(finalMessage)
    const waUrl = `https://wa.me/${recipient.phone}?text=${encodedMsg}`

    // Open WhatsApp
    const win = window.open(waUrl, '_blank', 'noopener')

    // Track usage in Freemium limits
    trackUsage('bulkWhatsApp')

    // Mark as sent
    setRecipients(prev => prev.map((r, i) =>
      i === nextIdx ? { ...r, status: 'sent' } : r
    ))

    // If window didn't open (popup blocked), mark as failed
    if (!win) {
      setRecipients(prev => prev.map((r, i) =>
        i === nextIdx ? { ...r, status: 'failed' } : r
      ))
      toast.error(`Popup blocked for ${recipient.name}. Allow popups and retry.`)
    }

    // Schedule next
    const nextPending = recipients.findIndex((r, i) => i > nextIdx && r.status === 'pending')
    if (nextPending >= 0 && sendingRef.current) {
      const waitForResume = () => {
        if (!sendingRef.current) return
        if (pausedRef.current) {
          timerRef.current = setTimeout(waitForResume, 500)
          return
        }
        timerRef.current = setTimeout(() => sendNext(nextPending), delaySeconds * 1000)
      }
      waitForResume()
    } else {
      // No more pending — finish after a short delay
      timerRef.current = setTimeout(finishSending, 1000)
    }
  }

  const finishSending = () => {
    sendingRef.current = false
    setIsSending(false)
    setIsPaused(false)
    saveCampaignToHistory('completed')
    toast.success('Campaign completed!')
  }

  const pauseSending = () => {
    setIsPaused(true)
    pausedRef.current = true
    toast('Sending paused', { icon: '⏸️' })
  }

  const resumeSending = () => {
    setIsPaused(false)
    pausedRef.current = false
    toast('Sending resumed', { icon: '▶️' })
  }

  const cancelSending = () => {
    sendingRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsSending(false)
    setIsPaused(false)

    // Mark remaining pending as skipped
    setRecipients(prev => prev.map(r =>
      r.status === 'pending' ? { ...r, status: 'skipped' } : r
    ))
    saveCampaignToHistory('cancelled')
    toast('Campaign cancelled', { icon: '🛑' })
  }

  // ── Campaign History ─────────────────────────────────────────────
  const saveCampaignToHistory = (status: Campaign['status']) => {
    const campaign: Campaign = {
      id: generateId(),
      name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
      message,
      recipients: [...recipients],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status,
    }
    const updated = [campaign, ...campaigns].slice(0, 50)
    setCampaigns(updated)
    saveCampaigns(updated)
  }

  const deleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id)
    setCampaigns(updated)
    saveCampaigns(updated)
    toast.success('Campaign deleted')
  }

  const reloadCampaign = (campaign: Campaign) => {
    setRecipients(campaign.recipients.map(r => ({ ...r, status: 'pending' })))
    setMessage(campaign.message)
    setCampaignName(campaign.name)
    setActiveTab('compose')
    toast.success('Campaign loaded')
  }

  // ── Template Operations ──────────────────────────────────────────
  const selectTemplate = (template: Template) => {
    if (template.isPro && !isPro) {
      toast.error('This is a Premium Template. Upgrade to Pro to unlock!', {
        duration: 4000
      })
      navigate('/upgrade')
      return
    }

    setMessage(template.body)
    setCampaignName(template.title.replace(/[^a-zA-Z0-9\s]/g, '').trim())
    setActiveTab('compose')
    toast.success('Template loaded!')
  }

  // ── Stats ────────────────────────────────────────────────────────
  const stats = {
    total: recipients.length,
    sent: recipients.filter(r => r.status === 'sent').length,
    failed: recipients.filter(r => r.status === 'failed').length,
    pending: recipients.filter(r => r.status === 'pending').length,
    skipped: recipients.filter(r => r.status === 'skipped').length,
  }
  const progress = stats.total > 0 ? ((stats.sent + stats.failed + stats.skipped) / stats.total) * 100 : 0

  // Estimated time
  const estimatedMinutes = Math.ceil((stats.pending * delaySeconds) / 60)

  // Template variables detected in message
  const templateVars = [...new Set(message.match(/\{\{(\w+)\}\}/g) || [])].map(v => v.replace(/\{\{|\}\}/g, ''))

  const filteredTemplates = PREMIUM_TEMPLATES.filter(t =>
    filterCategory === 'all' || t.category === filterCategory
  )

  if (!isSignedUp) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="card space-y-6 text-center border-2 border-primary-500/20 shadow-2xl relative overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
          
          <div className="relative space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-lg">
              <MessageSquare size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Unlock Bulk WhatsApp Sending
              </h2>
              <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                To safeguard services and comply with WhatsApp usage policies, bulk messaging requires a quick, free profile registration.
              </p>
            </div>
          </div>

          <form onSubmit={handleSignUpSubmit} className="space-y-4 text-left relative z-10">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={signUpName}
                onChange={e => setSignUpName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={signUpEmail}
                onChange={e => setSignUpEmail(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="At least 4 characters"
                value={signUpPassword}
                onChange={e => setSignUpPassword(e.target.value)}
                className="input"
                required
                minLength={4}
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Sparkles size={16} /> Complete Setup & Unlock
            </button>
          </form>
          
          <div className="pt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Your details are stored strictly locally in your browser.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare size={24} className="text-green-500" /> Bulk WhatsApp
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Send personalized WhatsApp messages to multiple contacts at once.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'compose'
              ? 'text-white shadow-lg'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={activeTab === 'compose' ? { background: 'linear-gradient(135deg, #22c55e, #10b981)' } : {}}
        >
          <span className="flex items-center gap-2"><Send size={16} /> Compose</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'templates'
              ? 'text-white shadow-lg'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={activeTab === 'templates' ? { background: 'linear-gradient(135deg, #22c55e, #10b981)' } : {}}
        >
          <span className="flex items-center gap-2"><BookOpen size={16} /> Templates Store</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'text-white shadow-lg'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={activeTab === 'history' ? { background: 'linear-gradient(135deg, #22c55e, #10b981)' } : {}}
        >
          <span className="flex items-center gap-2"><Clock size={16} /> History ({campaigns.length})</span>
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="space-y-6">
          {/* ── Step 1: Recipients ────────────────────────────────────── */}
          <div className="card space-y-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={18} className="text-green-500" />
              Recipients
              {recipients.length > 0 && (
                <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                  {recipients.length} contact{recipients.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>

            {/* Country Code */}
            <div className="flex gap-3 items-end">
              <div className="w-28">
                <label className="label">Country Code</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>+</span>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value.replace(/\D/g, ''))}
                    className="input !py-2"
                    placeholder="91"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="label">Add Numbers</label>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder={"Paste phone numbers (one per line, or comma-separated)\n9876543210\n9876543211, John\nJane <9876543212>"}
                  rows={3}
                  className="input resize-none text-sm font-mono"
                  disabled={isSending}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={parseRecipients} className="btn-primary text-sm !py-2 !px-4" disabled={!rawInput.trim() || isSending}
                style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
              >
                <Plus size={16} /> Add Numbers
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm !py-2 !px-4" disabled={isSending}>
                <Upload size={16} /> Import CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
              {recipients.length > 0 && (
                <button onClick={clearRecipients} className="btn-ghost text-sm !py-2 text-red-500 hover:!text-red-600" disabled={isSending}>
                  <Trash2 size={14} /> Clear All
                </button>
              )}
            </div>

            {/* Recipients List */}
            {recipients.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                  {recipients.map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <span className="text-xs font-mono w-6 text-center" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                      {r.status === 'sent' && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                      {r.status === 'failed' && <XCircle size={14} className="text-red-500 shrink-0" />}
                      {r.status === 'pending' && <Clock size={14} className="text-gray-400 shrink-0" />}
                      {r.status === 'skipped' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                      <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name !== r.phone ? r.name : ''}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>+{r.phone}</span>
                      <button
                        onClick={() => removeRecipient(r.id)}
                        className="ml-auto p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors"
                        disabled={isSending}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Compose Message ──────────────────────────────── */}
          <div className="card space-y-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileText size={18} className="text-green-500" />
              Message
            </h2>

            <div>
              <label className="label">Campaign Name (optional)</label>
              <input
                type="text"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. July Sale Announcement"
                className="input !py-2"
                disabled={isSending}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Message Template</label>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{message.length} chars</span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={"Hi {{name}}! 👋\n\nWe have an exciting update for you...\n\nUse {{name}}, {{phone}} or any CSV column as template variables."}
                rows={6}
                className="input resize-none"
                disabled={isSending}
              />
            </div>

            {templateVars.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Variables:</span>
                {templateVars.map(v => (
                  <span key={v} className="px-2 py-0.5 rounded-full text-xs font-mono bg-green-100 dark:bg-green-900/30 text-green-600">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}

            {/* Preview */}
            {message && recipients.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Preview
                  {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showPreview && (
                  <div className="mt-3 space-y-2">
                    {recipients.slice(0, 3).map((r, i) => (
                      <div key={r.id} className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Phone size={12} className="text-green-500" />
                          <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
                            To: {r.name} (+{r.phone})
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs" style={{ color: 'var(--text-primary)' }}>
                          {parseTemplate(message, r.variables)}
                        </p>
                      </div>
                    ))}
                    {recipients.length > 3 && (
                      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                        +{recipients.length - 3} more...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 3: Send Controls ───────────────────────────────── */}
          <div className="card space-y-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Send size={18} className="text-green-500" />
              Send
            </h2>

            <div>
              <label className="label">Delay Between Messages: {delaySeconds}s</label>
              <input
                type="range"
                min={3}
                max={15}
                step={1}
                value={delaySeconds}
                onChange={e => setDelaySeconds(Number(e.target.value))}
                className="w-full accent-green-500"
                disabled={isSending}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>3s (faster)</span>
                <span>15s (safer)</span>
              </div>
            </div>

            {/* Safety Warning */}
            {recipients.length > 50 && (
              <div className="flex items-start gap-2 rounded-xl p-3 text-sm bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Large batch detected ({recipients.length} contacts)</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Use a higher delay (8-15s) to reduce the risk of WhatsApp rate-limiting. Consider splitting into smaller batches.
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {(isSending || stats.sent > 0 || stats.failed > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{Math.round(progress)}% Complete</span>
                  <span>{stats.sent} sent · {stats.failed} failed · {stats.pending} pending</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: stats.failed > 0
                        ? 'linear-gradient(90deg, #22c55e, #f59e0b)'
                        : 'linear-gradient(90deg, #22c55e, #10b981)',
                    }}
                  />
                </div>
                {isSending && stats.pending > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} className="inline mr-1" />
                    Estimated time remaining: ~{estimatedMinutes} min
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {!isSending ? (
                <>
                  <button
                    onClick={startSending}
                    className="btn-primary text-sm flex-1 sm:flex-none"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
                    disabled={recipients.length === 0 || !message.trim()}
                  >
                    <Send size={16} /> Start Sending ({recipients.filter(r => r.status === 'pending').length})
                  </button>
                  {(stats.sent > 0 || stats.failed > 0) && (
                    <>
                      <button
                        onClick={() => setRecipients(prev => prev.map(r => ({ ...r, status: 'pending' })))}
                        className="btn-secondary text-sm"
                      >
                        <RotateCcw size={14} /> Reset All
                      </button>
                      <button
                        onClick={() => exportCsv(recipients, campaignName || 'campaign')}
                        className="btn-secondary text-sm"
                      >
                        <Download size={14} /> Export CSV
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {isPaused ? (
                    <button onClick={resumeSending} className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}>
                      <Play size={16} /> Resume
                    </button>
                  ) : (
                    <button onClick={pauseSending} className="btn-secondary text-sm">
                      <Pause size={16} /> Pause
                    </button>
                  )}
                  <button onClick={cancelSending} className="btn-ghost text-sm text-red-500 hover:!text-red-600">
                    <X size={16} /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Templates Store Tab ───────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            {(['all', 'marketing', 'support', 'utility'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  filterCategory === cat
                    ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="card relative flex flex-col justify-between">
                {template.isPro && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                    <Crown size={10} className="fill-amber-500" /> Premium
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm pr-16 mb-2" style={{ color: 'var(--text-primary)' }}>{template.title}</h3>
                  <span className="inline-block text-[10px] uppercase font-semibold text-gray-400 mb-3">
                    {template.category}
                  </span>
                  <p className="text-xs line-clamp-3 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {template.body}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t pt-3 mt-auto" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex gap-1 flex-wrap">
                    {template.vars.map(v => (
                      <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {v}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => selectTemplate(template)}
                    className="btn-primary text-xs !py-1.5 !px-3 font-bold"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 5: Campaign History Tab ─────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="card text-center py-12">
              <Clock size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No campaigns yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Your sent campaigns will appear here.
              </p>
            </div>
          ) : (
            campaigns.map(campaign => {
              const cSent = campaign.recipients.filter(r => r.status === 'sent').length
              const cFailed = campaign.recipients.filter(r => r.status === 'failed').length
              const cTotal = campaign.recipients.length
              const isExpanded = expandedCampaign === campaign.id

              return (
                <div key={campaign.id} className="card">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                  >
                    <div className={`rounded-xl p-2.5 shrink-0 ${
                      campaign.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
                      campaign.status === 'cancelled' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {campaign.status === 'completed' ? <CheckCircle2 size={18} /> :
                       campaign.status === 'cancelled' ? <AlertTriangle size={18} /> :
                       <Clock size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{campaign.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(campaign.createdAt).toLocaleDateString()} · {cTotal} contacts · {cSent} sent
                        {cFailed > 0 && ` · ${cFailed} failed`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 animate-fadeIn">
                      <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <p className="font-medium text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Message:</p>
                        <p className="whitespace-pre-wrap text-xs" style={{ color: 'var(--text-primary)' }}>{campaign.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reloadCampaign(campaign)}
                          className="btn-secondary text-xs !py-1.5"
                        >
                          <RotateCcw size={12} /> Reuse
                        </button>
                        <button
                          onClick={() => exportCsv(campaign.recipients, campaign.name)}
                          className="btn-secondary text-xs !py-1.5"
                        >
                          <Download size={12} /> Export
                        </button>
                        <button
                          onClick={() => {
                            const text = campaign.recipients.map(r => `+${r.phone}`).join('\n')
                            navigator.clipboard.writeText(text)
                            toast.success('Numbers copied')
                          }}
                          className="btn-secondary text-xs !py-1.5"
                        >
                          <Copy size={12} /> Copy Numbers
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="btn-ghost text-xs !py-1.5 text-red-500 ml-auto"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Confirmation Modal ──────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-fadeInUp" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl p-2.5 bg-green-100 dark:bg-green-900/20">
                <Send size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Ready to Send?</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Please confirm the details below</p>
              </div>
            </div>

            <div className="space-y-2 mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between">
                <span>Recipients</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Delay per message</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{delaySeconds}s</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated time</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>~{estimatedMinutes} min</span>
              </div>
            </div>

            {stats.pending > 100 && (
              <div className="flex items-start gap-2 rounded-xl p-3 text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 mb-4">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Large batch. Use a higher delay and ensure contacts have opted in.</span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button onClick={confirmAndSend} className="btn-primary flex-1 text-sm" style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}>
                <Send size={16} /> Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
