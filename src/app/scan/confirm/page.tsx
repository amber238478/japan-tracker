'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, getActiveTrip } from '@/lib/settings'
import { Category, PaymentMethod, Receipt } from '@/lib/types'
import { markReceiptsDirty } from '@/lib/fetchReceipts'
import { LineItemsEditor } from '@/components/LineItems'
import SplitShare from '@/components/SplitShare'
import { catLabel } from '@/lib/categories'

const CATEGORIES: Category[] = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const PAYMENTS: PaymentMethod[] = ['現金', '信用卡-星展', '信用卡-熊本熊', 'Suica', 'PayPay', '其他']

export default function ConfirmPage() {
  const router = useRouter()
  const s = getSettings()
  const trip = getActiveTrip(s)
  const [form, setForm] = useState<Partial<Receipt>>({ splitWith: null, splitRatio: 0.5 })
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<{ model: string; ms: number } | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('scanned-receipt')
    if (!raw) { router.push('/scan'); return }
    const data = JSON.parse(raw)
    try { const m = sessionStorage.getItem('scanned-meta'); if (m) setMeta(JSON.parse(m)) } catch {}
    setForm({
      ...data,
      amount: data.amountJPY ?? data.amount ?? 0,
      currency: 'JPY',
      paidBy: s.user1,
      splitWith: null,
      splitRatio: 0.5,
      date: data.date || new Date().toISOString().split('T')[0],
      trip: trip.name,
      lineItems: Array.isArray(data.lineItems)
        ? data.lineItems
            .filter((x: any) => x && (x.name || x.nameJa))
            .map((x: any) => ({ name: x.name || x.nameJa, nameJa: x.nameJa ?? '', qty: Number(x.qty) || 1, price: Math.round(Number(x.price)) || 0 }))
        : [],
    })
  }, [])

  const set = (key: keyof Receipt, val: any) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const d = await res.json()
      if (!d.success) { alert('儲存失敗：' + (d.error || '未知錯誤')); return }
      markReceiptsDirty()
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
          {meta && <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>AI 辨識 {(meta.ms / 1000).toFixed(1)} 秒 · {meta.model}</div>}
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

        <LineItemsEditor items={form.lineItems ?? []} onChange={v => set('lineItems', v)} total={Number(form.amount) || 0} currency={form.currency} fallbackNames={form.items} />

        {/* Amount & Date */}
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
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
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>類別</div>
            <select value={form.category ?? '餐飲'} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>支付方式</div>
            <select value={form.paymentMethod ?? '現金'} onChange={e => set('paymentMethod', e.target.value)}>
              {PAYMENTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {form.category === '代買' && (
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>代買對象</div>
            <input value={form.proxyFor ?? ''} onChange={e => set('proxyFor', e.target.value)} placeholder="幫誰買？（例：媽媽）" />
          </div>
        )}

        {/* Split section */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>分帳（選填）</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>付款人</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[s.user1, s.user2].map(u => (
                <button key={u}
                  onClick={() => setForm((f: any) => ({ ...f, paidBy: u, splitWith: f.splitWith == null ? f.splitWith : (u === s.user1 ? s.user2 : s.user1) }))}
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
            <SplitShare users={[s.user1, s.user2]} total={Number(form.amount) || 0} ratio={form.splitRatio ?? 0.5} paidBy={form.paidBy} splitWith={form.splitWith} currency={form.currency} onChange={v => set('splitRatio', v)} />
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
