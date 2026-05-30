import { getSettings } from './settings'

export async function exportReport(includeScreenshot = false) {
  if (typeof window === 'undefined') return
  const url = window.location.href
  const settings = getSettings()
  const logs = (window as any).getAppLogs ? (window as any).getAppLogs() : []
  const storage: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k) storage[k] = localStorage.getItem(k) || ''
  }

  let screenshot: string | null = null
  if (includeScreenshot && navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      const video = document.createElement('video')
      video.autoplay = true
      video.muted = true
      video.srcObject = stream
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => resolve(), 500)
        video.onloadedmetadata = () => {
          clearTimeout(t)
          resolve()
        }
      })
      const w = video.videoWidth || 1280
      const h = video.videoHeight || 720
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.drawImage(video, 0, 0, w, h)
      screenshot = canvas.toDataURL('image/png')
      // stop tracks
      try { track.stop() } catch {}
    } catch (e) {
      console.warn('Screenshot failed', e)
      screenshot = null
    }
  }

  const payload: any = {
    ts: new Date().toISOString(),
    url,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    settings,
    logs,
    localStorage: storage,
  }
  if (screenshot) payload.screenshot = screenshot

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
