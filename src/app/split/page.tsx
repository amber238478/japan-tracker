'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { getSettings, toTWD } from '@/lib/settings'
import { calcSplit } from '@/lib/split'
import { Receipt } from '@/lib/types'

export default function SplitPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const s = getSettings()

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const split = calcSplit(receipts, s.user1, s.user2)
  const splitReceipts = receipts.filter(r => r.splitWith)

  return (
    <main>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>分帳結算</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>只計算有分帳的消費</div>
      </div>

      <div className="page">
        {/* Result */}
        <div style={{ background: Math.abs(split.balance) < 100 ? 'var(--green-bg)' : 'var(--bg-warm)', border: '0.5px solid', borderColor: Math.abs(split.balance) < 100 ? '#C0DD97' : 'var(--accent-border)', borderLeft: `3px solid ${Math.abs(split.balance) < 100 ? 'var(--green)' : 'var(--accent)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>結算結果</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: Math.abs(split.balance) < 100 ? 'var(--green)' : 'var(--accent)' }}>
            {split.oweText}
          </div>
          {Math.abs(split.balance) >= 100 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              ≈ NT${toTWD(Math.abs(split.balance), s.exchangeRate).toLocaleString()}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { name: s.user1, paid: split.user1Paid, should: split.user1Should, cls: 'avatar-1' },
            { name: s.user2, paid: split.user2Paid, should: split.user2Should, cls: 'avatar-2' },
          ].map(u => (
            <div key={u.name} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div className={`avatar ${u.cls}`}>{u.name.charAt(0)}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>實際付出</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>¥{u.paid.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>應付金額</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>¥{u.should.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Split records */}
        <div className="section-label">分帳明細（{splitReceipts.length} 筆）</div>
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>載入中...</div>}
        {splitReceipts.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-hint)', padding: 30, fontSize: 13 }}>
            還沒有分帳記錄<br />新增收據時選「AA 分帳」即可
          </div>
        )}
        {splitReceipts.map((r, i) => {
          const paidByUser1 = r.paidBy === s.user1
          const u1amt = paidByUser1 ? Math.round(r.amountJPY * r.splitRatio) : Math.round(r.amountJPY * (1 - r.splitRatio))
          const u2amt = r.amountJPY - u1amt
          return (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.items}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.date} · {r.storeName || r.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>¥{r.amountJPY.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)' }}>{r.paidBy} 付</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[[s.user1, u1amt], [s.user2, u2amt]].map(([name, amt]) => (
                  <div key={name as string} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 6, padding: '6px 8px', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{name as string}</span>
                    <span style={{ float: 'right', fontWeight: 500 }}>¥{(amt as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </main>
  )
}
