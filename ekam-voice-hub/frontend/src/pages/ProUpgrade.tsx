import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Crown, Check, Zap, MessageSquare, Volume2, Mic, Languages,
  FileText, QrCode, Infinity, Shield, Star, ArrowLeft, Sparkles, X, Key, Copy,
} from 'lucide-react'
import { useAuth, generateLicenseKey } from '../contexts/AuthContext'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Great for personal use',
    gradient: 'from-gray-500 to-gray-600',
    features: [
      '10 Bulk WhatsApp messages/day',
      '20 Text-to-Speech/day',
      '10 Speech-to-Text/day',
      '30 Translations/day',
      '15 PDF operations/day',
      '25 QR codes/day',
      'All tools included',
      'Community support',
    ],
    limits: true,
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '₹199',
    period: '/month',
    desc: 'For professionals & small businesses',
    gradient: 'from-teal-500 to-indigo-600',
    popular: true,
    features: [
      'Unlimited Bulk WhatsApp',
      'Unlimited Text-to-Speech',
      'Unlimited Speech-to-Text',
      'Unlimited Translations',
      'Unlimited PDF tools',
      'Unlimited QR codes',
      '50+ Premium templates',
      'Priority support',
      'Campaign analytics',
      'No ads',
    ],
    limits: false,
    durationDays: 30,
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '₹999',
    period: '/year',
    desc: 'Save 58% — best value',
    gradient: 'from-amber-500 to-orange-600',
    features: [
      'Everything in Pro Monthly',
      'Save ₹1,389/year',
      'Priority feature requests',
      'Export all data',
      'Custom WhatsApp templates',
      'Advanced analytics',
    ],
    limits: false,
    durationDays: 365,
  },
]

const testimonials = [
  { name: 'Rahul S.', role: 'Digital Marketer', text: 'Bulk WhatsApp feature alone saves me hours every week. Worth every rupee!' },
  { name: 'Priya M.', role: 'Content Creator', text: 'The TTS voices sound so natural. My audience thinks I hired a voiceover artist.' },
  { name: 'Amit K.', role: 'Small Business Owner', text: 'I use Ekam for order confirmations and customer follow-ups. Game changer.' },
]

export default function ProUpgrade() {
  const { isPro, user, verifyAndActivatePro, showKeyGenerator } = useAuth()
  const navigate = useNavigate()
  const [testEmail, setTestEmail] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  
  // Modal & Activation States
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null)
  const [email, setEmail] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTestEmail('')
    setGeneratedKey('')
  }, [showKeyGenerator])

  const handleGenerateKey = () => {
    if (!testEmail.trim()) {
      toast.error('Enter an email to generate a key')
      return
    }
    const key = generateLicenseKey(testEmail)
    setGeneratedKey(key)
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
    toast.success('License key copied to clipboard!')
  }

  const handleOpenActivation = (plan: typeof plans[0]) => {
    setSelectedPlan(plan)
    setShowModal(true)
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !licenseKey.trim()) {
      toast.error('Please enter your email and activation key')
      return
    }

    setLoading(true)
    // Add a tiny delay for realistic feeling
    await new Promise(r => setTimeout(r, 1000))

    const success = verifyAndActivatePro(email, licenseKey, selectedPlan?.durationDays)
    setLoading(false)

    if (success) {
      toast.success('🎉 Ekam Pro activated successfully! All limits removed.')
      setShowModal(false)
      navigate('/')
    } else {
      toast.error('Invalid key or email. Please check and try again.')
    }
  }

  if (isPro) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="card text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Crown size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">You're on Ekam Pro!</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            All features are unlocked with no daily limits.
          </p>
          {(user.proExpiresAt || user.email) && (
            <div className="mt-3 space-y-1">
              {user.email && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Registered Email: {user.email}</p>
              )}
              {user.proExpiresAt && (
                <p className="text-xs px-4 py-2 rounded-full inline-block" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  Renews on {new Date(user.proExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          <div className="mt-6">
            <button onClick={() => navigate('/')} className="btn-primary">
              <Sparkles size={16} /> Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', color: '#6366f1' }}>
          <Crown size={14} /> Upgrade to Pro
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Unlock the Full Power of <span className="gradient-text">Ekam</span>
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Remove all daily limits, access premium templates, and supercharge your productivity.
        </p>
      </div>

      {/* Plans */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`card relative flex flex-col justify-between ${plan.popular ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Star size={10} className="inline mr-1" /> Most Popular
              </div>
            )}

            <div>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-4`}>
                {plan.id === 'free' ? <Zap size={22} className="text-white" /> : <Crown size={22} className="text-white" />}
              </div>

              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{plan.desc}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{plan.price}</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={16} className={plan.id === 'free' ? 'text-gray-400 shrink-0 mt-0.5' : 'text-green-500 shrink-0 mt-0.5'} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {plan.id === 'free' ? (
              <button className="btn-secondary w-full text-sm" disabled>
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleOpenActivation(plan)}
                className="btn-primary w-full text-sm mt-auto"
                style={plan.popular ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
              >
                <Crown size={16} /> Upgrade Now
              </button>
            )}
          </div>
        ))}
      </div>

      {/* License Key Generator (admin only) */}
      {showKeyGenerator && (
        <div className="card border-2 border-dashed" style={{ borderColor: '#6366f1' }}>
          <div className="flex items-center gap-2 mb-4">
            <Key size={20} className="text-primary-500" />
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>License Key Generator</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-semibold">Admin</span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Enter a customer email to generate an activation key. The key is automatically copied.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="customer@example.com"
              className="input flex-1"
            />
            <button onClick={handleGenerateKey} className="btn-primary">
              <Key size={16} /> Generate
            </button>
          </div>
          {generatedKey && (
            <div className="mt-3 rounded-xl p-3 text-sm font-mono bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/30 flex items-center justify-between">
              <span className="text-indigo-700 dark:text-indigo-400 font-bold">{generatedKey}</span>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Copy size={12} /> {copiedKey === generatedKey ? 'Copied!' : 'Copied to clipboard'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Feature comparison */}
      <div className="card overflow-x-auto">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Feature Comparison</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-left py-3 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Feature</th>
              <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Free</th>
              <th className="text-center py-3 pl-4 font-medium gradient-text">Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              { feature: 'Bulk WhatsApp', free: '10/day', pro: 'Unlimited' },
              { feature: 'Text to Speech', free: '20/day', pro: 'Unlimited' },
              { feature: 'Speech to Text', free: '10/day', pro: 'Unlimited' },
              { feature: 'Translation', free: '30/day', pro: 'Unlimited' },
              { feature: 'PDF Tools', free: '15/day', pro: 'Unlimited' },
              { feature: 'QR Generator', free: '25/day', pro: 'Unlimited' },
              { feature: 'Premium Templates', free: '—', pro: '50+' },
              { feature: 'Campaign Analytics', free: '—', pro: '✓' },
              { feature: 'Priority Support', free: '—', pro: '✓' },
              { feature: 'Ad-Free', free: '—', pro: '✓' },
            ].map(row => (
              <tr key={row.feature} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="py-3 pr-4" style={{ color: 'var(--text-primary)' }}>{row.feature}</td>
                <td className="py-3 px-4 text-center" style={{ color: 'var(--text-muted)' }}>{row.free}</td>
                <td className="py-3 pl-4 text-center font-medium text-green-600 dark:text-green-400">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Testimonials */}
      <div>
        <h2 className="font-bold text-lg mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
          Loved by Professionals
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.name} className="card">
              <div className="flex gap-1 mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-sm mb-3 italic" style={{ color: 'var(--text-secondary)' }}>"{t.text}"</p>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>FAQ</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes! Your Pro access continues until the end of your billing period. No questions asked.' },
            { q: 'Is my data safe?', a: 'Absolutely. All processing happens locally on your device. We don\'t store your messages, documents, or audio on any server.' },
            { q: 'What payment methods do you accept?', a: 'We accept UPI payments. Send proof to support to receive your key.' },
            { q: 'Does it work offline?', a: 'Yes! Install Ekam as a PWA and core features work offline. WhatsApp messaging requires internet.' },
          ].map(faq => (
            <div key={faq.q}>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{faq.q}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activation & Payment Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-fadeInUp" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Crown size={20} className="text-amber-500" /> Activate {selectedPlan.name}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEmail(''); setLicenseKey('') }}
                className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment instructions */}
            <div className="rounded-xl p-4 mb-4 text-sm bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/30">
              <p className="font-semibold mb-1">💳 Payment Instructions:</p>
              <p className="text-xs leading-normal">
                1. Transfer <strong>{selectedPlan.price}</strong> to UPI ID: <strong className="font-mono text-xs select-all bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-indigo-200">ekam@upi</strong><br />
                2. Click the button below to send payment screenshot and request your license key on WhatsApp.
              </p>
              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent(
                  `Hi Support! I have transferred ${selectedPlan.price} for Ekam ${selectedPlan.name}. Please send my activation code. Email: ${email || '[Enter Email Above]'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full text-xs mt-3 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}
              >
                <MessageSquare size={14} /> Request Key on WhatsApp
              </a>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="label">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Activation License Key</label>
                <div className="relative">
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    placeholder="EKAM-XXXX-XXXX"
                    className="input pr-10 font-mono"
                    required
                  />
                  <Key size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
                {showKeyGenerator && (
                  <p className="text-xs mt-1 text-teal-500">
                    💡 Use the License Key Generator above to create a test key for this email.
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEmail(''); setLicenseKey('') }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 text-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {loading ? 'Verifying...' : 'Activate Pro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
