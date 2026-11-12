export function resizeImageToBase64(file: File, maxDim = 1280, quality = 0.82): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

/**
 * 收據照片存檔用：壓到約 300KB 以內（長邊 1600px 起，JPEG），文字仍看得清楚。
 * 太大就先降畫質、再縮尺寸。
 */
export async function compressForStorage(file: File, targetBytes = 300 * 1024): Promise<{ base64: string, mimeType: string, bytes: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('image load failed'))
      i.src = url
    })
    const attempts: [number, number][] = [[1600, 0.6], [1600, 0.5], [1400, 0.5], [1200, 0.45], [1000, 0.45]]
    let best = { base64: '', mimeType: 'image/jpeg', bytes: Infinity }
    for (const [maxDim, quality] of attempts) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas unavailable')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]
      const bytes = Math.floor(base64.length * 3 / 4)
      if (bytes < best.bytes) best = { base64, mimeType: 'image/jpeg', bytes }
      if (bytes <= targetBytes) break
    }
    return best
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 掃描時把壓縮後的照片暫存，確認頁儲存時一起上傳 */
export const SCANNED_PHOTO_KEY = 'scanned-photo'
export async function stashScannedPhoto(file: File) {
  try {
    const { base64 } = await compressForStorage(file)
    sessionStorage.setItem(SCANNED_PHOTO_KEY, base64)
  } catch (e) {
    console.error('photo compress failed', e)
    try { sessionStorage.removeItem(SCANNED_PHOTO_KEY) } catch {}
  }
}
