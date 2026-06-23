export interface Receipt {
  id?: string
  notionId?: string
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
  notes: string
}

export type Currency = 'JPY' | 'TWD'
export type Category = '餐飲' | '交通' | '購物' | '門票' | '住宿' | '藥品' | '其他'
export type PaymentMethod = '現金' | '信用卡' | 'Suica' | 'PayPay' | '其他'

export interface AppSettings {
  budget: number
  exchangeRate: number
  tripDays: number
  tripStart: string
  tripName: string
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
