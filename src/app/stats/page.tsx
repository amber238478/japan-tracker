'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { getSettings } from '@/lib/settings'
import { Receipt, Category, Currency } from '@/lib/types'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '其他']
const CAT_COLORS: Record<string, string> = {
  '餐飲': '#4A7A42', '交通': '#3A6AAA', '購物': '#C4875A',
  '門票': '#7A5AA8', '住宿': '#2A7A9A', '藥品': '#C04040', '其他': '#A09A90'
}

function buildStats(receipts: Receipt[], currency: Currency) {
  const filtered = receipts.filter(r => r.currency === currency)
  const total = filtered.reduce((a, r) => a + r.amount, 0)

  const byCat = CATEGORIES.map(c => ({
    name: c,
    amt: filtered.filter(r => r.category === c).reduce((a, r) => a + r.amount, 0),
    color: CAT_COLORS[c]
  })).filter(c => c.amt > 0).sort((a, b) => b.amt - a.amt)

  const byPayment = ['現金', '信用卡', 'Suica', 'PayPay', '其他'].map(p => ({
    name: p,
    amt: filtered.filter(r => r.paymentMethod === p).reduce((a, r) => a + r.amount, 0)
  })).filter(p => p.amt > 0).sort((a, b) => b.amt - a.amt)

  const top10 = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 10)

  return { total, byCat, byPayment, top10 }
}

export default function StatsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const s = getSettings()

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const jpyStats = buildStats(receipts, 'JPY')
  const twdStats = buildStats(receipts, 'TWD')

  return (
    <main>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>統計分析</div>
      </div>

      <div className="page">
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>載入中...</div>}

        {([['JPY', jpyStats, '¥'], ['TWD', twdStats, 'NT$']] as const)
          .filter(([, stats]) => stats.total > 0)
          .map(([currency, stats, symbol]) => (
            <div key={currency}>
              {/* Category */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>分類支出 · {currency}</div>
                {stats.byCat.map(c => (
                  <div key={c.name} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 500 }}>{symbol}{c.amt.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{stats.total > 0 ? Math.round(c.amt / stats.total * 100) : 0}%</span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div style={{ height: '100%', borderRadius: 2, background: c.color, width: `${stats.total > 0 ? (c.amt / stats.total) * 100 : 0}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>支付方式 · {currency}</div>
                {stats.byPayment.map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border-light)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    <div>
                      <span style={{ fontWeight: 500 }}>{symbol}{p.amt.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{stats.total > 0 ? Math.round(p.amt / stats.total * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top 10 */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>金額前十名 · {currency}</div>
                {stats.top10.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < stats.top10.length - 1 ? '0.5px solid var(--border-light)' : 'none' }}>
                    <div style={{ width: 20, fontSize: 11, color: 'var(--text-hint)', fontWeight: 500, textAlign: 'center' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.items}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.date} · {r.storeName || r.category}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{symbol}{r.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
      <BottomNav />
    </main>
  )
}
