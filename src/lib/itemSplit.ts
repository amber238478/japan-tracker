import { LineItem } from './types'

/**
 * 每個品項的分攤方式：split = 設定裡「第一位使用者（user1）」負擔的比例
 *   0.5 = 平分（預設）、1 = user1 全付、0 = user2 全付、0.6 / 0.4 = 6:4
 */
export const DEFAULT_ITEM_SPLIT = 0.5

export function splitOptions(user1: string, user2: string) {
  return [
    { value: 0.5, label: '平分 5:5' },
    { value: 1, label: `${user1} 自己` },
    { value: 0, label: `${user2} 自己` },
    { value: 0.6, label: `${user1} 6 : ${user2} 4` },
    { value: 0.4, label: `${user1} 4 : ${user2} 6` },
  ]
}

export function splitLabel(split: number | undefined, user1: string, user2: string) {
  const v = split ?? DEFAULT_ITEM_SPLIT
  return splitOptions(user1, user2).find(o => o.value === v)?.label ?? `${user1} ${Math.round(v * 100)}%`
}

/**
 * 依明細算出兩人各負擔多少。
 * 明細加總與總額的差（稅、尾數、漏列）依各自比例分攤。
 */
export function sharesFromItems(items: LineItem[], total: number): [number, number] {
  const sum = items.reduce((a, x) => a + (Number(x.price) || 0), 0)
  const u1Items = items.reduce((a, x) => a + (Number(x.price) || 0) * (x.split ?? DEFAULT_ITEM_SPLIT), 0)
  const u1Ratio = sum !== 0 ? u1Items / sum : DEFAULT_ITEM_SPLIT
  const u1 = Math.round(u1Items + (total - sum) * u1Ratio)
  return [u1, total - u1]
}

/** 轉成這筆紀錄的分帳比例（存的是「付款人」負擔的比例） */
export function ratioFromItems(items: LineItem[], total: number, paidBy: string | undefined, user1: string): number {
  if (total <= 0) return 0.5
  const [u1] = sharesFromItems(items, total)
  const payerShare = paidBy === user1 ? u1 : total - u1
  return Math.min(1, Math.max(0, payerShare / total))
}
