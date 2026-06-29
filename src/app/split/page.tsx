'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { getSettings, receiptBelongsToTrip } from '@/lib/settings'
import { calcSplit } from '@/lib/split'
import { CurrencySplitSummary, Receipt } from '@/lib/types'

export default function SplitPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const s = getSettings()
  const tripReceipts = receipts.filter(r => receiptBelongsToTrip(r.trip, s))

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const split = calcSplit(tripReceipts, s.user1, s.user2)
  const splitReceipts = tripReceipts.filter(r => r.splitWith)
  const currencies = (['JPY', 'TWD'] as const).filter(c => splitReceipts.some(r => r.currency === c))

  // 各自真實花費：個人支出（沒有分帳，全額算自己的）+ 分帳後該負責的份額
  const payerCurrencies = (['JPY', 'TWD'] as const).filter(c => tripReceipts.some(r => r.currency === c))
  const payerTotals = payerCurrencies.map(c => {
    const recs = tripReceipts.filter(r => r.currency === c)
    const soloRecs = recs.filter(r => !r.splitWith)
    const soloUser1 = soloRecs.filter(r => r.paidBy === s.user1).reduce((a, r) => a + r.amount, 0)
    const soloUser2 = soloRecs.filter(r => r.paidBy === s.user2).reduce((a, r) => a + r.amount, 0)
    const cs = split[c]
    const user1Total = soloUser1 + cs.user1Should
    const user2Total = soloUser2 + cs.user2Should
    return { c, user1Total, user2Total }
  })

  return (
    <main>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>分帳結算</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>結算金額只計算有標記分帳的消費，各自真實花費則是個人支出＋分帳後的份額</div>
      </div>

      <div className="page">
        {/* 各自真實花費：個人支出 + 分帳後份額 */}
        {payerCurrencies.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-label">各自真實花費（個人支出＋分帳後）</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { name: s.user1, cls: 'avatar-1', key: 'user1Total' as const },
                { name: s.user2, cls: 'avatar-2', key: 'user2Total' as const },
              ].map(u => (
                <div key={u.name} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div className={`avatar ${u.cls}`}>{u.name.charAt(0)}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                  </div>
                  {payerTotals.map(({ c, ...t }) => {
                    const symbol = c === 'JPY' ? '¥' : 'NT$'
                    return (
                      <div key={c} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{c}</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{symbol}{t[u.key].toLocaleString()}</div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {currencies.length === 0 && !loading && (
          <div style={{ background: 'var(--green-bg)', border: '0.5px solid #C0DD97', borderLeft: '3px solid var(--green)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>結算結果</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--green)' }}>還沒有分帳記錄</div>
          </div>
        )}
        {currencies.map(c => {
          const cs = split[c]
          const symbol = c === 'JPY' ? '¥' : 'NT$'
          const threshold = c === 'JPY' ? 100 : 30
          const settled = Math.abs(cs.balance) < threshold
          return (
            <div key={c} style={{ background: settled ? 'var(--green-bg)' : 'var(--bg-warm)', border: '0.5px solid', borderColor: settled ? '#C0DD97' : 'var(--accent-border)', borderLeft: `3px solid ${settled ? 'var(--green)' : 'var(--accent)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6 }}>結算結果 · {c}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: settled ? 'var(--green)' : 'var(--accent)' }}>
                {cs.oweText}
              </div>
            </div>
          )
        })}

        {/* Stats */}
        {currencies.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { name: s.user1, cls: 'avatar-1', key: 'user1Paid' as const, shouldKey: 'user1Should' as const },
              { name: s.user2, cls: 'avatar-2', key: 'user2Paid' as const, shouldKey: 'user2Should' as const },
            ].map(u => (
              <div key={u.name} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div className={`avatar ${u.cls}`}>{u.name.charAt(0)}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                </div>
                {currencies.map(c => {
                  const cs: CurrencySplitSummary = split[c]
                  const symbol = c === 'JPY' ? '¥' : 'NT$'
                  return (
                    <div key={c} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>實際付出（{c}）</div>
                      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{symbol}{cs[u.key].toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>應付金額（{c}）</div>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{symbol}{cs[u.shouldKey].toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Split records */}
        <div className="section-label">分帳明細（{splitReceipts.length} 筆）</div>
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>載入中...</div>}
        {splitReceipts.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-hint)', padding: 30, fontSize: 13 }}>
            還沒有分帳記錄<br />新增收據時選「AA 分帳」即可
          </div>
        )}
        {splitReceipts.map((r, i) => {
          const symbol = r.currency === 'TWD' ? 'NT$' : '¥'
          const paidByUser1 = r.paidBy === s.user1
          const u1amt = paidByUser1 ? Math.round(r.amount * r.splitRatio) : Math.round(r.amount * (1 - r.splitRatio))
          const u2amt = r.amount - u1amt
          return (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.items}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.date} · {r.storeName || r.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{symbol}{r.amount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)' }}>{r.paidBy} 付</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[[s.user1, u1amt], [s.user2, u2amt]].map(([name, amt]) => (
                  <div key={name as string} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 6, padding: '6px 8px', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{name as string}</span>
                    <span style={{ float: 'right', fontWeight: 500 }}>{symbol}{(amt as number).toLocaleString()}</span>
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
