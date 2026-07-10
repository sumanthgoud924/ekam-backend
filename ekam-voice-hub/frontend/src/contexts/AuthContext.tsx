import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@ekam.com'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin@2024'
const AUTH_KEY = 'ekam-auth'
const USER_KEY = 'ekam-user'
const USAGE_KEY = 'ekam-usage'
const REGISTRY_KEY = 'ekam-registry'

const FREE_LIMITS = {
  bulkWhatsApp: 10,
  tts: 20,
  stt: 10,
  translate: 30,
  pdfTools: 15,
  qrCodes: 25,
}

type UserTier = 'free' | 'pro'

export interface UserProfile {
  tier: UserTier
  email: string
  name: string
  proSince?: string
  proExpiresAt?: string
}

export interface UsageData {
  date: string
  bulkWhatsApp: number
  tts: number
  stt: number
  translate: number
  pdfTools: number
  qrCodes: number
}

export interface LicenseInfo {
  email: string
  key: string
  tier: string
  createdAt: string
  expiresAt?: string
  status: 'active' | 'revoked'
}

interface StoredUser {
  email: string
  password: string
  name: string
  createdAt: string
}

type FeatureKey = keyof typeof FREE_LIMITS

interface AuthContextType {
  isAdmin: boolean
  isAuthenticated: boolean
  user: UserProfile
  isPro: boolean
  isSignedUp: boolean
  usage: UsageData
  limits: typeof FREE_LIMITS

  registerUser: (email: string, password: string, name: string) => { success: boolean; error?: string }
  authenticateUser: (email: string, password: string) => { success: boolean; role: 'user' | 'admin' | null; error?: string }
  signOut: () => void

  trackUsage: (feature: FeatureKey, count?: number) => boolean
  getRemainingUsage: (feature: FeatureKey) => number
  getUsagePercent: (feature: FeatureKey) => number

  activatePro: (durationDays?: number) => void
  deactivatePro: () => void
  verifyAndActivatePro: (email: string, key: string, durationDays?: number) => boolean
  generateLicenseKey: (email: string) => string
  showKeyGenerator: boolean

  licenses: LicenseInfo[]
  adminGenerateLicense: (email: string, durationDays?: number) => Promise<string>
  adminRevokeLicense: (key: string) => Promise<void>
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

async function apiCall(endpoint: string, method: string, data?: any) {
  try {
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    })
    if (!res.ok) throw new Error('API Error')
    return await res.json()
  } catch (e) {
    console.warn(`Backend sync failed for ${endpoint}:`, e)
    return null
  }
}

const AuthCtx = createContext<AuthContextType | null>(null)

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function generateLicenseKey(email: string): string {
  const salt = 'ekam_secret_salt_2026'
  const str = email.trim().toLowerCase() + salt
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  const code = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  return `EKAM-${code.slice(0, 4)}-${code.slice(4, 8)}`
}

function loadLicenses(): LicenseInfo[] {
  try {
    const raw = localStorage.getItem('ekam-licenses')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveLicenses(licenses: LicenseInfo[]) {
  localStorage.setItem('ekam-licenses', JSON.stringify(licenses))
}

function loadRegistry(): StoredUser[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveRegistry(registry: StoredUser[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
}

function loadUser(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { tier: 'free', email: '', name: '' }
}

function saveUser(user: UserProfile) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as UsageData
      if (data.date !== today()) return freshUsage()
      return data
    }
  } catch {}
  return freshUsage()
}

function freshUsage(): UsageData {
  return {
    date: today(),
    bulkWhatsApp: 0, tts: 0, stt: 0,
    translate: 0, pdfTools: 0, qrCodes: 0,
  }
}

function saveUsage(usage: UsageData) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<UserProfile>(loadUser)
  const [usage, setUsage] = useState<UsageData>(loadUsage)
  const [showKeyGenerator, setShowKeyGenerator] = useState(false)
  const [licenses, setLicenses] = useState<LicenseInfo[]>(loadLicenses)

  const isPro = (() => {
    if (user.tier !== 'pro') return false
    if (user.proExpiresAt) return new Date(user.proExpiresAt) > new Date()
    return true
  })()

  const isSignedUp = !!user.email && !!user.name
  const isAuthenticated = isSignedUp || isAdmin

  useEffect(() => {
    if (localStorage.getItem(AUTH_KEY) === 'admin') {
      setIsAdmin(true)
      setShowKeyGenerator(true)
    }
  }, [])

  useEffect(() => {
    if (user.tier === 'pro' && user.proExpiresAt && new Date(user.proExpiresAt) <= new Date()) {
      const updated = { ...user, tier: 'free' as UserTier }
      setUser(updated)
      saveUser(updated)
    }
  }, [user])

  useEffect(() => {
    if (usage.date !== today()) {
      const fresh = freshUsage()
      setUsage(fresh)
      saveUsage(fresh)
    }
  }, [usage.date])

  const registerUser = useCallback((email: string, password: string, name: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail === ADMIN_EMAIL) {
      return { success: false, error: 'This email is reserved for admin access' }
    }

    const registry = loadRegistry()
    if (registry.find(u => u.email === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists' }
    }

    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' }
    }

    const newUser: StoredUser = {
      email: normalizedEmail,
      password,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    }

    saveRegistry([newUser, ...registry])
    setUser({ tier: 'free', email: normalizedEmail, name: name.trim() })
    saveUser({ tier: 'free', email: normalizedEmail, name: name.trim() })
    return { success: true }
  }, [])

  const authenticateUser = useCallback((email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      localStorage.setItem(AUTH_KEY, 'admin')
      setShowKeyGenerator(true)
      setUser({ tier: 'free', email: '', name: '' })
      localStorage.removeItem(USER_KEY)
      return { success: true, role: 'admin' as const }
    }

    const registry = loadRegistry()
    const found = registry.find(u => u.email === normalizedEmail && u.password === password)

    if (!found) {
      return { success: false, role: null, error: 'Invalid email or password' }
    }

    setUser({ tier: 'free', email: found.email, name: found.name })
    saveUser({ tier: 'free', email: found.email, name: found.name })
    return { success: true, role: 'user' as const }
  }, [])

  const signOut = useCallback(() => {
    setIsAdmin(false)
    setUser({ tier: 'free', email: '', name: '' })
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(AUTH_KEY)
    setShowKeyGenerator(false)
  }, [])

  const trackUsage = useCallback((feature: FeatureKey, count = 1): boolean => {
    if (isPro) {
      setUsage(prev => {
        const updated = { ...prev, [feature]: prev[feature] + count }
        saveUsage(updated)
        return updated
      })
      if (user.email) apiCall('/api/auth/usage/track', 'POST', { email: user.email, feature, count })
      return true
    }

    const limit = FREE_LIMITS[feature]
    if (usage[feature] + count > limit) return false

    setUsage(prev => {
      const updated = { ...prev, [feature]: prev[feature] + count }
      saveUsage(updated)
      return updated
    })
    if (user.email) apiCall('/api/auth/usage/track', 'POST', { email: user.email, feature, count })
    return true
  }, [isPro, usage, user.email])

  const getRemainingUsage = useCallback((feature: FeatureKey): number => {
    if (isPro) return Infinity
    return Math.max(0, FREE_LIMITS[feature] - usage[feature])
  }, [isPro, usage])

  const getUsagePercent = useCallback((feature: FeatureKey): number => {
    if (isPro) return 0
    return Math.min(100, (usage[feature] / FREE_LIMITS[feature]) * 100)
  }, [isPro, usage])

  const activatePro = useCallback((durationDays?: number) => {
    const updates: Partial<UserProfile> = {
      tier: 'pro',
      proSince: new Date().toISOString(),
    }
    if (durationDays) {
      const expires = new Date()
      expires.setDate(expires.getDate() + durationDays)
      updates.proExpiresAt = expires.toISOString()
    } else {
      updates.proExpiresAt = undefined
    }
    setUser(prev => {
      const updated = { ...prev, ...updates }
      saveUser(updated)
      return updated
    })
  }, [])

  const deactivatePro = useCallback(() => {
    setUser(prev => {
      const updated = { ...prev, tier: 'free' as UserTier, proSince: undefined, proExpiresAt: undefined }
      saveUser(updated)
      return updated
    })
  }, [])

  const verifyAndActivatePro = useCallback((email: string, key: string, durationDays?: number): boolean => {
    const expectedKey = generateLicenseKey(email)
    if (key.trim().toUpperCase() === expectedKey) {
      const registry = loadLicenses()
      const match = registry.find(l => l.key === key.trim().toUpperCase())
      if (match && match.status === 'revoked') return false

      const updates: Partial<UserProfile> = {
        email: email.trim().toLowerCase(),
        tier: 'pro',
        proSince: new Date().toISOString(),
      }
      if (durationDays) {
        const expires = new Date()
        expires.setDate(expires.getDate() + durationDays)
        updates.proExpiresAt = expires.toISOString()
      } else {
        updates.proExpiresAt = undefined
      }
      setUser(prev => {
        const updated = { ...prev, ...updates }
        saveUser(updated)
        return updated
      })

      if (!match) {
        const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : undefined
        const newLicense: LicenseInfo = {
          email: email.trim().toLowerCase(),
          key: expectedKey,
          tier: 'pro',
          createdAt: new Date().toISOString(),
          expiresAt,
          status: 'active',
        }
        setLicenses(prev => {
          const updated = [newLicense, ...prev]
          saveLicenses(updated)
          return updated
        })
      }
      return true
    }
    return false
  }, [])

  const adminGenerateLicense = useCallback(async (email: string, durationDays?: number): Promise<string> => {
    const key = generateLicenseKey(email)
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : undefined
    const newLicense: LicenseInfo = {
      email: email.trim().toLowerCase(),
      key,
      tier: 'pro',
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'active',
    }
    setLicenses(prev => {
      const updated = [newLicense, ...prev.filter(l => l.key !== key)]
      saveLicenses(updated)
      return updated
    })
    await apiCall('/api/auth/admin/license/generate', 'POST', { admin_password: ADMIN_PASSWORD, email, duration_days: durationDays })
    return key
  }, [])

  const adminRevokeLicense = useCallback(async (key: string) => {
    setLicenses(prev => {
      const updated = prev.map(l => l.key === key ? { ...l, status: 'revoked' as const } : l)
      saveLicenses(updated)
      return updated
    })
    await apiCall('/api/auth/admin/license/revoke', 'POST', { admin_password: ADMIN_PASSWORD, key })
    const expectedKey = generateLicenseKey(user.email)
    if (key.trim().toUpperCase() === expectedKey) {
      deactivatePro()
    }
  }, [user.email, deactivatePro])

  return (
    <AuthCtx.Provider value={{
      isAdmin,
      isAuthenticated,
      user, isPro, isSignedUp,
      usage, limits: FREE_LIMITS,

      registerUser,
      authenticateUser,
      signOut,

      trackUsage,
      getRemainingUsage,
      getUsagePercent,

      activatePro, deactivatePro, verifyAndActivatePro, generateLicenseKey,
      showKeyGenerator,

      licenses, adminGenerateLicense, adminRevokeLicense,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
