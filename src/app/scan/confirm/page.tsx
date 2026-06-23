'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import { Category, PaymentMethod, Receipt } from '@/lib/types'

const CATEGORIES: Category[] = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '其他']
const PAYMENTS: PaymentMethod[] = ['現金', '信用卡', 'Suica', 'PayPay', '其他']

export default function ConfirmPage() {
  const router = useRouter()
  const s = getSettings()
  const [form, setForm] = useState<Partial<Receipt>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('scanned-receipt')
    if (!raw) { router.push('/scan'); return }
    const data = JSON.parse(raw)
    setForm({
      ...data,
      amount: data.amountJPY ?? data.amount ?? 0,
      currency: 'JPY',
      paidBy: s.user1,
      splitWith: null,
      splitRatio: 0.5,
      date: data.date || new Date().toISOString().split('T')[0],
    })
  }, [])

  const set = (key: keyof Receipt, val: any) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      sessionStorage.removeItem('scanned-receipt')
      router.push('/')
    } catch {
      alert('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ padding: '20px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>確認收據內容</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>請確認或修改辨識結果</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Store */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>店家</div>
          <input value={form.storeName ?? ''} onChange={e => set('storeName', e.target.value)} placeholder="店名（中文）" style={{ marginBottom: 8 }} />
          <input value={form.storeNameJa ?? ''} onChange={e => set('storeNameJa', e.target.value)} placeholder="店名（日文）" />
        </div>

        {/* Items */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>品項</div>
          <textarea value={form.items ?? ''} onChange={e => set('items', e.target.value)} placeholder="品項（中文）" rows={2} style={{ marginBottom: 8 }} />
          <textarea value={form.itemsJa ?? ''} onChange={e => set('itemsJa', e.target.value)} placeholder="品項（日文）" rows={2} />
        </div>

        {/* Amount & Date */}
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>金額（日幣）</div>
            <input type="number" value={form.amount ?? ''} onChange={e => set('amount', Number(e.target.value))} placeholder="0" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>日期</div>
            <input type="date" value={form.date ?? ''} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        {/* Category & Payment */}
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

        {/* Split section */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>分帳（選填）</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>付款人</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[s.user1, s.user2].map(u => (
                <button key={u}
                  onClick={() => set('paidBy', u)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid',
                    borderColor: form.paidBy === u ? 'var(--accent)' : 'var(--border)',
                    background: form.paidBy === u ? 'var(--accent-light)' : 'transparent',
                    color: form.paidBy === u ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>是否分帳？</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => set('splitWith', null)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid',
                  borderColor: form.splitWith === null ? 'var(--border)' : 'var(--border)',
                  background: form.splitWith === null ? 'var(--bg-surface)' : 'transparent',
                  color: form.splitWith === null ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                不分帳
              </button>
              <button onClick={() => set('splitWith', form.paidBy === s.user1 ? s.user2 : s.user1)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: '0.5px solid',
                  borderColor: form.splitWith !== null ? 'var(--accent)' : 'var(--border)',
                  background: form.splitWith !== null ? 'var(--accent-light)' : 'transparent',
                  color: form.splitWith !== null ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                AA 分帳
              </button>
            </div>
          </div>

          {form.splitWith !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {form.paidBy} 的分擔比例：{Math.round((form.splitRatio ?? 0.5) * 100)}%
              </div>
              <input type="range" min="0" max="100" step="5"
                value={Math.round((form.splitRatio ?? 0.5) * 100)}
                onChange={e => set('splitRatio', Number(e.target.value) / 100)}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>
                <span>{form.paidBy}: ¥{Math.round((form.amount ?? 0) * (form.splitRatio ?? 0.5)).toLocaleString()}</span>
                <span>{form.splitWith}: ¥{Math.round((form.amount ?? 0) * (1 - (form.splitRatio ?? 0.5))).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>備註（選填）</div>
          <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="稅制、折扣等..." />
        </div>

        <button className="btn-primary" onClick={save} disabled={saving} style={{ opacity: saving ? 0.5 : 1 }}>
          {saving ? '儲存中...' : '確認儲存，同步至 Notion'}
        </button>
      </div>
    </main>
  )
}
