import { Receipt, Trip, AppSettings } from './types'
import { calcSplit, attribute } from './split'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const DIVIDER = '－－－－－－－－－－'

// 將金額字串右對齊到同一寬度，數字部分在純文字分享時看起來才整齊
function padAmounts(strs: string[]): string[] {
  const width = Math.max(...strs.map(s => s.length), 0)
  return strs.map(s => s.padStart(width))
}

function categoryRows(recs: Receipt[], idx: 0 | 1, user1: string, user2: string) {
  return CATEGORIES.map(c => {
    const amt = recs.filter(r => r.category === c).reduce((a, r) => a + attribute(r, user1, user2)[idx], 0)
    return amt > 0 ? { name: c, amt } : null
  }).filter((r): r is { name: string; amt: number } => r !== null)
}

function personSection(user: string, idx: 0 | 1, user1: string, user2: string, jpy: Receipt[], twd: Receipt[], twdTotal: number): string[] {
  const out: string[] = []
  const jpyAmt = jpy.reduce((a, r) => a + attribute(r, user1, user2)[idx], 0)
  const twdAmt = twd.reduce((a, r) => a + attribute(r, user1, user2)[idx], 0)

  out.push(`🧍 ${user} 的支出`)
  const totalStrs = padAmounts([`¥${jpyAmt.toLocaleString()}`, ...(twdTotal > 0 ? [`NT$${twdAmt.toLocaleString()}`] : [])])
  out.push(`　總計　${totalStrs[0]}`)
  if (twdTotal > 0) out.push(`　　　　${totalStrs[1]}`)

  const jpyRows = categoryRows(jpy, idx, user1, user2)
  if (jpyRows.length) {
    const amtStrs = padAmounts(jpyRows.map(r => `¥${r.amt.toLocaleString()}`))
    jpyRows.forEach((r, i) => out.push(`　${r.name}　${amtStrs[i]}　(${Math.round(r.amt / jpyAmt * 100)}%)`))
  }
  if (twdTotal > 0) {
    const twdRows = categoryRows(twd, idx, user1, user2)
    if (twdRows.length) {
      const amtStrs = padAmounts(twdRows.map(r => `NT$${r.amt.toLocaleString()}`))
      twdRows.forEach((r, i) => out.push(`　${r.name}　${amtStrs[i]}　(${Math.round(r.amt / twdAmt * 100)}%)`))
    }
  }
  return out
}

export function buildTripReport(receipts: Receipt[], trip: Trip, settings: AppSettings): string {
  const tripEnd = new Date(trip.tripStart)
  tripEnd.setDate(tripEnd.getDate() + trip.tripDays - 1)

  const jpy = receipts.filter(r => r.currency !== 'TWD')
  const twd = receipts.filter(r => r.currency === 'TWD')
  const jpyTotal = jpy.reduce((a, r) => a + r.amount, 0)
  const twdTotal = twd.reduce((a, r) => a + r.amount, 0)

  const lines: string[] = []
  lines.push(`🗒 ${trip.name} 旅行報表`)
  lines.push(`${trip.tripStart} ~ ${tripEnd.toISOString().split('T')[0]}（${trip.tripDays}天）`)
  lines.push(DIVIDER)

  lines.push('💰 旅程總支出')
  const totalAmts = padAmounts([`¥${jpyTotal.toLocaleString()}`, ...(twdTotal > 0 ? [`NT$${twdTotal.toLocaleString()}`] : [])])
  lines.push(`　日幣　${totalAmts[0]}`)
  if (twdTotal > 0) lines.push(`　台幣　${totalAmts[1]}`)
  lines.push(DIVIDER)

  // 兩人各自的支出完全拆開，各自一份完整的總額＋分類明細
  if (jpyTotal > 0 || twdTotal > 0) {
    lines.push(...personSection(settings.user1, 0, settings.user1, settings.user2, jpy, twd, twdTotal))
    lines.push(DIVIDER)
    lines.push(...personSection(settings.user2, 1, settings.user1, settings.user2, jpy, twd, twdTotal))
    lines.push(DIVIDER)
  }

  // 分帳結算：誰還欠誰多少
  const split = calcSplit(receipts, settings.user1, settings.user2)
  const showJpySplit = Math.abs(split.JPY.balance) >= 100
  const showTwdSplit = Math.abs(split.TWD.balance) >= 30
  if (showJpySplit || showTwdSplit) {
    lines.push('💳 分帳結算')
    if (showJpySplit) lines.push(`　${split.JPY.oweText}`)
    if (showTwdSplit) lines.push(`　${split.TWD.oweText}`)
    lines.push(DIVIDER)
  }

  lines.push(`共 ${receipts.length} 筆紀錄`)

  return lines.join('\n')
}
