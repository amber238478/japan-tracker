'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, saveSettings } from '@/lib/settings'
import { AppSettings } from '@/lib/types'
import { useCallback } from 'react'

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState<AppSettings>(getSettings())
  const [saved, setSaved] = useState(false)

  const set = (key: keyof AppSettings, val: any) => setForm(f => ({ ...f, [key]: val }))

  const save = () => {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reportBug = useCallback(async () => {
    try {
      const url = window.location.href
      const settings = getSettings()
      const logs = (window as any).getAppLogs ? (window as any).getAppLogs() : []
      const storage: Record<string,string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) storage[k] = localStorage.getItem(k) || ''
      }
      const payload = {
        ts: new Date().toISOString(),
        url,
        userAgent: navigator.userAgent,
        settings,
        logs,
        localStorage: storage,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const fileName = `japan-tracker-report-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
      // copy to clipboard
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload))
        alert('Report copied to clipboard as JSON. Also starting download.')
      } catch {
        // ignore
      }
      // download
      const urlBlob = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlBlob
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(urlBlob)
    } catch (e) {
      alert('無法產生報告: ' + (e as any)?.message)
    }
  }, [])

  return (
    <main style={{ padding: '20px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 500 }}>設定</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>旅行資訊</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅行名稱</div>
            <input value={form.tripName} onChange={e => set('tripName', e.target.value)} placeholder="九州之旅" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>出發日期</div>
              <input type="date" value={form.tripStart} onChange={e => set('tripStart', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅行天數</div>
              <input type="number" value={form.tripDays} onChange={e => set('tripDays', Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>旅伴</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅伴 1（自己）</div>
              <input value={form.user1} onChange={e => set('user1', e.target.value)} placeholder="Amber" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅伴 2</div>
              <input value={form.user2} onChange={e => set('user2', e.target.value)} placeholder="男友" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>預算與匯率</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>總預算（日幣）</div>
            <input type="number" value={form.budget} onChange={e => set('budget', Number(e.target.value))} placeholder="100000" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>匯率（¥1 = NT$?）</div>
            <input type="number" step="0.001" value={form.exchangeRate} onChange={e => set('exchangeRate', Number(e.target.value))} placeholder="0.206" />
          </div>
        </div>

        <button className="btn-primary" onClick={save}>
          {saved ? '已儲存 ✓' : '儲存設定'}
        </button>
        <button onClick={reportBug} style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'white' }}>
          回報錯誤 / 匯出報告
        </button>
      </div>
    </main>
  )
}
