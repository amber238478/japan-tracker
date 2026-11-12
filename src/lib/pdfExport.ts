'use client'

/**
 * 把畫面上的報表轉成 PDF，然後分享或下載。
 * iPhone 加到主畫面的 App（standalone 模式）不支援 window.print()，所以改在手機上直接產生 PDF。
 */

const A4_W = 210 // mm
const A4_H = 297
const MARGIN = 10
const RENDER_WIDTH = 720 // 以固定寬度排版後再截圖，手機和電腦產生的 PDF 一樣

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

/** 找出可以換頁的位置（每一列、每個區塊的底部），避免把一行字切成兩半 */
function breakPoints(el: HTMLElement): number[] {
  const top = el.getBoundingClientRect().top
  const ys = new Set<number>()
  // .keep-next：同一筆紀錄的明細列，不在中間換頁
  el.querySelectorAll('tr:not(.keep-next), section, h1, h3, .pdf-block').forEach(n => {
    const r = (n as HTMLElement).getBoundingClientRect()
    ys.add(Math.round(r.bottom - top))
  })
  ys.add(Math.round(el.scrollHeight))
  return [...ys].sort((a, b) => a - b)
}

/** 產生 PDF 後嘗試分享；回傳 'blocked' 代表手機擋下了（等太久），要請使用者再點一次分享 */
export async function exportElementToPdf(el: HTMLElement, filename: string, title: string): Promise<{ result: ShareResult; file: File }> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  // 固定寬度排版
  const prev = { width: el.style.width, maxWidth: el.style.maxWidth, margin: el.style.margin, background: el.style.background }
  el.style.width = `${RENDER_WIDTH}px`
  el.style.maxWidth = 'none'
  el.style.margin = '0'
  el.style.background = '#ffffff'
  el.classList.add('pdf-rendering')

  try {
    const breaks = breakPoints(el)
    const scale = 2
    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: '#ffffff',
      width: RENDER_WIDTH,
      windowWidth: RENDER_WIDTH,
      useCORS: true,
    })

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const contentW = A4_W - MARGIN * 2
    const contentH = A4_H - MARGIN * 2
    const pxPerMm = canvas.width / contentW          // 畫布像素 / mm
    const pageHpx = Math.floor(contentH * pxPerMm)    // 一頁可放的畫布高度

    let y = 0
    let first = true
    while (y < canvas.height - 1) {
      // 在一頁高度內，找最後一個可換頁位置
      let end = Math.min(y + pageHpx, canvas.height)
      if (end < canvas.height) {
        const candidates = breaks.map(b => b * scale).filter(b => b > y + pageHpx * 0.3 && b <= y + pageHpx)
        if (candidates.length) end = candidates[candidates.length - 1]
      }
      const sliceH = Math.max(1, Math.round(end - y))
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      const ctx = slice.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      if (!first) pdf.addPage()
      first = false
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN, contentW, sliceH / pxPerMm)
      y = end
    }

    const blob = pdf.output('blob')
    const file = new File([blob], filename, { type: 'application/pdf' })

    return { result: await sharePdf(file, title), file }
  } finally {
    el.style.width = prev.width
    el.style.maxWidth = prev.maxWidth
    el.style.margin = prev.margin
    el.style.background = prev.background
    el.classList.remove('pdf-rendering')
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'blocked' | 'downloaded'

/** 手機叫出分享選單（可「儲存到檔案」或傳給別人）；電腦直接下載 */
export async function sharePdf(file: File, title: string): Promise<ShareResult> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      const name = (e as any)?.name
      if (name === 'AbortError') return 'cancelled'      // 使用者自己關掉分享選單
      if (name === 'NotAllowedError') return 'blocked'   // 產生太久，iPhone 要求再點一次
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}
