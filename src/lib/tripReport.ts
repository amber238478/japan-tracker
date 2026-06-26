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

  lines.push('📊 分類支出（JPY）')
  CATEGORIES.forEach(c => {
    const amt = jpy.filter(r => r.category === c).reduce((a, r) => a + r.amount, 0)
    if (amt > 0) lines.push(`${c} ¥${amt.toLocaleString()}（${Math.round(amt / jpyTotal * 100)}%）`)
  })

  if (twdTotal > 0) {
    lines.push('')
    lines.push('📊 分類支出（TWD）')
    CATEGORIES.forEach(c => {
      const amt = twd.filter(r => r.category === c).reduce((a, r) => a + r.amount, 0)
      if (amt > 0) lines.push(`${c} NT$${amt.toLocaleString()}（${Math.round(amt / twdTotal * 100)}%）`)
    })
  }

  const split = calcSplit(receipts, settings.user1, settings.user2)
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
