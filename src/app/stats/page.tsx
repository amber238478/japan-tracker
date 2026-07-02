'use client'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { getSettings, getActiveTrip, receiptBelongsToTrip } from '@/lib/settings'
import { buildTripReport } from '@/lib/tripReport'
import { attribute } from '@/lib/split'
import { Receipt, Currency } from '@/lib/types'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const CAT_COLORS: Record<string, string> = {
  '餐飲': '#4A7A42', '交通': '#3A6AAA', '購物': '#C4875A',
  '門票': '#7A5AA8', '住宿': '#2A7A9A', '藥品': '#C04040', '代買': '#B38700', '其他': '#A09A90'
}
const PAYMENTS = ['現金', '信用卡-星展', '信用卡-熊本熊', '信用卡', 'Suica', 'PayPay', '其他']

// 合計統計：以原始金額計算，含各人付費小計
function buildCombinedStats(receipts: Receipt[], currency: Currency, user1: string, user2: string) {
  const filtered = receipts.filter(r => r.currency === currency)
  const total = filtered.reduce((a, r) => a + r.amount, 0)
  const byCat = CATEGORIES.map(c => {
    const recs = filtered.filter(r => r.category === c)
    return {
      name: c, color: CAT_COLORS[c],
      amt: recs.reduce((a, r) => a + r.amount, 0),
      user1Amt: recs.filter(r => r.paidBy === user1).reduce((a, r) => a + r.amount, 0),
      user2Amt: recs.filter(r => r.paidBy === user2).reduce((a, r) => a + r.amount, 0),
    }
  }).filter(c => c.amt > 0).sort((a, b) => b.amt - a.amt)
  const byPayment = PAYMENTS.map(p => ({
    name: p, amt: filtered.filter(r => r.paymentMethod === p).reduce((a, r) => a + r.amount, 0)
  })).filter(p => p.amt > 0).sort((a, b) => b.amt - a.amt)
  const top10 = [...filtered].sort((a, b) => b.amount - a.amount).slice(0, 10)
    .map(r => ({ ...r, displayAmt: r.amount }))
  return { total, byCat, byPayment, top10 }
}

// 個人統計：以 attribute 計算，只顯示該人真實應負擔的金額
function buildPersonStats(receipts: Receipt[], currency: Currency, user: string, otherUser: string) {
  const filtered = receipts.filter(r => r.currency === currency)
  const total = filtered.reduce((a, r) => a + attribute(r, user, otherUser)[0], 0)
  const byCat = CATEGORIES.map(c => {
    const amt = filtered.filter(r => r.category === c)
      .reduce((a, r) => a + attribute(r, user, otherUser)[0], 0)
    return amt > 0 ? { name: c, amt, color: CAT_COLORS[c] } : null
  }).filter((c): c is NonNullable<typeof c> => c !== null).sort((a, b) => b.amt - a.amt)
  // 支付方式：只計算該人實際付款的收據（現金流）
  const myPaid = filtered.filter(r => r.paidBy === user)
  const myPaidTotal = myPaid.reduce((a, r) => a + r.amount, 0)
  const byPayment = PAYMENTS.map(p => ({
    name: p, amt: myPaid.filter(r => r.paymentMethod === p).reduce((a, r) => a + r.amount, 0)
  })).filter(p => p.amt > 0).sort((a, b) => b.amt - a.amt)
  // 前十名：依該人歸屬金額排序
  const top10 = filtered
    .map(r => ({ ...r, displayAmt: attribute(r, user, otherUser)[0] }))
    .filter(r => r.displayAmt > 0)
    .sort((a, b) => b.displayAmt - a.displayAmt)
    .slice(0, 10)
  return { total, byCat, byPayment, byPaymentTotal: myPaidTotal, top10 }
}

export default function StatsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const settings = getSettings()
  const trip = getActiveTrip(settings)
  const tripReceipts = receipts.filter(r => receiptBelongsToTrip(r.trip, settings))
  const [tab, setTab] = useState<'user1' | 'user2' | 'all'>('user1')

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const shareReport = async () => {
    const text = buildTripReport(tripReceipts, trip, settings)
    if (navigator.share) {
      try { await navigator.share({ title: `${trip.name} 旅行報表`, text }) } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      alert('報表已複製到剪貼簿')
    } catch {
      alert('複製失敗，請手動截圖分享')
    }
  }

  const tabs = [
    { key: 'user1' as const, label: settings.user1 },
    { key: 'user2' as const, label: settings.user2 },
    { key: 'all' as const, label: '合計' },
  ]

  return (
    <main>
      <div style={{ padding: '20px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>統計分析</div>
        <button onClick={shareReport} disabled={tripReceipts.length === 0}
          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', opacity: tripReceipts.length === 0 ? 0.5 : 1 }}>
          📤 分享報表
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '6px 14px', borderRadius: 10, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              borderColor: tab === t.key ? 'var(--accent)' : 'var(--border)',
              background: tab === t.key ? 'var(--accent-light)' : 'transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page">
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>載入中...</div>}

        {(['JPY', 'TWD'] as Currency[]).map(currency => {
          const symbol = currency === 'JPY' ? '¥' : 'NT$'
          const stats = tab === 'all'
            ? buildCombinedStats(tripReceipts, currency, settings.user1, settings.user2)
            : buildPersonStats(tripReceipts, currency,
                tab === 'user1' ? settings.user1 : settings.user2,
                tab === 'user1' ? settings.user2 : settings.user1)
          if (stats.total === 0) return null

          const paymentTotal = tab === 'all' ? stats.total : (stats as ReturnType<typeof buildPersonStats>).byPaymentTotal

          return (
            <div key={currency}>
              {/* Category */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>
                  分類支出 · {currency}{tab !== 'all' ? '（個人＋分帳後）' : ''}
                </div>
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
                    {tab === 'all' && 'user1Amt' in c && (c.user1Amt > 0 || c.user2Amt > 0) && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {c.user1Amt > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{settings.user1} {symbol}{c.user1Amt.toLocaleString()}</span>}
                        {c.user1Amt > 0 && c.user2Amt > 0 && <span style={{ fontSize: 10, color: 'var(--border)' }}>·</span>}
                        {c.user2Amt > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{settings.user2} {symbol}{c.user2Amt.toLocaleString()}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>
                  支付方式 · {currency}{tab !== 'all' ? '（實際付款）' : ''}
                </div>
                {stats.byPayment.map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border-light)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    <div>
                      <span style={{ fontWeight: 500 }}>{symbol}{p.amt.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{paymentTotal > 0 ? Math.round(p.amt / paymentTotal * 100) : 0}%</span>
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
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{symbol}{r.displayAmt.toLocaleString()}</div>
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
