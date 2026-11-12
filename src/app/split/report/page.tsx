'use client'
import { useEffect, useRef, useState } from 'react'
import { getSettings, getActiveTrip, receiptBelongsToTrip } from '@/lib/settings'
import { calcSplit } from '@/lib/split'
import { Receipt } from '@/lib/types'
import { fetchReceipts } from '@/lib/fetchReceipts'
import { exportElementToPdf, isStandaloneApp, sharePdf } from '@/lib/pdfExport'

/** 分帳明細報表：用瀏覽器「列印 → 儲存為 PDF」 */
export default function SplitReportPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [readyFile, setReadyFile] = useState<File | null>(null) // 產生好但分享被擋，等使用者再點一次
  const [canPrint, setCanPrint] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  // 加到主畫面的 App 不支援列印，只在瀏覽器裡顯示「列印」
  useEffect(() => { setCanPrint(!isStandaloneApp()) }, [])
  const s = getSettings()
  const trip = getActiveTrip(s)
  const tripReceipts = receipts.filter(r => receiptBelongsToTrip(r.trip, s))

  useEffect(() => {
    fetchReceipts().then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  // iOS Safari 列印時 body 的 max-width 會讓版面變窄，這頁先拿掉
  useEffect(() => {
    const b = document.body
    const h = document.documentElement
    const prev = { bMax: b.style.maxWidth, bMargin: b.style.margin, hMax: h.style.maxWidth }
    b.style.maxWidth = 'none'
    b.style.margin = '0'
    h.style.maxWidth = 'none'
    return () => {
      b.style.maxWidth = prev.bMax
      b.style.margin = prev.bMargin
      h.style.maxWidth = prev.hMax
    }
  }, [])

  const split = calcSplit(tripReceipts, s.user1, s.user2)
  const splitReceipts = tripReceipts
    .filter(r => r.splitWith)
    .sort((a, b) => a.date.localeCompare(b.date))
  const currencies = (['JPY', 'TWD'] as const).filter(c => splitReceipts.some(r => r.currency === c))

  // 每筆兩人各自負擔（與分帳頁相同算法）
  const shares = (r: Receipt): [number, number] => {
    const paidByUser1 = r.paidBy === s.user1
    const u1 = paidByUser1 ? Math.round(r.amount * r.splitRatio) : Math.round(r.amount * (1 - r.splitRatio))
    return [u1, r.amount - u1]
  }

  const savePdf = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const { result, file } = await exportElementToPdf(reportRef.current, `${trip.name}-分帳明細.pdf`, `${trip.name} 分帳明細`)
      if (result === 'blocked') setReadyFile(file)
    } catch (e) {
      console.error(e)
      alert('PDF 產生失敗，請再試一次')
    } finally {
      setExporting(false)
    }
  }

  const today = new Date()
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}`

  const th: React.CSSProperties = { padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: '#666', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '5px 6px', borderBottom: '0.5px solid #eee', verticalAlign: 'top' }
  const num: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

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
          .report-content { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          tr { page-break-inside: avoid; }
          section { page-break-inside: avoid; }
          .table-scroll { overflow: visible !important; }
        }
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: white; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      `}</style>

      {/* 返回／列印按鈕（不列印） */}
      <div className="no-print" style={{ display: 'flex', gap: 10, padding: '16px 20px', borderBottom: '0.5px solid #eee', background: '#fafaf8', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => history.back()}
          style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}>
          ← 返回
        </button>
        <button onClick={savePdf} disabled={loading || exporting}
          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#F24B2B', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (loading || exporting) ? 0.5 : 1 }}>
          {exporting ? 'PDF 產生中…' : '📄 儲存 / 分享 PDF'}
        </button>
        {readyFile && (
          <button onClick={async () => { const r = await sharePdf(readyFile, `${trip.name} 分帳明細`); if (r !== 'blocked') setReadyFile(null) }}
            style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #F24B2B', background: '#FFF0EC', color: '#F24B2B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ✅ PDF 已產生，點這裡分享／儲存
          </button>
        )}
        {canPrint && (
          <button onClick={() => window.print()} disabled={loading} style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}>
            列印
          </button>
        )}
        {loading && <span style={{ fontSize: 12, color: '#999' }}>載入中...</span>}
        {!loading && <span style={{ fontSize: 11, color: '#999' }}>iPhone 會跳出分享選單，選「儲存到檔案」或直接傳給對方</span>}
      </div>

      <div ref={reportRef} className="report-content" style={{ maxWidth: 680, margin: '0 auto', padding: '20px 24px 40px', fontSize: 11, color: '#222', lineHeight: 1.6 }}>
        {/* 標題 */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{trip.name} 分帳明細</h1>
          <div style={{ fontSize: 10, color: '#888' }}>{s.user1} × {s.user2} · 共 {splitReceipts.length} 筆分帳 · 製表 {todayStr}</div>
        </div>

        {!loading && splitReceipts.length === 0 && (
          <div style={{ color: '#999', padding: '20px 0' }}>還沒有分帳記錄</div>
        )}

        {/* 結算結果 */}
        {currencies.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, margin: '0 0 8px' }}>結算結果</h3>
            {currencies.map(c => (
              <div key={c} style={{ fontSize: 14, fontWeight: 700, color: '#F24B2B', marginBottom: 4 }}>
                {c}：{split[c].oweText}
              </div>
            ))}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  {currencies.map(c => <th key={c + 'p'} style={{ ...th, textAlign: 'right' }}>實際付出 {c}</th>)}
                  {currencies.map(c => <th key={c + 's'} style={{ ...th, textAlign: 'right' }}>應付 {c}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: s.user1, paid: 'user1Paid' as const, should: 'user1Should' as const },
                  { name: s.user2, paid: 'user2Paid' as const, should: 'user2Should' as const },
                ].map(u => (
                  <tr key={u.name}>
                    <td style={{ ...td, fontWeight: 600 }}>{u.name}</td>
                    {currencies.map(c => <td key={c + 'p'} style={num}>{c === 'JPY' ? '¥' : 'NT$'}{split[c][u.paid].toLocaleString()}</td>)}
                    {currencies.map(c => <td key={c + 's'} style={num}>{c === 'JPY' ? '¥' : 'NT$'}{split[c][u.should].toLocaleString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 明細表（依幣別） */}
        {currencies.map(c => {
          const sym = c === 'JPY' ? '¥' : 'NT$'
          const rows = splitReceipts.filter(r => (r.currency === 'TWD' ? 'TWD' : 'JPY') === c)
          const tot = rows.reduce((a, r) => {
            const [u1, u2] = shares(r)
            return [a[0] + r.amount, a[1] + u1, a[2] + u2]
          }, [0, 0, 0])
          return (
            <section key={c} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#666', borderBottom: '0.5px solid #ddd', paddingBottom: 4, margin: '0 0 6px' }}>分帳明細 · {c}（{rows.length} 筆）</h3>
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={th}>日期</th>
                      <th style={th}>品項</th>
                      <th style={th}>店名</th>
                      <th style={th}>付款人</th>
                      <th style={{ ...th, textAlign: 'right' }}>金額</th>
                      <th style={{ ...th, textAlign: 'right' }}>{s.user1}</th>
                      <th style={{ ...th, textAlign: 'right' }}>{s.user2}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const [u1, u2] = shares(r)
                      return (
                        <tr key={r.notionId ?? i}>
                          <td style={{ ...td, whiteSpace: 'nowrap', color: '#666' }}>{r.date.slice(5)}</td>
                          <td style={{ ...td, wordBreak: 'break-word' }}>{r.items}</td>
                          <td style={{ ...td, wordBreak: 'break-word', color: '#666' }}>{r.storeName || r.category}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.paidBy}</td>
                          <td style={num}>{sym}{r.amount.toLocaleString()}</td>
                          <td style={num}>{sym}{u1.toLocaleString()}</td>
                          <td style={num}>{sym}{u2.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td style={{ ...td, fontWeight: 700, borderTop: '1px solid #ccc' }} colSpan={4}>合計</td>
                      <td style={{ ...num, fontWeight: 700, borderTop: '1px solid #ccc' }}>{sym}{tot[0].toLocaleString()}</td>
                      <td style={{ ...num, fontWeight: 700, borderTop: '1px solid #ccc' }}>{sym}{tot[1].toLocaleString()}</td>
                      <td style={{ ...num, fontWeight: 700, borderTop: '1px solid #ccc' }}>{sym}{tot[2].toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
