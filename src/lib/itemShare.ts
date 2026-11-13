import { LineItem } from './types'

/**
 * 依品項分帳：每個品項的 share = 設定裡第一位（user1）負擔的比例
 *   0.5 平分（預設）、1 = user1 自己、0 = user2 自己、0.4 = user2 6 : user1 4
 * 只有打開「依品項分帳」的紀錄，品項才會有 share；舊紀錄沒有，就不顯示也不重算。
 */
export const DEFAULT_SHARE = 0.5

export function shareOptions(user1: string, user2: string) {
  return [
    { value: 1, label: user1, short: user1 },
    { value: 0.5, label: '平分', short: '平分' },
    { value: 0, label: user2, short: user2 },
    { value: 0.4, label: `${user2} 6 : ${user1} 4`, short: '6:4' },
  ]
}

/** 紀錄上顯示的例外文字（平分不顯示） */
export function shareTag(share: number | undefined, user1: string, user2: string): string | null {
  if (share === undefined || share === DEFAULT_SHARE) return null
  return shareOptions(user1, user2).find(o => o.value === share)?.label ?? `${user1} ${Math.round(share * 100)}%`
}

export const isItemMode = (items?: LineItem[]) => !!items?.length && items.some(x => typeof x.share === 'number')

export const withShares = (items: LineItem[]): LineItem[] => items.map(x => ({ ...x, share: x.share ?? DEFAULT_SHARE }))
export const withoutShares = (items: LineItem[]): LineItem[] => items.map(({ share, ...x }) => x)

/** 依品項算兩人負擔；明細與總額的差（稅、尾數）依比例分攤 */
export function sharesFromItems(items: LineItem[], total: number): [number, number] {
  const sum = items.reduce((a, x) => a + (Number(x.price) || 0), 0)
  const u1Items = items.reduce((a, x) => a + (Number(x.price) || 0) * (x.share ?? DEFAULT_SHARE), 0)
  const ratio = sum !== 0 ? u1Items / sum : DEFAULT_SHARE
  const u1 = Math.round(u1Items + (total - sum) * ratio)
  return [u1, total - u1]
}

/** 換算成紀錄的分帳比例（存的是付款人負擔的比例） */
export function ratioFromItems(items: LineItem[], total: number, paidBy: string | undefined, user1: string): number {
  if (total <= 0) return 0.5
  const [u1] = sharesFromItems(items, total)
  const payer = paidBy === user1 ? u1 : total - u1
  return Math.min(1, Math.max(0, payer / total))
}

/** 表單在依品項模式時，重新算出分帳比例 */
export function recalc<T extends { lineItems?: LineItem[]; amount?: number; paidBy?: string; splitWith?: string | null; splitRatio?: number }>(f: T, user1: string): T {
  if (f.splitWith == null || !isItemMode(f.lineItems)) return f
  return { ...f, splitRatio: ratioFromItems(f.lineItems!, Number(f.amount) || 0, f.paidBy, user1) }
}
