import { AppSettings, Trip } from './types'

const DEFAULT_TRIP: Trip = {
  name: '東京之旅',
  budget: 100000,
  exchangeRate: 0.21,
  tripDays: 8,
  tripStart: '2026-06-26',
}

const DEFAULT_SETTINGS: AppSettings = {
  trips: [DEFAULT_TRIP],
  activeTrip: DEFAULT_TRIP.name,
  user1: '我',
  user2: '飛飛',
}

// 舊版設定是單一旅行的扁平結構，沒有 trips 陣列；讀取時自動轉換成多旅行結構
function migrate(raw: any): AppSettings {
  if (raw && Array.isArray(raw.trips)) return raw as AppSettings
  if (raw && raw.tripName) {
    const trip: Trip = {
      name: raw.tripName,
      tripStart: raw.tripStart ?? DEFAULT_TRIP.tripStart,
      tripDays: raw.tripDays ?? DEFAULT_TRIP.tripDays,
      budget: raw.budget ?? DEFAULT_TRIP.budget,
      exchangeRate: raw.exchangeRate ?? DEFAULT_TRIP.exchangeRate,
    }
    return { trips: [trip], activeTrip: trip.name, user1: raw.user1 ?? DEFAULT_SETTINGS.user1, user2: raw.user2 ?? DEFAULT_SETTINGS.user2 }
  }
  return DEFAULT_SETTINGS
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const s = localStorage.getItem('japan-tracker-settings')
    if (!s) return DEFAULT_SETTINGS
    return migrate(JSON.parse(s))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem('japan-tracker-settings', JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

export function getActiveTrip(settings: AppSettings): Trip {
  return settings.trips.find(t => t.name === settings.activeTrip) ?? settings.trips[0]
}

// 舊資料在新增「行程」欄位前就存在，沒有 trip 標籤；視為屬於第一個（最早建立的）旅行
export function receiptBelongsToTrip(receiptTrip: string, settings: AppSettings): boolean {
  if (receiptTrip) return receiptTrip === settings.activeTrip
  return settings.trips[0]?.name === settings.activeTrip
}

export function toTWD(jpy: number, rate?: number): number {
  const r = rate ?? getActiveTrip(getSettings()).exchangeRate
  return Math.round(jpy * r)
}

export function getDayNumber(date: string, tripStart: string): number {
  const start = new Date(tripStart)
  const d = new Date(date)
  const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}
