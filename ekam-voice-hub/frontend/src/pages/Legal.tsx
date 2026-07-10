import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react'

export default function Legal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy')

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Scale size={24} className="text-primary-500" /> Legal Information
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Read our Privacy Policy and Terms of Service for ekam.digital.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'privacy'
              ? 'text-white shadow-lg btn-primary'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={activeTab === 'privacy' ? { background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' } : {}}
        >
          <span className="flex items-center gap-2"><Shield size={16} /> Privacy Policy</span>
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'terms'
              ? 'text-white shadow-lg btn-primary'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={activeTab === 'terms' ? { background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))' } : {}}
        >
          <span className="flex items-center gap-2"><FileText size={16} /> Terms of Service</span>
        </button>
      </div>

      <div className="card prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4" style={{ color: 'var(--text-secondary)' }}>
        {activeTab === 'privacy' ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last updated: July 1, 2026</p>
            
            <p>
              At ekam.digital, we prioritize your privacy. This Privacy Policy describes how your information is collected, used, and safeguarded when you use our multi-purpose tool hub.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>1. Local-First Processing (Zero Data Collection)</h3>
            <p>
              We believe your data belongs to you. Most features on ekam.digital—including Bulk WhatsApp composing, campaign configurations, contacts files parsing, QR code generations, and PDF tool edits—run entirely inside your local browser.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>No contact phone numbers are sent to our servers.</li>
              <li>No message templates or variables files are uploaded.</li>
              <li>Everything is processed client-side.</li>
            </ul>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>2. AI Voice & Translation Features</h3>
            <p>
              When using Speech-to-Text (STT), Text-to-Speech (TTS), or Audio translation features, the audio blobs and text inputs are securely transmitted to our backend API solely to perform the requested conversion. We do not store, retain, or train AI models on your files or transcriptions.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>3. Storage of Data</h3>
            <p>
              Ekam uses your browser's <code className="px-1 rounded bg-gray-100 dark:bg-gray-800">localStorage</code> to save your settings, theme choices, and WhatsApp campaigns history. You can clear this data at any time from the settings tab.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>4. Security</h3>
            <p>
              We implement industry-standard security measures. However, since the app is a Progressive Web App (PWA), please ensure your device is secure from unauthorized access.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Terms of Service</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last updated: July 1, 2026</p>

            <p>
              By accessing or using ekam.digital, you agree to comply with and be bound by these Terms of Service.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>1. Acceptable Use Policy</h3>
            <p>
              You agree to use ekam.digital solely for lawful purposes. You are strictly prohibited from using our Bulk WhatsApp messaging tool to send unsolicited messages (spam), phishing attempts, harassment, or any message violating WhatsApp's official Terms of Service.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>2. WhatsApp Account Risk Disclaimer</h3>
            <p>
              ekam.digital operates using standard web integration protocols (wa.me API links) to pre-fill and launch WhatsApp messages. The actual sending of the message is done directly by you inside the WhatsApp client. We are not responsible for any temporary or permanent bans or restrictions applied to your WhatsApp account due to sending frequency or spam reports from recipients.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>3. Upgrade Billing & Refunds</h3>
            <p>
              Ekam Pro subscriptions are billed monthly or annually. Transactions are final, and we offer refunds solely in the event of documented technical failure preventing access to the Pro tier.
            </p>

            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>4. Limitation of Liability</h3>
            <p>
              ekam.digital is provided "as is" without warranties of any kind. Under no circumstances shall we be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this platform.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
