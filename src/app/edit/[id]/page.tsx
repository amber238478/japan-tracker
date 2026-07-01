'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import { Category, PaymentMethod, Receipt } from '@/lib/types'

const CATEGORIES: Category[] = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const PAYMENTS: PaymentMethod[] = ['現金', '信用卡-星展', '信用卡-熊本熊', 'Suica', 'PayPay', '其他']

export default function EditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const s = getSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Receipt>>({})

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) {
        const found = (d.data as Receipt[]).find(r => r.notionId === id)
        if (found) setForm(found)
        else { alert('找不到這筆紀錄'); router.push('/history') }
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    if (!form.items || !form.amount) return alert('請填寫品項和金額')
    setSaving(true)
    try {
      const amount = Math.round(Number(form.amount))
      const res = await fetch('/api/notion/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: id, data: { ...form, amount } })
      })
      const d = await res.json()
      if (!d.success) { alert('儲存失敗：' + (d.error || '未知錯誤')); return }
      router.push('/history')
    } catch {
      alert('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main style={{ padding: '20px 16px 100px', textAlign: 'center', color: 'var(--text-muted)' }}>載入中...</main>
  }

  return (
    <main style={{ padding: '20px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>編輯紀錄</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>修改後會同步至 Notion</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>品項 *</div>
          <input value={form.items ?? ''} onChange={e => set('items', e.target.value)} placeholder="例：拉麵、啤酒" style={{ marginBottom: 8 }} />
          <input value={form.storeName ?? ''} onChange={e => set('storeName', e.target.value)} placeholder="店名（選填）" />
        </div>

        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>金額 *</div>
              <select value={form.currency ?? 'JPY'} onChange={e => set('currency', e.target.value)} style={{ fontSize: 12 }}>
                <option value="JPY">JPY</option>
                <option value="TWD">TWD</option>
              </select>
            </div>
            <input type="number" value={form.amount ?? ''} onChange={e => set('amount', Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>日期</div>
            <input type="date" value={form.date ?? ''} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>類別</div>
            <select value={form.category ?? '餐飲'} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>支付方式</div>
            <select value={form.paymentMethod ?? '現金'} onChange={e => set('paymentMethod', e.target.value)}>
              {PAYMENTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Split */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>分帳（選填）</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>付款人</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[s.user1, s.user2].map(u => (
                <button key={u} onClick={() => set('paidBy', u)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    borderColor: form.paidBy === u ? 'var(--accent)' : 'var(--border)',
                    background: form.paidBy === u ? 'var(--accent-light)' : 'transparent',
                    color: form.paidBy === u ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => set('splitWith', null)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                borderColor: 'var(--border)', background: form.splitWith === null ? 'var(--bg-surface)' : 'transparent',
                color: form.splitWith === null ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              不分帳
            </button>
            <button onClick={() => set('splitWith', form.paidBy === s.user1 ? s.user2 : s.user1)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                borderColor: form.splitWith !== null ? 'var(--accent)' : 'var(--border)',
                background: form.splitWith !== null ? 'var(--accent-light)' : 'transparent',
                color: form.splitWith !== null ? 'var(--accent)' : 'var(--text-secondary)' }}>
              AA 分帳
            </button>
          </div>
          {form.splitWith !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {form.paidBy} 的比例：{Math.round((form.splitRatio ?? 0.5) * 100)}%
              </div>
              <input type="range" min="0" max="100" step="5"
                value={Math.round((form.splitRatio ?? 0.5) * 100)}
                onChange={e => set('splitRatio', Number(e.target.value) / 100)}
                style={{ width: '100%' }} />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>備註（選填）</div>
          <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="稅制、折扣等..." />
        </div>

        <button className="btn-primary" onClick={save} disabled={saving} style={{ opacity: saving ? 0.5 : 1 }}>
          {saving ? '儲存中...' : '儲存修改'}
        </button>
      </div>
    </main>
  )
}
