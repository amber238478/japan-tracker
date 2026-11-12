'use client'

/**
 * 把畫面上的報表轉成 PDF，然後分享或下載。
 * iPhone 加到主畫面的 App（standalone 模式）不支援 window.print()，所以改在手機上直接產生 PDF。
 */

const A4_W = 210 // mm
const A4_H = 297
const MARGIN = 10
const HEADER_H = 9 // 每頁最上方標題列的高度（mm）
const RENDER_WIDTH = 720 // 以固定寬度排版後再截圖，手機和電腦產生的 PDF 一樣

/** 畫每頁上方的標題列（用 canvas 畫字，中文才不會變亂碼） */
function headerImage(title: string, pageNo: number, pages: number, widthPx: number): string {
  const h = Math.round(widthPx * HEADER_H / (A4_W - MARGIN * 2))
  const c = document.createElement('canvas')
  c.width = widthPx
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  const font = "-apple-system, 'PingFang TC', 'Noto Sans TC', 'Helvetica Neue', Arial, sans-serif"
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#222222'
  ctx.font = `600 ${Math.round(h * 0.42)}px ${font}`
  ctx.fillText(title, 0, h * 0.45)
  ctx.fillStyle = '#999999'
  ctx.font = `${Math.round(h * 0.34)}px ${font}`
  const pageText = `第 ${pageNo} / ${pages} 頁`
  ctx.fillText(pageText, c.width - ctx.measureText(pageText).width, h * 0.45)
  ctx.fillStyle = '#dddddd'
  ctx.fillRect(0, h - Math.max(1, Math.round(h * 0.03)), c.width, Math.max(1, Math.round(h * 0.03)))
  return c.toDataURL('image/png')
}

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
    // 有表頭的表格：記下位置，表格跨頁時在新的一頁重複表頭
    const elTop = el.getBoundingClientRect().top
    const tables = Array.from(el.querySelectorAll('table')).map(t => {
      const head = t.querySelector('thead')
      if (!head) return null
      const tr = t.getBoundingClientRect(), hr = head.getBoundingClientRect()
      return { top: tr.top - elTop, bottom: tr.bottom - elTop, headTop: hr.top - elTop, headBottom: hr.bottom - elTop }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
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
    const contentH = A4_H - MARGIN * 2 - HEADER_H - 2 // 留出標題列
    const pxPerMm = canvas.width / contentW          // 畫布像素 / mm
    const pageHpx = Math.floor(contentH * pxPerMm)    // 一頁可放的畫布高度

    // 先決定每一頁要切哪一段，最後再一起畫（才知道總頁數）
    type Head = { y: number; h: number }
    const slices: { y: number; h: number; head?: Head }[] = []
    let y = 0
    while (y < canvas.height - 1) {
      // 這一頁是不是從某個表格的中間開始？是的話上方要再放一次表頭
      const t = tables.find(t => y > t.headBottom * scale + 1 && y < t.bottom * scale - 1)
      const head: Head | undefined = t ? { y: Math.round(t.headTop * scale), h: Math.round((t.headBottom - t.headTop) * scale) } : undefined
      const room = pageHpx - (head?.h ?? 0)
      // 在一頁高度內，找最後一個可換頁位置
      let end = Math.min(y + room, canvas.height)
      if (end < canvas.height) {
        const candidates = breaks.map(b => b * scale).filter(b => b > y + room * 0.3 && b <= y + room)
        if (candidates.length) end = candidates[candidates.length - 1]
      }
      slices.push({ y, h: Math.max(1, Math.round(end - y)), head })
      y = end
    }

    slices.forEach((sl, i) => {
      const headH = sl.head?.h ?? 0
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sl.h + headH
      const ctx = slice.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      if (sl.head) ctx.drawImage(canvas, 0, sl.head.y, canvas.width, headH, 0, 0, canvas.width, headH)
      ctx.drawImage(canvas, 0, sl.y, canvas.width, sl.h, 0, headH, canvas.width, sl.h)

      if (i > 0) pdf.addPage()
      pdf.addImage(headerImage(title, i + 1, slices.length, canvas.width), 'PNG', MARGIN, MARGIN, contentW, HEADER_H)
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, MARGIN + HEADER_H + 2, contentW, slice.height / pxPerMm)
    })

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
