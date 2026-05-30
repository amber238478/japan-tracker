import { getSettings } from './settings'

export async function exportReport() {
  if (typeof window === 'undefined') return
  const url = window.location.href
  const settings = getSettings()
  const logs = (window as any).getAppLogs ? (window as any).getAppLogs() : []
  const storage: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k) storage[k] = localStorage.getItem(k) || ''
  }
  const payload = {
    ts: new Date().toISOString(),
    url,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    settings,
    logs,
    localStorage: storage,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const fileName = `japan-tracker-report-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(JSON.stringify(payload))
    }
  } catch (e) {
    // ignore
  }
  const urlBlob = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlBlob
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(urlBlob)
}
