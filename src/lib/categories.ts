// 「藥品」算在購物底下：不含購物的總額會一併扣掉，畫面上顯示為「購物-藥品」
// （Notion 裡的類別值仍是「藥品」，舊資料不用改）
export const SHOPPING_CATEGORIES = ['購物', '藥品']

export const isShopping = (category: string) => SHOPPING_CATEGORIES.includes(category)

export const catLabel = (category: string) => (category === '藥品' ? '購物-藥品' : category)
