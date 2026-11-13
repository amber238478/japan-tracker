'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import { Category, PaymentMethod, Receipt } from '@/lib/types'
import { markReceiptsDirty } from '@/lib/fetchReceipts'
import { LineItemsEditor } from '@/components/LineItems'
import { isItemMode, withShares, withoutShares, recalc } from '@/lib/itemShare'
import SplitShare from '@/components/SplitShare'
import { catLabel } from '@/lib/categories'
import { compressForStorage } from '@/lib/image'

const CATEGORIES: Category[] = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const PAYMENTS: PaymentMethod[] = ['現金', '信用卡-星展', '信用卡-熊本熊', 'Suica', 'PayPay', '其他']

export default function EditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const s = getSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  // 附上／更換收據照片：壓縮後直接上傳到 Notion
  const uploadPhoto = async (file: File) => {
    setPhotoBusy(true)
    try {
      const { base64 } = await compressForStorage(file)
      const res = await fetch('/api/notion/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionId: id, photo: base64, filename: `${form.date || 'receipt'}-${(form.storeName || 'receipt').slice(0, 20)}.jpg` }),
      })
      const d = await res.json()
      if (!d.success) { alert('照片上傳失敗：' + (d.error || '未知錯誤')); return }
      markReceiptsDirty()
      setForm(f => ({ ...f, photoUrl: `data:image/jpeg;base64,${base64}` }))
    } catch {
      alert('照片上傳失敗，請重試')
    } finally {
      setPhotoBusy(false)
    }
  }
  const [form, setForm] = useState<Partial<Receipt>>({})

  useEffect(() => {
    fetch(`/api/notion/update?id=${encodeURIComponent(id)}`, { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (d.success && d.data) {
        const r = d.data as Receipt
        // 舊資料若分帳對象跟付款人是同一人，自動改成另一人
        if (r.splitWith && r.splitWith === r.paidBy) r.splitWith = r.paidBy === s.user1 ? s.user2 : s.user1
        setForm(r)
      }
      else { alert('找不到這筆紀錄'); router.push('/history') }
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
        body: JSON.stringify({ notionId: id, data: { ...form, amount, photoUrl: undefined } })
      })
      const d = await res.json()
      if (!d.success) { alert('儲存失敗：' + (d.error || '未知錯誤')); return }
      markReceiptsDirty()
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
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {form.photoUrl
            ? <a href={form.photoUrl} target="_blank" rel="noreferrer"><img src={form.photoUrl} alt="收據照片" style={{ width: 56, height: 72, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--border)' }} /></a>
            : <div style={{ width: 56, height: 72, borderRadius: 6, border: '0.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-hint)' }}>📷</div>}
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            {form.photoUrl ? '已有收據照片' : '還沒有收據照片'}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>會自動壓縮後存到 Notion</div>
          </div>
          <button onClick={() => photoRef.current?.click()} disabled={photoBusy}
            style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: photoBusy ? 0.5 : 1 }}>
            {photoBusy ? '上傳中…' : form.photoUrl ? '更換' : '附上照片'}
          </button>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadPhoto(f) }} />
        </div>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>品項 *</div>
          <input value={form.items ?? ''} onChange={e => set('items', e.target.value)} placeholder="例：拉麵、啤酒" style={{ marginBottom: 8 }} />
          <input value={form.storeName ?? ''} onChange={e => set('storeName', e.target.value)} placeholder="店名（選填）" />
        </div>

        <LineItemsEditor items={form.lineItems ?? []} onChange={v => setForm((f: any) => recalc({ ...f, lineItems: v }, s.user1))} total={Number(form.amount) || 0} currency={form.currency} fallbackNames={form.items} shareUsers={form.splitWith != null && isItemMode(form.lineItems) ? [s.user1, s.user2] : null} />

        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>金額 *</div>
              <select value={form.currency ?? 'JPY'} onChange={e => set('currency', e.target.value)} style={{ fontSize: 12 }}>
                <option value="JPY">JPY</option>
                <option value="TWD">TWD</option>
              </select>
            </div>
            <input type="number" value={form.amount ?? ''} onChange={e => { const v = Number(e.target.value); setForm((f: any) => recalc({ ...f, amount: v }, s.user1)) }} placeholder="0" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>日期</div>
            <input type="date" value={form.date ?? ''} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

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

        {/* Split */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>分帳（選填）</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>付款人</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[s.user1, s.user2].map(u => (
                <button key={u} onClick={() => setForm((f: any) => recalc({ ...f, paidBy: u, splitWith: f.splitWith == null ? f.splitWith : (u === s.user1 ? s.user2 : s.user1) }, s.user1))}
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
            <button onClick={() => setForm((f: any) => ({ ...f, splitWith: null, lineItems: f.lineItems ? withoutShares(f.lineItems) : f.lineItems }))}
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
          {form.splitWith !== null && (form.lineItems?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
              <span>依品項分帳</span>
              <button onClick={() => setForm((f: any) => isItemMode(f.lineItems)
                  ? { ...f, lineItems: withoutShares(f.lineItems) }
                  : recalc({ ...f, lineItems: withShares(f.lineItems) }, s.user1))}
                aria-label="依品項分帳"
                style={{ width: 46, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
                  background: isItemMode(form.lineItems) ? 'var(--accent)' : '#D9D9E3' }}>
                <span style={{ position: 'absolute', top: 3, left: isItemMode(form.lineItems) ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,.2)', transition: 'left .15s' }} />
              </button>
            </div>
          )}
          {form.splitWith !== null && (
            <SplitShare users={[s.user1, s.user2]} total={Number(form.amount) || 0} ratio={form.splitRatio ?? 0.5} paidBy={form.paidBy} splitWith={form.splitWith} currency={form.currency} onChange={v => setForm((f: any) => ({ ...f, splitRatio: v, lineItems: isItemMode(f.lineItems) ? withoutShares(f.lineItems) : f.lineItems }))} />
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
