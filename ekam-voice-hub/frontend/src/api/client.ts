import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

export interface TTSRequest {
  text: string
  language?: string
  voice?: string
  speed?: number
  provider?: string
  voice_description?: string
}

export interface TTSResponse {
  audio_base64: string
  sample_rate: number
  duration_seconds: number
  format: string
  text_preview: string
  language: string
  voice_used: string
}

export interface STTResponse {
  text: string
  confidence: number
  language: string
  segments: { start: number; end: number; text: string }[]
}

export interface DocumentResponse {
  filename: string
  pages: number
  content_preview: string
  total_characters: number
  language: string
  formats_detected: string[]
}

export interface DocumentDetail extends DocumentResponse {
  content: string
  page_details?: { page_number: number; text: string; characters: number }[]
}

export interface TranslateResponse {
  translated_text: string
  source_lang: string
  target_lang: string
  confidence: number
}

export interface LanguageMap {
  [code: string]: string
}

export interface LibraryItem {
  id: string
  type: 'document' | 'tts' | 'translation'
  title: string
  preview: string
  createdAt: string
  progress: number
  filename?: string
  metadata?: Record<string, unknown>
}

export interface VoiceInfo {
  name: string
  locale: string
  gender: string
  description: string
}

export interface AudioTranslateResponse {
  transcription: string
  translated_text: string
  source_lang: string
  target_lang: string
  audio_base64: string
  sample_rate: number
  duration_seconds: number
  tts_voice_used: string
}

export interface HealthResponse {
  status: string
  version: string
  ai_enabled: boolean
  languages_available: number
  voxcpm_available: boolean
  kittentts_available: boolean
  uptime: number
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get('/health')
  return data
}

export async function getLanguages() {
  const { data } = await api.get('/languages')
  return data.languages as LanguageMap
}

export async function getVoices(provider?: string) {
  const params = provider ? { provider } : {}
  const { data } = await api.get('/voices', { params })
  return data.providers as Record<string, VoiceInfo[]>
}

export async function audioTranslate(
  audioBlob: Blob,
  sourceLang = 'auto',
  targetLang = 'en',
  ttsProvider = 'edge_tts',
  ttsVoice = 'default'
): Promise<AudioTranslateResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')
  formData.append('source_lang', sourceLang)
  formData.append('target_lang', targetLang)
  formData.append('tts_provider', ttsProvider)
  formData.append('tts_voice', ttsVoice)
  const { data } = await api.post('/audio/translate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
  return data
}

export async function textToSpeech(req: TTSRequest): Promise<TTSResponse> {
  const { data } = await api.post('/tts', req)
  return data
}

export function getTtsStreamUrl(): string {
  return `${API_BASE}/tts/stream`
}

export async function speechToText(
  audioBlob: Blob,
  language = 'en',
  modelSize = 'base'
): Promise<STTResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.wav')
  formData.append('language', language)
  formData.append('model_size', modelSize)
  const { data } = await api.post('/stt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getDocument(filename: string): Promise<DocumentDetail> {
  const { data } = await api.get(`/document/${filename}`)
  return data
}

export async function getDocumentChapters(filename: string) {
  try {
    const { data } = await api.get(`/document/${filename}/chapters`)
    return data.chapters as { title: string; page: number }[]
  } catch {
    const detail = await getDocument(filename)
    if (detail.page_details) {
      return detail.page_details.map((p, i) => ({
        title: `Page ${p.page_number || i + 1}`,
        page: p.page_number || i + 1,
      }))
    }
    return [{ title: 'Full Document', page: 1 }]
  }
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'auto'
): Promise<TranslateResponse> {
  const { data } = await api.post('/translate', {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  })
  return data
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const stored = localStorage.getItem('ekam-library')
  return stored ? JSON.parse(stored) : []
}

export async function saveToLibrary(item: Omit<LibraryItem, 'id' | 'createdAt'>): Promise<void> {
  const items = await getLibrary()
  const newItem: LibraryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  items.unshift(newItem)
  localStorage.setItem('ekam-library', JSON.stringify(items.slice(0, 100)))
}

export async function updateLibraryProgress(id: string, progress: number): Promise<void> {
  const items = await getLibrary()
  const idx = items.findIndex(i => i.id === id)
  if (idx >= 0) {
    items[idx].progress = progress
    localStorage.setItem('ekam-library', JSON.stringify(items))
  }
}

export async function deleteFromLibrary(id: string): Promise<void> {
  const items = await getLibrary()
  localStorage.setItem('ekam-library', JSON.stringify(items.filter(i => i.id !== id)))
}

export function getWsUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || window.location.host
  return `${protocol}//${host}/api${path}`
}

// ── AI API ──────────────────────────────────────────────────────────
export async function aiSummarize(text: string, maxLength = 200): Promise<{ summary: string }> {
  const { data } = await api.post('/ai/summarize', { text, max_length: maxLength })
  return data
}

export async function aiEnhanceTranslate(text: string, sourceLang: string, targetLang: string): Promise<{ translated_text: string }> {
  const { data } = await api.post('/ai/enhance-translate', { text, source_lang: sourceLang, target_lang: targetLang })
  return data
}

export async function aiDescribeImage(file: File, prompt = 'Describe this image'): Promise<{ description: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('prompt', prompt)
  const { data } = await api.post('/ai/describe-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return data
}
