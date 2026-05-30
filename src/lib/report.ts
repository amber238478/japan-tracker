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
  if (screenshot) {
    const pngName = `japan-tracker-screenshot-${new Date().toISOString().replace(/[:.]/g,'-')}.png`
    // convert dataURL to blob and trigger download for PNG
    try {
      const arr = screenshot.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) u8arr[n] = bstr.charCodeAt(n)
      const imgBlob = new Blob([u8arr], { type: mime })
      const imgUrl = URL.createObjectURL(imgBlob)
      const aImg = document.createElement('a')
      aImg.href = imgUrl
      aImg.download = pngName
      document.body.appendChild(aImg)
      aImg.click()
      aImg.remove()
      URL.revokeObjectURL(imgUrl)
      payload.screenshotFile = pngName
    } catch (e) {
      console.warn('Failed to save separate PNG', e)
      payload.screenshot = screenshot
    }
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
