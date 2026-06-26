'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, saveSettings } from '@/lib/settings'
import { AppSettings, Trip } from '@/lib/types'
import { useCallback } from 'react'
import { exportReport } from '@/lib/report'

function newTripDraft(): Trip {
  return {
    name: '',
    tripStart: new Date().toISOString().split('T')[0],
    tripDays: 7,
    budget: 100000,
    exchangeRate: 0.21,
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState<AppSettings>(getSettings())
  const [saved, setSaved] = useState(false)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [newTrip, setNewTrip] = useState<Trip>(newTripDraft())

  const activeTrip = form.trips.find(t => t.name === form.activeTrip) ?? form.trips[0]

  const set = (key: 'user1' | 'user2', val: string) => setForm(f => ({ ...f, [key]: val }))

  const selectTrip = (name: string) => setForm(f => ({ ...f, activeTrip: name }))

  const setTripField = (key: keyof Trip, val: any) => {
    setForm(f => ({
      ...f,
      trips: f.trips.map(t => t.name === f.activeTrip ? { ...t, [key]: val } : t)
    }))
  }

  const addTrip = () => {
    const name = newTrip.name.trim()
    if (!name) { alert('請輸入行程名稱'); return }
    if (form.trips.some(t => t.name === name)) { alert('已有相同名稱的行程'); return }
    const trip = { ...newTrip, name }
    setForm(f => ({ ...f, trips: [...f.trips, trip], activeTrip: trip.name }))
    setNewTrip(newTripDraft())
    setShowAddTrip(false)
  }

  const save = () => {
    const ok = saveSettings(form)
    const verified = ok && getSettings().user1 === form.user1 && getSettings().user2 === form.user2
    if (!verified) {
      alert('儲存失敗：瀏覽器封鎖了本地儲存（常見於無痕模式或隱私設定過嚴），請改用一般瀏覽模式再試一次')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reportBug = useCallback(async () => {
    const include = window.confirm('要包含螢幕截圖嗎？系統會要求你分享畫面以擷取影像。')
    await exportReport(include)
  }, [])

  return (
    <main style={{ padding: '20px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 500 }}>設定</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>行程</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: showAddTrip ? 12 : 0 }}>
            {form.trips.map(t => (
              <button key={t.name} onClick={() => selectTrip(t.name)}
                style={{ padding: '6px 12px', borderRadius: 10, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  borderColor: form.activeTrip === t.name ? 'var(--accent)' : 'var(--border)',
                  background: form.activeTrip === t.name ? 'var(--accent-light)' : 'transparent',
                  color: form.activeTrip === t.name ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {t.name}
              </button>
            ))}
            <button onClick={() => setShowAddTrip(v => !v)}
              style={{ padding: '6px 12px', borderRadius: 10, border: '0.5px dashed var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, background: 'transparent', color: 'var(--text-muted)' }}>
              + 新增行程
            </button>
          </div>

          {showAddTrip && (
            <div style={{ borderTop: '0.5px solid var(--border-light)', paddingTop: 12, marginBottom: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>行程名稱</div>
                <input value={newTrip.name} onChange={e => setNewTrip(t => ({ ...t, name: e.target.value }))} placeholder="例：熊本之旅" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>出發日期</div>
                  <input type="date" value={newTrip.tripStart} onChange={e => setNewTrip(t => ({ ...t, tripStart: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅行天數</div>
                  <input type="number" value={newTrip.tripDays} onChange={e => setNewTrip(t => ({ ...t, tripDays: Number(e.target.value) }))} />
                </div>
              </div>
              <button className="btn-primary" onClick={addTrip}>新增行程</button>
            </div>
          )}

          <div style={{ borderTop: '0.5px solid var(--border-light)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>目前行程：{activeTrip.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>出發日期</div>
                <input type="date" value={activeTrip.tripStart} onChange={e => setTripField('tripStart', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>旅行天數</div>
                <input type="number" value={activeTrip.tripDays} onChange={e => setTripField('tripDays', Number(e.target.value))} />
              </div>
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
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>預算與匯率 · {activeTrip.name}</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>總預算（日幣）</div>
            <input type="number" value={activeTrip.budget} onChange={e => setTripField('budget', Number(e.target.value))} placeholder="100000" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>匯率（¥1 = NT$?）</div>
            <input type="number" step="0.001" value={activeTrip.exchangeRate} onChange={e => setTripField('exchangeRate', Number(e.target.value))} placeholder="0.206" />
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
