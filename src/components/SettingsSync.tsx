'use client'
import { useEffect } from 'react'
import { pullSettings } from '@/lib/settings'

/** App 開啟時從 Notion 同步旅行清單和名字；有變動就重新整理一次畫面 */
export default function SettingsSync() {
  useEffect(() => {
    let done = false
    try { done = sessionStorage.getItem('settings-synced') === '1' } catch {}
    if (done) return
    pullSettings()
      .then(changed => {
        try { sessionStorage.setItem('settings-synced', '1') } catch {}
        if (changed) window.location.reload()
      })
      .catch(() => {})
  }, [])
  return null
}
