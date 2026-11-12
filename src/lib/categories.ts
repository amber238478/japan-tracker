// 子分類：「藥品」是「購物」底下的子分類
// - 不含購物的總額會一併扣掉藥品
// - 分類統計裡，購物的金額包含藥品，藥品列在購物下面
// （Notion 裡的類別值仍是「藥品」，舊資料不用改）
export const SUB_PARENT: Record<string, string> = { '藥品': '購物' }
export const SHOPPING_CATEGORIES = ['購物', '藥品']

export const isShopping = (category: string) => SHOPPING_CATEGORIES.includes(category)

/** 標籤、下拉選單上顯示的名稱 */
export const catLabel = (category: string) =>
  SUB_PARENT[category] ? `${SUB_PARENT[category]} › ${category}` : category

type Row = { name: string; amt: number; user1Amt?: number; user2Amt?: number }

/** 把子分類併進父分類：父分類金額 = 自己 + 子分類，子分類放在 subs 裡 */
export function nestSubcategories<T extends Row>(rows: T[]): (T & { subs?: T[] })[] {
  const out: (T & { subs?: T[] })[] = rows.filter(r => !SUB_PARENT[r.name]).map(r => ({ ...r }))
  for (const child of rows.filter(r => SUB_PARENT[r.name])) {
    const parentName = SUB_PARENT[child.name]
    let parent = out.find(r => r.name === parentName)
    if (!parent) {
      // 只有子分類沒有父分類時，建一個金額為 0 的父分類
      parent = { ...child, name: parentName, amt: 0, user1Amt: 0, user2Amt: 0 } as T & { subs?: T[] }
      out.push(parent)
    }
    parent.amt += child.amt
    if (parent.user1Amt !== undefined) parent.user1Amt += child.user1Amt ?? 0
    if (parent.user2Amt !== undefined) parent.user2Amt += child.user2Amt ?? 0
    parent.subs = [...(parent.subs ?? []), child]
  }
  return out
}
