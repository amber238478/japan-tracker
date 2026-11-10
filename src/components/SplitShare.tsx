'use client'
import { useState } from 'react'

/** 分帳比例：拉桿 + 兩人金額可自行輸入（輸入一邊，另一邊自動 = 總額 − 這邊） */
export default function SplitShare({ total, ratio, paidBy, splitWith, users, currency, onChange }: {
  total: number
  ratio: number            // paidBy 的分擔比例（0–1）
  paidBy?: string
  splitWith?: string | null
  users?: [string, string]  // 兩位使用者，分帳對象空白時用來補上另一人
  currency?: string
  onChange: (ratio: number) => void
}) {
  const t = Math.max(0, Math.round(Number(total) || 0))
  const paidAmt = Math.round(t * ratio)
  const otherAmt = t - paidAmt
  const [draft, setDraft] = useState<{ field: 'paid' | 'other'; text: string } | null>(null)
  const sym = currency === 'TWD' ? 'NT$' : '¥'
  const otherName = splitWith && splitWith !== paidBy ? splitWith
    : users ? (paidBy === users[0] ? users[1] : users[0]) : splitWith

  const typeAmount = (field: 'paid' | 'other', text: string) => {
    setDraft({ field, text })
    if (text === '' || t <= 0) return
    const v = Math.min(t, Math.max(0, Math.round(Number(text) || 0)))
    const mine = field === 'paid' ? v : t - v
    onChange(mine / t)
  }

  const box = (field: 'paid' | 'other', name: string | null | undefined, amt: number) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{name || '—'} 負擔</div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>{sym}</span>
        <input type="number" inputMode="numeric"
          value={draft?.field === field ? draft.text : String(amt)}
          onChange={e => typeAmount(field, e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={() => setDraft(null)}
          style={{ paddingLeft: currency === 'TWD' ? 44 : 28 }} />
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {paidBy} 的比例：{Math.round(ratio * 100)}%
      </div>
      <input type="range" min="0" max="100" step="5"
        value={Math.round(ratio * 100)}
        onChange={e => { setDraft(null); onChange(Number(e.target.value) / 100) }}
        style={{ width: '100%', marginBottom: 10 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
        {box('paid', paidBy, paidAmt)}
        {box('other', otherName, otherAmt)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 6 }}>
        可直接輸入金額，另一人自動補足總額 {sym}{t.toLocaleString()}
      </div>
    </div>
  )
}
