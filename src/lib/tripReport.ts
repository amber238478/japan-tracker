import { Receipt, Trip, AppSettings } from './types'
import { calcSplit } from './split'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '其他']

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
  lines.push('')

  lines.push('💰 總支出')
  lines.push(`¥${jpyTotal.toLocaleString()}`)
  if (twdTotal > 0) lines.push(`NT$${twdTotal.toLocaleString()}`)
  lines.push('')

  const catLine = (recs: Receipt[], symbol: string, currTotal: number) => CATEGORIES.map(c => {
    const catRecs = recs.filter(r => r.category === c)
    const amt = catRecs.reduce((a, r) => a + r.amount, 0)
    if (amt === 0) return null
    const u1 = catRecs.filter(r => r.paidBy === settings.user1).reduce((a, r) => a + r.amount, 0)
    const u2 = catRecs.filter(r => r.paidBy === settings.user2).reduce((a, r) => a + r.amount, 0)
    let line = `${c} ${symbol}${amt.toLocaleString()}（${Math.round(amt / currTotal * 100)}%）`
    if (u1 > 0 && u2 > 0) line += ` ｜ ${settings.user1} ${symbol}${u1.toLocaleString()} · ${settings.user2} ${symbol}${u2.toLocaleString()}`
    return line
  }).filter((l): l is string => l !== null)

  lines.push('📊 分類支出（JPY）')
  lines.push(...catLine(jpy, '¥', jpyTotal))

  if (twdTotal > 0) {
    lines.push('')
    lines.push('📊 分類支出（TWD）')
    lines.push(...catLine(twd, 'NT$', twdTotal))
  }

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
    lines.push('')
    lines.push('👥 各自真實花費（個人支出＋分帳後）')
    if (jpyTotal > 0) {
      lines.push(`${settings.user1} ¥${user1JpyTotal.toLocaleString()} · ${settings.user2} ¥${user2JpyTotal.toLocaleString()}`)
    }
    if (twdTotal > 0) {
      lines.push(`${settings.user1} NT$${user1TwdTotal.toLocaleString()} · ${settings.user2} NT$${user2TwdTotal.toLocaleString()}`)
    }
  }

  const showJpySplit = Math.abs(split.JPY.balance) >= 100
  const showTwdSplit = Math.abs(split.TWD.balance) >= 30
  if (showJpySplit || showTwdSplit) {
    lines.push('')
    lines.push('💳 分帳結算')
    if (showJpySplit) lines.push(split.JPY.oweText)
    if (showTwdSplit) lines.push(split.TWD.oweText)
  }

  lines.push('')
  lines.push(`共 ${receipts.length} 筆紀錄`)

  return lines.join('\n')
}
