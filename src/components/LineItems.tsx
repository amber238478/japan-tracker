'use client'
import { LineItem, Receipt } from '@/lib/types'
import { getSettings } from '@/lib/settings'
import { splitOptionsFor, splitLabel, sharesFromItems, DEFAULT_ITEM_SPLIT } from '@/lib/itemSplit'

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
  const st = getSettings()
  const users: [string, string] = [st.user1, st.user2]
  const [vu1, vu2] = receipt.splitWith && items.length ? sharesFromItems(items, receipt.amount) : [0, 0]

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
              {/* 分攤方式放在金額左邊 */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {receipt.splitWith && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', whiteSpace: 'nowrap' }}>⇌ {splitLabel(x.split, users[0], users[1])}</span>
                )}
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
          {receipt.splitWith && items.some(x => x.split !== undefined) && (
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
              依明細分攤：{users[0]} {money(vu1, cur)}／{users[1]} {money(vu2, cur)}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>
          {(receipt.items || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).map((s, i) => (
            <div key={i} style={{ padding: '2px 0' }}>• {s}</div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 6 }}>這筆沒有分項價格，可到編輯頁補上</div>
        </div>
      )}

      {receipt.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>📝 {receipt.notes}</div>}
    </div>
  )
}

/** 可編輯：掃描確認頁、編輯頁使用 */
export function LineItemsEditor({ items, onChange, total, currency, fallbackNames, splitUsers }: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  total: number
  currency?: string
  fallbackNames?: string   // 沒有明細時，可從「品項」文字建立
  splitUsers?: [string, string] | null  // 有分帳時傳入兩人名字，每項可選誰負擔
}) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((x, j) => j === i ? { ...x, ...patch } : x))
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, { name: '', nameJa: '', qty: 1, price: 0 }])
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
          {splitUsers && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, marginTop: -2, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>⇌ 分攤</span>
              <select value={String(x.split ?? DEFAULT_ITEM_SPLIT)} onChange={e => update(i, { split: Number(e.target.value) })}
                style={{ flex: 1, minWidth: 0, padding: '6px 10px', fontSize: 16, color: (x.split ?? DEFAULT_ITEM_SPLIT) === DEFAULT_ITEM_SPLIT ? 'var(--text-secondary)' : 'var(--accent)' }}>
                {splitOptionsFor(x.split, splitUsers[0], splitUsers[1]).map(o => <option key={o.value} value={String(o.value)}>{o.label}</option>)}
              </select>
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

      {splitUsers && items.length > 0 && (() => {
        const [a1, a2] = sharesFromItems(items, Number(total) || 0)
        return (
          <div style={{ fontSize: 12, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)' }}>
            依明細分攤：{splitUsers[0]} <b>{money(a1, currency)}</b>／{splitUsers[1]} <b>{money(a2, currency)}</b>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>預設平分；稅或尾數差額依比例分攤，會自動帶入下方分帳金額</div>
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
