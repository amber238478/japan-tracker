'use client'
import { useEffect } from 'react'
import { pullSettings, autoSelectTripByDate } from '@/lib/settings'

/** App 開啟時從 Notion 同步旅行清單和名字；有變動就重新整理一次畫面 */
export default function SettingsSync() {
  useEffect(() => {
    let done = false
    try { done = sessionStorage.getItem('settings-synced') === '1' } catch {}
    if (done) return
    const finish = (changed: boolean) => {
      try { sessionStorage.setItem('settings-synced', '1') } catch {}
      // 今天在某趟旅行期間內 → 自動切到那趟
      const switched = autoSelectTripByDate()
      if (changed || switched) window.location.reload()
    }
    pullSettings().then(finish).catch(() => finish(false))
  }, [])
  return null
}
