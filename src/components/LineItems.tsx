'use client'
import { LineItem, Receipt } from '@/lib/types'
import { getSettings } from '@/lib/settings'
import { shareOptions, shareTag, sharesFromItems, DEFAULT_SHARE } from '@/lib/itemShare'

const money = (n: number, currency?: string) => {
  const sign = n < 0 ? '-' : ''
  return `${sign}${currency === 'TWD' ? 'NT$' : '¥'}${Math.abs(n).toLocaleString()}`
}

export const sumLineItems = (items?: LineItem[]) => (items ?? []).reduce((a, x) => a + (Number(x.price) || 0), 0)

/** 唯讀：顯示收據分項明細（首頁、紀錄頁點開時使用） */
export function LineItemsView({ receipt }: { receipt: Receipt }) {
  const items = receipt.lineItems ?? []
  const cur = receipt.currency
  const sum = sumLineItems(items)
  const diff = receipt.amount - sum

  // 分帳金額：付款人負擔 = 總額 × 比例，另一人 = 剩下的
  const st = getSettings()
  const payerShare = Math.round(receipt.amount * (receipt.splitRatio ?? 0.5))
  const otherName = receipt.paidBy === st.user1 ? st.user2 : st.user1
  const shares = receipt.splitWith
    ? [
        { name: receipt.paidBy || st.user1, amt: payerShare, payer: true },
        { name: otherName, amt: receipt.amount - payerShare, payer: false },
      ].sort((a, b) => (a.name === st.user1 ? -1 : b.name === st.user1 ? 1 : 0))
    : []

  return (
    <div style={{ borderTop: '1px dashed var(--border)', marginTop: 10, paddingTop: 10, fontSize: 12 }}>
      {receipt.storeName && (
        <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
          🏪 {receipt.storeName}{receipt.storeNameJa && receipt.storeNameJa !== receipt.storeName ? `（${receipt.storeNameJa}）` : ''}
        </div>
      )}

      {items.length > 0 ? (
        <>
          {items.map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ wordBreak: 'break-word' }}>
                  {x.name}{(x.qty ?? 1) > 1 && <span style={{ color: 'var(--text-muted)' }}> ×{x.qty}</span>}
                </div>
                {x.nameJa && <div style={{ fontSize: 10, color: 'var(--text-hint)', wordBreak: 'break-word' }}>{x.nameJa}</div>}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {receipt.splitWith && (() => {
                  const t = shareTag(x.share, st.user1, st.user2)  // 只標例外，平分和舊紀錄不顯示
                  return t ? <span style={{ fontSize: 10, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{t}</span> : null
                })()}
                <span className="mono" style={{ color: x.price < 0 ? 'var(--accent)' : 'var(--text-primary)' }}>{money(x.price, cur)}</span>
              </div>
            </div>
          ))}
          {diff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>其他（稅、尾數等差額）</span>
              <span className="mono">{money(diff, cur)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 6, fontWeight: 600 }}>
            <span>合計</span>
            <span className="mono">{money(receipt.amount, cur)}</span>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>
          {(receipt.items || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).map((s, i) => (
            <div key={i} style={{ padding: '2px 0' }}>• {s}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 6 }}>這筆沒有分項價格，可到編輯頁補上</div>
        </div>
      )}

      {shares.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {shares.map(x => (
            <div key={x.name} style={{ flex: 1, background: 'var(--accent-light)', borderRadius: 8, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {x.name}{x.payer && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>（付款）</span>}
              </span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{money(x.amt, cur)}</span>
            </div>
          ))}
        </div>
      )}

      {receipt.photoUrl && (
        <a href={receipt.photoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
          <img src={receipt.photoUrl} alt="收據照片" style={{ width: 44, height: 56, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--border)' }} />
          📷 看收據照片
        </a>
      )}
      {receipt.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>📝 {receipt.notes}</div>}
    </div>
  )
}

/** 可編輯：掃描確認頁、編輯頁使用 */
export function LineItemsEditor({ items, onChange, total, currency, fallbackNames, shareUsers }: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  total: number
  currency?: string
  fallbackNames?: string   // 沒有明細時，可從「品項」文字建立
  shareUsers?: [string, string] | null  // 打開「依品項分帳」時傳入兩人名字，每項顯示按鈕
}) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((x, j) => j === i ? { ...x, ...patch } : x))
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, { name: '', nameJa: '', qty: 1, price: 0, ...(shareUsers ? { share: DEFAULT_SHARE } : {}) }])
  const fromNames = () => onChange((fallbackNames || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).map(name => ({ name, nameJa: '', qty: 1, price: 0 })))
  const sum = sumLineItems(items)
  const diff = (Number(total) || 0) - sum

  return (
    <div className="card">
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>分項明細（品名／價格）</div>

      {items.map((x, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input value={x.name} onChange={e => update(i, { name: e.target.value })} placeholder="品名" />
          <input type="number" inputMode="numeric" value={Number.isFinite(x.price) ? x.price : ''} onChange={e => update(i, { price: Math.round(Number(e.target.value)) || 0 })} placeholder="價格" style={{ textAlign: 'right' }} />
          <button onClick={() => remove(i)} aria-label="刪除此項" style={{ background: 'none', border: 'none', color: 'var(--text-hint)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          {shareUsers && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: -2, marginBottom: 4 }}>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {shareOptions(shareUsers[0], shareUsers[1]).map((o, k) => {
                  const on = (x.share ?? DEFAULT_SHARE) === o.value
                  return (
                    <button key={o.value} onClick={() => update(i, { share: o.value })} title={o.label}
                      style={{ padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                        borderLeft: k ? '1px solid var(--border)' : 'none',
                        background: on ? 'var(--accent-light)' : 'white', color: on ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: on ? 600 : 400 }}>
                      {o.short}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={add} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          + 新增一項
        </button>
        {items.length === 0 && fallbackNames && (
          <button onClick={fromNames} style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            從品項建立
          </button>
        )}
      </div>

      {shareUsers && items.length > 0 && (() => {
        const [a1, a2] = sharesFromItems(items, Number(total) || 0)
        return (
          <div style={{ fontSize: 12, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)' }}>
            依品項：{shareUsers[0]} <b>{money(a1, currency)}</b>／{shareUsers[1]} <b>{money(a2, currency)}</b>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>6:4 = {shareUsers[1]} 6 : {shareUsers[0]} 4；稅金、尾數差額依比例分攤</div>
          </div>
        )
      })()}

      {items.length > 0 && (
        <div style={{ fontSize: 11, marginTop: 8, color: diff === 0 ? 'var(--text-muted)' : 'var(--accent)' }}>
          明細加總 {money(sum, currency)}
          {diff === 0 ? ' ✓ 與總金額相符' : `，與總金額差 ${money(diff, currency)}（會顯示為「其他」）`}
        </div>
      )}
    </div>
  )
}
