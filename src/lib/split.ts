import { Receipt, SplitSummary, CurrencySplitSummary, Currency } from './types'

function calcForCurrency(receipts: Receipt[], currency: Currency, user1: string, user2: string): CurrencySplitSummary {
  let user1Paid = 0
  let user2Paid = 0
  let user1Should = 0
  let user2Should = 0

  for (const r of receipts) {
    if (r.currency !== currency) continue
    if (!r.splitWith) continue // solo expense, skip

    const amt = r.amount
    const ratio = r.splitRatio ?? 0.5 // ratio = paidBy person's share

    if (r.paidBy === user1) {
      user1Paid += amt
      user1Should += Math.round(amt * ratio)
      user2Should += Math.round(amt * (1 - ratio))
    } else if (r.paidBy === user2) {
      user2Paid += amt
      user2Should += Math.round(amt * ratio)
      user1Should += Math.round(amt * (1 - ratio))
    }
  }

  // balance: positive = user2 owes user1, negative = user1 owes user2
  const balance = user1Paid - user1Should
  const symbol = currency === 'JPY' ? '¥' : 'NT$'

  let oweText = ''
  if (Math.abs(balance) < (currency === 'JPY' ? 100 : 30)) {
    oweText = '已經差不多平了 ✓'
  } else if (balance > 0) {
    oweText = `${user2} 欠 ${user1} ${symbol}${balance.toLocaleString()}`
  } else {
    oweText = `${user1} 欠 ${user2} ${symbol}${Math.abs(balance).toLocaleString()}`
  }

  return { user1Paid, user2Paid, user1Should, user2Should, balance, oweText }
}

export function calcSplit(receipts: Receipt[], user1: string, user2: string): SplitSummary {
  return {
    JPY: calcForCurrency(receipts, 'JPY', user1, user2),
    TWD: calcForCurrency(receipts, 'TWD', user1, user2),
  }
}

// 一筆收據各自歸屬的金額：沒有分帳全額算 paidBy，有分帳則依比例拆給兩人
export function attribute(r: Receipt, user1: string, user2: string): [number, number] {
  if (!r.splitWith) {
    if (r.paidBy === user1) return [r.amount, 0]
    if (r.paidBy === user2) return [0, r.amount]
    return [0, 0]
  }
  const ratio = r.splitRatio ?? 0.5
  if (r.paidBy === user1) {
    const u1 = Math.round(r.amount * ratio)
    return [u1, r.amount - u1]
  }
  if (r.paidBy === user2) {
    const u2 = Math.round(r.amount * ratio)
    return [r.amount - u2, u2]
  }
  return [0, 0]
}

// 某人在指定幣別的真實花費總額：個人支出（沒有分帳，全額算自己的）＋ 分帳後該負責的份額
export function personalTotal(receipts: Receipt[], currency: Currency, user: string, otherUser: string): number {
  return receipts.filter(r => r.currency === currency).reduce((a, r) => a + attribute(r, user, otherUser)[0], 0)
}
