import { Receipt, Trip, AppSettings } from './types'
import { calcSplit } from './split'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '其他']
const DIVIDER = '－－－－－－－－－－'

// 將金額字串右對齊到同一寬度，數字部分在純文字分享時看起來才整齊
function padAmounts(strs: string[]): string[] {
  const width = Math.max(...strs.map(s => s.length), 0)
  return strs.map(s => s.padStart(width))
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

  // 總支出
  lines.push('💰 總支出')
  const totalAmts = padAmounts([
    `¥${jpyTotal.toLocaleString()}`,
    ...(twdTotal > 0 ? [`NT$${twdTotal.toLocaleString()}`] : []),
  ])
  lines.push(`　日幣　${totalAmts[0]}`)
  if (twdTotal > 0) lines.push(`　台幣　${totalAmts[1]}`)
  lines.push(DIVIDER)

  // 分類支出
  const catSection = (recs: Receipt[], symbol: string, currTotal: number, label: string) => {
    const rows = CATEGORIES.map(c => {
      const catRecs = recs.filter(r => r.category === c)
      const amt = catRecs.reduce((a, r) => a + r.amount, 0)
      if (amt === 0) return null
      const u1 = catRecs.filter(r => r.paidBy === settings.user1).reduce((a, r) => a + r.amount, 0)
      const u2 = catRecs.filter(r => r.paidBy === settings.user2).reduce((a, r) => a + r.amount, 0)
      return { name: c, amtStr: `${symbol}${amt.toLocaleString()}`, pct: Math.round(amt / currTotal * 100), u1, u2 }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
    if (rows.length === 0) return

    const amtStrs = padAmounts(rows.map(r => r.amtStr))
    lines.push(`📊 分類支出（${label}）`)
    rows.forEach((r, i) => {
      lines.push(`　${r.name}　${amtStrs[i]}　(${r.pct}%)`)
      if (r.u1 > 0 && r.u2 > 0) {
        lines.push(`　　└ ${settings.user1} ${symbol}${r.u1.toLocaleString()} · ${settings.user2} ${symbol}${r.u2.toLocaleString()}`)
      }
    })
    lines.push(DIVIDER)
  }
  catSection(jpy, '¥', jpyTotal, 'JPY')
  if (twdTotal > 0) catSection(twd, 'NT$', twdTotal, 'TWD')

  // 各自真實花費：個人支出（沒有分帳，全額算自己的）+ 分帳後該負責的份額
  const split = calcSplit(receipts, settings.user1, settings.user2)
  const soloJpyUser1 = jpy.filter(r => !r.splitWith && r.paidBy === settings.user1).reduce((a, r) => a + r.amount, 0)
  const soloJpyUser2 = jpy.filter(r => !r.splitWith && r.paidBy === settings.user2).reduce((a, r) => a + r.amount, 0)
  const soloTwdUser1 = twd.filter(r => !r.splitWith && r.paidBy === settings.user1).reduce((a, r) => a + r.amount, 0)
  const soloTwdUser2 = twd.filter(r => !r.splitWith && r.paidBy === settings.user2).reduce((a, r) => a + r.amount, 0)
  const user1JpyTotal = soloJpyUser1 + split.JPY.user1Should
  const user2JpyTotal = soloJpyUser2 + split.JPY.user2Should
  const user1TwdTotal = soloTwdUser1 + split.TWD.user1Should
  const user2TwdTotal = soloTwdUser2 + split.TWD.user2Should
  if (jpyTotal > 0 || twdTotal > 0) {
    lines.push('👥 各自真實花費（個人支出＋分帳後）')
    if (jpyTotal > 0) {
      const amts = padAmounts([`¥${user1JpyTotal.toLocaleString()}`, `¥${user2JpyTotal.toLocaleString()}`])
      lines.push(`　${settings.user1}　${amts[0]}`)
      lines.push(`　${settings.user2}　${amts[1]}`)
    }
    if (twdTotal > 0) {
      const amts = padAmounts([`NT$${user1TwdTotal.toLocaleString()}`, `NT$${user2TwdTotal.toLocaleString()}`])
      lines.push(`　${settings.user1}　${amts[0]}`)
      lines.push(`　${settings.user2}　${amts[1]}`)
    }
    lines.push(DIVIDER)
  }

  // 分帳結算
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
