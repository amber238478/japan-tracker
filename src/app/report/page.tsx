'use client'
import { useEffect, useState } from 'react'
import { getSettings, getActiveTrip, receiptBelongsToTrip } from '@/lib/settings'
import { calcSplit, attribute } from '@/lib/split'
import { Receipt } from '@/lib/types'

const CATEGORIES = ['餐飲', '交通', '購物', '門票', '住宿', '藥品', '代買', '其他']
const CAT_COLORS: Record<string, string> = {
  '餐飲': '#4A7A42', '交通': '#3A6AAA', '購物': '#C4875A',
  '門票': '#7A5AA8', '住宿': '#2A7A9A', '藥品': '#C04040', '代買': '#B38700', '其他': '#A09A90'
}

function PersonSection({ name, recs, otherName }: { name: string; recs: Receipt[]; otherName: string }) {
  const jpy = recs.filter(r => r.currency !== 'TWD')
  const twd = recs.filter(r => r.currency === 'TWD')
  const total = (c: Receipt[]) => c.reduce((a, r) => a + attribute(r, name, otherName)[0], 0)
  const jpyTotal = total(jpy)
  const twdTotal = total(twd)

  const catRows = (receipts: Receipt[], grand: number) =>
    CATEGORIES.map(c => {
      const amt = receipts.filter(r => r.category === c)
        .reduce((a, r) => a + attribute(r, name, otherName)[0], 0)
      return amt > 0 ? { name: c, amt, pct: grand > 0 ? Math.round(amt / grand * 100) : 0, color: CAT_COLORS[c] } : null
    }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.amt - a.amt)

  const jpyCats = catRows(jpy, jpyTotal)
  const twdCats = catRows(twd, twdTotal)
  if (jpyTotal === 0 && twdTotal === 0) return null

  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
        {name} 的支出
      </h3>
      <div style={{ display: 'flex', gap: 20, marginBottom: 8, fontSize: 11, color: '#333' }}>
        {jpyTotal > 0 && <span>日幣 <strong>¥{jpyTotal.toLocaleString()}</strong></span>}
        {twdTotal > 0 && <span>台幣 <strong>NT${twdTotal.toLocaleString()}</strong></span>}
      </div>
      {jpyCats.length > 0 && <CatTable rows={jpyCats} symbol="¥" />}
      {twdCats.length > 0 && <CatTable rows={twdCats} symbol="NT$" style={{ marginTop: 6 }} />}
    </section>
  )
}

function CatTable({ rows, symbol, style: s }: { rows: { name: string; amt: number; pct: number; color: string }[]; symbol: string; style?: React.CSSProperties }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, ...s }}>
      <tbody>
        {rows.map(r => (
          <tr key={r.name}>
            <td style={{ padding: '3px 0', width: 36, color: '#444', whiteSpace: 'nowrap' }}>{r.name}</td>
            <td style={{ padding: '3px 8px', width: '55%' }}>
              <div style={{ background: '#f0f0f0', borderRadius: 2, height: 5 }}>
                <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 2, background: r.color }} />
              </div>
            </td>
            <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{symbol}{r.amt.toLocaleString()}</td>
            <td style={{ padding: '3px 0 3px 6px', color: '#999', width: 32 }}>{r.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ReportPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const settings = getSettings()
  const trip = getActiveTrip(settings)
  const tripReceipts = receipts.filter(r => receiptBelongsToTrip(r.trip, settings))

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const tripEnd = new Date(trip.tripStart)
  tripEnd.setDate(tripEnd.getDate() + trip.tripDays - 1)
  const tripEndStr = tripEnd.toISOString().split('T')[0]

  const jpy = tripReceipts.filter(r => r.currency !== 'TWD')
  const twd = tripReceipts.filter(r => r.currency === 'TWD')
  const jpyTotal = jpy.reduce((a, r) => a + r.amount, 0)
  const twdTotal = twd.reduce((a, r) => a + r.amount, 0)

  const split = calcSplit(tripReceipts, settings.user1, settings.user2)
  const showJpy = Math.abs(split.JPY.balance) >= 100
  const showTwd = Math.abs(split.TWD.balance) >= 30

  const PAYMENTS = ['現金', '信用卡-星展', '信用卡-熊本熊', '信用卡', 'Suica', 'PayPay', '其他']
  const payRows = PAYMENTS.map(p => ({
    name: p,
    amt: jpy.filter(r => r.paymentMethod === p).reduce((a, r) => a + r.amount, 0)
  })).filter(p => p.amt > 0).sort((a, b) => b.amt - a.amt)

  const sorted = [...tripReceipts].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 14mm 14mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
          section { page-break-inside: avoid; }
        }
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
      `}</style>

      {/* 列印/返回按鈕（不列印） */}
      <div className="no-print" style={{ display: 'flex', gap: 10, padding: '16px 20px', borderBottom: '0.5px solid #eee', background: '#fafaf8' }}>
        <button onClick={() => history.back()}
          style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}>
          ← 返回
        </button>
        <button onClick={() => window.print()}
          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#B07040', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          列印 / 儲存 PDF
        </button>
        {loading && <span style={{ fontSize: 12, color: '#999', alignSelf: 'center' }}>載入中...</span>}
      </div>

      {/* 報表本體 */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 24px 40px', fontSize: 11, color: '#222', lineHeight: 1.6 }}>

        {/* 標題 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{trip.name} 旅行帳單</h1>
          <div style={{ fontSize: 11, color: '#888' }}>{trip.tripStart} ～ {tripEndStr}　{trip.tripDays} 天　共 {tripReceipts.length} 筆紀錄</div>
        </div>

        {/* 旅程總支出 */}
        <section style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            旅程總支出
          </h3>
          <div style={{ display: 'flex', gap: 32, fontSize: 13 }}>
            {jpyTotal > 0 && <div>日幣<br /><strong style={{ fontSize: 17 }}>¥{jpyTotal.toLocaleString()}</strong></div>}
            {twdTotal > 0 && <div>台幣<br /><strong style={{ fontSize: 17 }}>NT${twdTotal.toLocaleString()}</strong></div>}
          </div>
        </section>

        {/* 各自支出 */}
        <PersonSection name={settings.user1} recs={tripReceipts} otherName={settings.user2} />
        <PersonSection name={settings.user2} recs={tripReceipts} otherName={settings.user1} />

        {/* 分帳結算 */}
        {(showJpy || showTwd) && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
              分帳結算
            </h3>
            {showJpy && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{split.JPY.oweText}</div>}
            {showTwd && <div style={{ fontSize: 13, fontWeight: 500 }}>{split.TWD.oweText}</div>}
          </section>
        )}

        {/* 支付方式 */}
        {payRows.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
              支付方式（JPY）
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <tbody>
                {payRows.map(p => (
                  <tr key={p.name}>
                    <td style={{ padding: '3px 0', width: 90, color: '#444' }}>{p.name}</td>
                    <td style={{ padding: '3px 8px', width: '50%' }}>
                      <div style={{ background: '#f0f0f0', borderRadius: 2, height: 5 }}>
                        <div style={{ width: `${jpyTotal > 0 ? Math.round(p.amt / jpyTotal * 100) : 0}%`, height: '100%', borderRadius: 2, background: '#B07040' }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>¥{p.amt.toLocaleString()}</td>
                    <td style={{ padding: '3px 0 3px 6px', color: '#999', width: 32 }}>{jpyTotal > 0 ? Math.round(p.amt / jpyTotal * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 完整明細 */}
        <div className="page-break" />
        <section>
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
            完整消費明細
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5 }}>
            <thead>
              <tr style={{ background: '#f5f3f0' }}>
                {['日期', '分類', '品項', '店名', '付款人', '支付方式', '金額'].map(h => (
                  <th key={h} style={{ padding: '5px 6px', textAlign: h === '金額' ? 'right' : 'left', fontWeight: 600, color: '#555', borderBottom: '0.5px solid #ddd', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8' }}>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#666' }}>{r.date}</td>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.category}</td>
                  <td style={{ padding: '4px 6px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items}</td>
                  <td style={{ padding: '4px 6px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>{r.storeName}</td>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.paidBy}</td>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', color: '#666' }}>{r.paymentMethod}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {r.currency === 'TWD' ? 'NT$' : '¥'}{r.amount.toLocaleString()}
                    {r.splitWith && <span style={{ fontSize: 8.5, color: '#B07040', marginLeft: 3 }}>AA</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
