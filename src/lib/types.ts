export interface Receipt {
  id?: string
  notionId?: string
  trip: string
  storeName: string
  storeNameJa: string
  items: string
  itemsJa: string
  amount: number
  currency: Currency
  category: Category
  paymentMethod: PaymentMethod
  date: string
  region: string
  paidBy: string
  splitWith: string | null  // null = no split (solo)
  splitRatio: number        // 0.5 = AA, custom ratio for paidBy person
  proxyFor: string          // 代買對象，category=代買 時填入
  notes: string
  lineItems?: LineItem[]    // 收據分項明細（品名＋價格）
  photoUrl?: string         // 收據照片（Notion 檔案連結，約 1 小時後失效，每次重新讀取）
  photo?: string            // 新增時附上的照片（壓縮後 JPEG base64），只用於上傳
}

export interface LineItem {
  name: string      // 中文品名
  nameJa?: string   // 日文原文
  qty?: number      // 數量（預設 1）
  price: number     // 該行小計（已乘數量；折扣為負數）
  share?: number    // 依品項分帳時 user1 負擔比例（0.5 平分、1/0 單人、0.4 = user2 6:user1 4）
}

export type Currency = 'JPY' | 'TWD'
export type Category = '餐飲' | '交通' | '購物' | '門票' | '住宿' | '藥品' | '代買' | '其他'
export type PaymentMethod = '現金' | '信用卡' | '信用卡-星展' | '信用卡-熊本熊' | 'Suica' | 'PayPay' | '其他'

export interface Trip {
  name: string
  tripStart: string
  tripDays: number
  budget: number
  exchangeRate: number
  archived?: boolean
  companion?: string  // 這趟的旅伴（旅伴 2）；沒填就用設定裡預設的 user2
}

export interface AppSettings {
  trips: Trip[]
  activeTrip: string  // = Trip.name
  user1: string
  user2: string
}

export interface CurrencySplitSummary {
  user1Paid: number
  user2Paid: number
  user1Should: number
  user2Should: number
  balance: number  // positive = user2 owes user1
  oweText: string
}

export interface SplitSummary {
  JPY: CurrencySplitSummary
  TWD: CurrencySplitSummary
}
