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

  const catRows = (receipts: Receipt[], grand: number): CatRow[] =>
    CATEGORIES.map(c => {
      const raw = receipts.filter(r => r.category === c)
        .reduce((a, r) => a + attribute(r, name, otherName)[0], 0)
      const amt = Math.abs(raw)
      const isDeduction = c === '代買'
      return amt > 0 ? { name: c, amt, pct: grand > 0 ? Math.round(amt / grand * 100) : 0, color: CAT_COLORS[c], isDeduction } : null
    }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => (a.isDeduction ? 1 : 0) - (b.isDeduction ? 1 : 0) || b.amt - a.amt)

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

type CatRow = { name: string; amt: number; pct: number; color: string; isDeduction?: boolean }

function CatTable({ rows, symbol, style: s }: { rows: CatRow[]; symbol: string; style?: React.CSSProperties }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed', ...s }}>
      <colgroup>
        <col style={{ width: 36 }} />
        <col style={{ width: '55%' }} />
        <col />
        <col style={{ width: 32 }} />
      </colgroup>
      <tbody>
        {rows.map(r => (
          <tr key={r.name}>
            <td style={{ padding: '3px 0', color: r.isDeduction ? '#aaa' : '#444', whiteSpace: 'nowrap' }}>{r.isDeduction ? '↩ ' : ''}{r.name}</td>
            <td style={{ padding: '3px 8px' }}>
              <div style={{ background: '#f0f0f0', borderRadius: 2, height: 5 }}>
                <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 2, background: r.isDeduction ? '#ccc' : r.color }} />
              </div>
            </td>
            <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap', color: r.isDeduction ? '#aaa' : undefined }}>
              {r.isDeduction ? '−' : ''}{symbol}{r.amt.toLocaleString()}
            </td>
            <td style={{ padding: '3px 0 3px 6px', color: '#999', whiteSpace: 'nowrap' }}>{r.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function buildCombinedCats(receipts: Receipt[], currency: string): CatRow[] {
  const filtered = receipts.filter(r => r.currency === currency)
  const grossTotal = filtered.filter(r => r.category !== '代買').reduce((a, r) => a + r.amount, 0)
  const rows = CATEGORIES.map(c => {
    const amt = filtered.filter(r => r.category === c).reduce((a, r) => a + r.amount, 0)
    if (amt === 0) return null
    const isDeduction = c === '代買'
    return { name: c, amt, pct: grossTotal > 0 ? Math.round(amt / grossTotal * 100) : 0, color: CAT_COLORS[c], isDeduction } as CatRow
  }).filter((r): r is CatRow => r !== null)
  return rows.sort((a, b) => (a.isDeduction ? 1 : 0) - (b.isDeduction ? 1 : 0) || b.amt - a.amt)
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
  const jpyTotal = jpy.reduce((a, r) => a + (r.category === '代買' ? -r.amount : r.amount), 0)
  const twdTotal = twd.reduce((a, r) => a + (r.category === '代買' ? -r.amount : r.amount), 0)

  const split = calcSplit(tripReceipts, settings.user1, settings.user2)
  const showJpy = Math.abs(split.JPY.balance) >= 100
  const showTwd = Math.abs(split.TWD.balance) >= 30

  const PAYMENTS = ['現金', '信用卡-星展', '信用卡-熊本熊', '信用卡', 'Suica', 'PayPay', '其他']
  const payRows = PAYMENTS.map(p => ({
    name: p,
    amt: jpy.filter(r => r.paymentMethod === p && r.category !== '代買').reduce((a, r) => a + r.amount, 0)
  })).filter(p => p.amt > 0).sort((a, b) => b.amt - a.amt)

  const combinedJpyCats = buildCombinedCats(tripReceipts, 'JPY')
  const combinedTwdCats = buildCombinedCats(tripReceipts, 'TWD')
  const grossJpy = jpy.filter(r => r.category !== '代買').reduce((a, r) => a + r.amount, 0)
  const grossTwd = twd.filter(r => r.category !== '代買').reduce((a, r) => a + r.amount, 0)
  const proxyJpy = jpy.filter(r => r.category === '代買').reduce((a, r) => a + r.amount, 0)
  const proxyTwd = twd.filter(r => r.category === '代買').reduce((a, r) => a + r.amount, 0)
  const top10jpy = [...jpy].filter(r => r.category !== '代買').sort((a, b) => b.amount - a.amount).slice(0, 10)
  const top10twd = [...twd].filter(r => r.category !== '代買').sort((a, b) => b.amount - a.amount).slice(0, 10)

  const sorted = [...tripReceipts].sort((a, b) => a.date.localeCompare(b.date))

  const downloadHtml = () => {
    const catTableHtml = (rows: CatRow[], symbol: string) => rows.map(r => `
      <tr>
        <td style="padding:3px 0;color:${r.isDeduction ? '#aaa' : '#444'};white-space:nowrap">${r.isDeduction ? '↩ ' : ''}${r.name}</td>
        <td style="padding:3px 8px;width:55%">
          <div style="background:#f0f0f0;border-radius:2px;height:5px">
            <div style="width:${r.pct}%;height:100%;border-radius:2px;background:${r.isDeduction ? '#ccc' : r.color}"></div>
          </div>
        </td>
        <td style="padding:3px 0;text-align:right;font-weight:500;white-space:nowrap;color:${r.isDeduction ? '#aaa' : 'inherit'}">${r.isDeduction ? '−' : ''}${symbol}${r.amt.toLocaleString()}</td>
        <td style="padding:3px 0 3px 6px;color:#999;white-space:nowrap">${r.pct}%</td>
      </tr>`).join('')

    const top10Html = (items: Receipt[], symbol: string) => items.map((r, i) => `
      <tr style="border-bottom:0.5px solid #f0f0f0">
        <td style="padding:4px 0;width:20px;color:#aaa;font-weight:500">${i + 1}</td>
        <td style="padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.items}</td>
        <td style="padding:4px 0;color:#888;white-space:nowrap;font-size:9px">${r.date} · ${r.storeName || r.category}</td>
        <td style="padding:4px 0;text-align:right;font-weight:500;white-space:nowrap">${symbol}${r.amount.toLocaleString()}</td>
      </tr>`).join('')

    const detailRows = sorted.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? 'white' : '#fafaf8'}">
        <td>${r.date}</td>
        <td>${r.category}</td>
        <td>${r.items}</td>
        <td>${r.category === '代買' && r.proxyFor ? `→ ${r.proxyFor}` : (r.storeName || '')}</td>
        <td>${r.paidBy}</td>
        <td>${r.paymentMethod}</td>
        <td style="text-align:right;font-weight:500">${r.currency === 'TWD' ? 'NT$' : '¥'}${r.amount.toLocaleString()}${r.splitWith ? ' <span style="font-size:8px;color:#B07040">AA</span>' : ''}${r.category === '代買' ? ' <span style="font-size:8px;color:#B38700">↩</span>' : ''}</td>
      </tr>`).join('')

    const payRowsHtml = payRows.map(p => `
      <tr>
        <td style="padding:3px 0;width:90px;color:#444">${p.name}</td>
        <td style="padding:3px 8px;width:50%">
          <div style="background:#f0f0f0;border-radius:2px;height:5px">
            <div style="width:${grossJpy > 0 ? Math.round(p.amt / grossJpy * 100) : 0}%;height:100%;border-radius:2px;background:#B07040"></div>
          </div>
        </td>
        <td style="text-align:right;font-weight:500">¥${p.amt.toLocaleString()}</td>
        <td style="padding:3px 0 3px 6px;color:#999;width:32px">${grossJpy > 0 ? Math.round(p.amt / grossJpy * 100) : 0}%</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${trip.name} 旅行帳單</title>
<style>
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #222; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  h3 { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #666; border-bottom: 0.5px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed; }
  th { padding: 5px 6px; text-align: left; font-weight: 600; color: #555; border-bottom: 0.5px solid #ddd; white-space: nowrap; overflow: hidden; }
  td { padding: 4px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media print {
    @page { size: A4; margin: 14mm 14mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div style="margin-bottom:20px">
  <h1>${trip.name} 旅行帳單</h1>
  <div style="font-size:11px;color:#888">${trip.tripStart} ～ ${tripEndStr}　${trip.tripDays} 天　共 ${tripReceipts.length} 筆紀錄</div>
</div>

<section style="margin-bottom:18px">
  <h3>旅程總支出</h3>
  <div style="display:flex;gap:32px;font-size:13px">
    ${grossJpy > 0 ? `<div>日幣<br><strong style="font-size:17px">¥${jpyTotal.toLocaleString()}</strong>${proxyJpy > 0 ? `<div style="font-size:10px;color:#aaa;margin-top:3px">毛額 ¥${grossJpy.toLocaleString()} · 代買 −¥${proxyJpy.toLocaleString()}</div>` : ''}</div>` : ''}
    ${grossTwd > 0 ? `<div>台幣<br><strong style="font-size:17px">NT$${twdTotal.toLocaleString()}</strong>${proxyTwd > 0 ? `<div style="font-size:10px;color:#aaa;margin-top:3px">毛額 NT$${grossTwd.toLocaleString()} · 代買 −NT$${proxyTwd.toLocaleString()}</div>` : ''}</div>` : ''}
  </div>
</section>

${combinedJpyCats.length > 0 || combinedTwdCats.length > 0 ? `
<section style="margin-bottom:18px">
  <h3>合計分類支出</h3>
  ${combinedJpyCats.length > 0 ? `<table style="table-layout:fixed;margin-bottom:6px"><tbody>${catTableHtml(combinedJpyCats, '¥')}</tbody></table>` : ''}
  ${combinedTwdCats.length > 0 ? `<table style="table-layout:fixed"><tbody>${catTableHtml(combinedTwdCats, 'NT$')}</tbody></table>` : ''}
</section>` : ''}

${(showJpy || showTwd) ? `
<section style="margin-bottom:18px">
  <h3>分帳結算</h3>
  ${showJpy ? `<div style="font-size:13px;font-weight:500;margin-bottom:4px">${split.JPY.oweText}</div>` : ''}
  ${showTwd ? `<div style="font-size:13px;font-weight:500">${split.TWD.oweText}</div>` : ''}
</section>` : ''}

${payRows.length > 0 ? `
<section style="margin-bottom:18px">
  <h3>支付方式（JPY）</h3>
  <table style="table-layout:auto"><tbody>${payRowsHtml}</tbody></table>
</section>` : ''}

${top10jpy.length > 0 ? `
<section style="margin-bottom:18px">
  <h3>前十名消費（JPY）</h3>
  <table style="table-layout:auto"><tbody>${top10Html(top10jpy, '¥')}</tbody></table>
</section>` : ''}

${top10twd.length > 0 ? `
<section style="margin-bottom:18px">
  <h3>前十名消費（TWD）</h3>
  <table style="table-layout:auto"><tbody>${top10Html(top10twd, 'NT$')}</tbody></table>
</section>` : ''}

<section>
  <h3>完整消費明細</h3>
  <table>
    <colgroup>
      <col style="width:11%"><col style="width:8%"><col style="width:28%"><col style="width:18%"><col style="width:8%"><col style="width:14%"><col style="width:13%">
    </colgroup>
    <thead>
      <tr style="background:#f5f3f0">
        <th>日期</th><th>分類</th><th>品項</th><th>店名</th><th>付款人</th><th>支付方式</th><th style="text-align:right">金額</th>
      </tr>
    </thead>
    <tbody>${detailRows}</tbody>
  </table>
</section>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${trip.name}-旅行帳單.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 14mm 14mm; }
          body {
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            max-width: none !important; margin: 0 !important;
            background: white !important; padding: 0 !important;
          }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
          section { page-break-inside: avoid; }
          .table-scroll { overflow: visible !important; }
        }
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      `}</style>

      {/* 列印/返回按鈕（不列印） */}
      <div className="no-print" style={{ display: 'flex', gap: 10, padding: '16px 20px', borderBottom: '0.5px solid #eee', background: '#fafaf8', flexWrap: 'wrap' }}>
        <button onClick={() => history.back()}
          style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}>
          ← 返回
        </button>
        <button onClick={() => window.print()}
          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#B07040', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          列印 / 儲存 PDF
        </button>
        <button onClick={downloadHtml} disabled={loading}
          style={{ padding: '7px 18px', borderRadius: 8, border: '0.5px solid #B07040', background: 'white', color: '#B07040', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          下載 HTML
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
            {grossJpy > 0 && (
              <div>
                日幣<br /><strong style={{ fontSize: 17 }}>¥{jpyTotal.toLocaleString()}</strong>
                {proxyJpy > 0 && <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>毛額 ¥{grossJpy.toLocaleString()} · 代買 −¥{proxyJpy.toLocaleString()}</div>}
              </div>
            )}
            {grossTwd > 0 && (
              <div>
                台幣<br /><strong style={{ fontSize: 17 }}>NT${twdTotal.toLocaleString()}</strong>
                {proxyTwd > 0 && <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>毛額 NT${grossTwd.toLocaleString()} · 代買 −NT${proxyTwd.toLocaleString()}</div>}
              </div>
            )}
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
                        <div style={{ width: `${grossJpy > 0 ? Math.round(p.amt / grossJpy * 100) : 0}%`, height: '100%', borderRadius: 2, background: '#B07040' }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>¥{p.amt.toLocaleString()}</td>
                    <td style={{ padding: '3px 0 3px 6px', color: '#999', width: 32 }}>{grossJpy > 0 ? Math.round(p.amt / grossJpy * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 合計分類支出 */}
        {(combinedJpyCats.length > 0 || combinedTwdCats.length > 0) && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
              合計分類支出
            </h3>
            {combinedJpyCats.length > 0 && <CatTable rows={combinedJpyCats} symbol="¥" />}
            {combinedTwdCats.length > 0 && <CatTable rows={combinedTwdCats} symbol="NT$" style={{ marginTop: 6 }} />}
          </section>
        )}

        {/* 前十名消費 */}
        {top10jpy.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
              前十名消費（JPY）
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <tbody>
                {top10jpy.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 0', width: 20, color: '#aaa', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items}</td>
                    <td style={{ padding: '4px 0', color: '#888', whiteSpace: 'nowrap', fontSize: 9.5 }}>{r.date} · {r.storeName || r.category}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>¥{r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {top10twd.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, marginBottom: 10 }}>
              前十名消費（TWD）
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <tbody>
                {top10twd.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <td style={{ padding: '4px 0', width: 20, color: '#aaa', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items}</td>
                    <td style={{ padding: '4px 0', color: '#888', whiteSpace: 'nowrap', fontSize: 9.5 }}>{r.date} · {r.storeName || r.category}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>NT${r.amount.toLocaleString()}</td>
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
          <div className="table-scroll">
          <table className="detail-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9.5, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f5f3f0' }}>
                {['日期', '分類', '品項', '店名', '付款人', '支付方式', '金額'].map(h => (
                  <th key={h} style={{ padding: '5px 6px', textAlign: h === '金額' ? 'right' : 'left', fontWeight: 600, color: '#555', borderBottom: '0.5px solid #ddd', overflow: 'hidden' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8' }}>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>{r.date}</td>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.category}</td>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items}</td>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>
                    {r.category === '代買' && r.proxyFor ? `→ ${r.proxyFor}` : r.storeName}
                  </td>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.paidBy}</td>
                  <td style={{ padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>{r.paymentMethod}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.currency === 'TWD' ? 'NT$' : '¥'}{r.amount.toLocaleString()}
                    {r.splitWith && <span style={{ fontSize: 8.5, color: '#B07040', marginLeft: 3 }}>AA</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      </div>
    </>
  )
}
