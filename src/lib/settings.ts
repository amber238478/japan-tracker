import { AppSettings } from './types'

const DEFAULT_SETTINGS: AppSettings = {
  budget: 100000,
  exchangeRate: 0.206,
  tripDays: 8,
  tripStart: '2026-11-01',
  tripName: '九州之旅',
  user1: 'Amber',
  user2: '男友',
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const s = localStorage.getItem('japan-tracker-settings')
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem('japan-tracker-settings', JSON.stringify(settings))
}

export function toTWD(jpy: number, rate?: number): number {
  const r = rate ?? getSettings().exchangeRate
  return Math.round(jpy * r)
}

export function getDayNumber(date: string, tripStart: string): number {
  const start = new Date(tripStart)
  const d = new Date(date)
  const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}
