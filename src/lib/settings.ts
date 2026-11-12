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

export function saveSettings(settings: AppSettings, opts: { sync?: boolean } = {}): boolean {
  try {
    localStorage.setItem('japan-tracker-settings', JSON.stringify(settings))
  } catch {
    return false
  }
  // 同步到 Notion，讓其他裝置也拿到同樣的旅行清單和名字（失敗不影響本機）
  if (opts.sync !== false) pushSettings(settings)
  return true
}

/** 本機有沒有自己存過設定（新裝置是 false） */
export function hasLocalSettings(): boolean {
  try { return !!localStorage.getItem('japan-tracker-settings') } catch { return false }
}

export function pushSettings(settings: AppSettings) {
  try {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trips: settings.trips, user1: settings.user1, user2: settings.user2, activeTrip: settings.activeTrip }),
    }).catch(() => {})
  } catch {}
}

/**
 * 從 Notion 拿共用設定，合併進本機：
 * - 旅行清單、兩人名字：以 Notion 為準
 * - 目前選的旅行：本機自己的；新裝置或那趟已不存在時，用 Notion 上最後選的
 * 回傳 true 代表本機設定有變（需要重新整理畫面）
 */
export async function pullSettings(): Promise<boolean> {
  const res = await fetch('/api/settings', { cache: 'no-store' })
  const d = await res.json()
  if (!d.success) return false
  const local = getSettings()
  const remote = d.data
  if (!remote || !Array.isArray(remote.trips) || remote.trips.length === 0) {
    // Notion 還沒有設定：本機有自己設定過的話，上傳當作共用設定
    if (hasLocalSettings()) pushSettings(local)
    return false
  }
  // 旅行清單取聯集：本機有、Notion 沒有的旅行不會被丟掉，會補回 Notion
  const remoteNames = remote.trips.map((t: Trip) => t.name)
  const extra = hasLocalSettings() ? local.trips.filter(t => !remoteNames.includes(t.name)) : []
  const trips: Trip[] = [...remote.trips, ...extra]
  const names = trips.map(t => t.name)
  const activeTrip = hasLocalSettings() && names.includes(local.activeTrip)
    ? local.activeTrip
    : (names.includes(remote.activeTrip) ? remote.activeTrip : names[names.length - 1])
  const merged: AppSettings = { trips, user1: remote.user1 || local.user1, user2: remote.user2 || local.user2, activeTrip }
  if (extra.length) pushSettings(merged)
  const changed = JSON.stringify(merged) !== JSON.stringify(local) || !hasLocalSettings()
  if (changed) saveSettings(merged, { sync: false })
  return changed
}

export function getActiveTrip(settings: AppSettings): Trip {
  return settings.trips.find(t => t.name === settings.activeTrip) ?? settings.trips[0]
}

// 舊資料在新增「行程」欄位前就存在，沒有 trip 標籤；視為屬於第一個未封存的旅行
export function receiptBelongsToTrip(receiptTrip: string, settings: AppSettings): boolean {
  if (receiptTrip) return receiptTrip === settings.activeTrip
  const fallback = settings.trips.find(t => !t.archived) ?? settings.trips[0]
  return fallback?.name === settings.activeTrip
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
