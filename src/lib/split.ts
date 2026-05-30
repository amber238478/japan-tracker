import { Receipt, SplitSummary } from './types'

export function calcSplit(receipts: Receipt[], user1: string, user2: string): SplitSummary {
  let user1Paid = 0
  let user2Paid = 0
  let user1Should = 0
  let user2Should = 0

  for (const r of receipts) {
    if (!r.splitWith) continue // solo expense, skip

    const amt = r.amountJPY
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

  let oweText = ''
  if (Math.abs(balance) < 100) {
    oweText = '已經差不多平了 ✓'
  } else if (balance > 0) {
    oweText = `${user2} 欠 ${user1} ¥${balance.toLocaleString()}`
  } else {
    oweText = `${user1} 欠 ${user2} ¥${Math.abs(balance).toLocaleString()}`
  }

  return { user1Paid, user2Paid, user1Should, user2Should, balance, oweText }
}
