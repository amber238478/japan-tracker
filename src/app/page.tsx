'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { getSettings, toTWD, getDayNumber } from '@/lib/settings'
import { calcSplit } from '@/lib/split'
import { Receipt } from '@/lib/types'

const TAG_MAP: Record<string, string> = {
  '餐飲': 'tag-食', '交通': 'tag-交', '購物': 'tag-購',
  '門票': 'tag-門', '住宿': 'tag-住', '藥品': 'tag-藥', '其他': 'tag-其'
}

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const settings = typeof window !== 'undefined' ? getSettings() : null

  useEffect(() => {
    fetch('/api/notion')
      .then(r => r.json())
      .then(d => { if (d.success) setReceipts(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const s = getSettings()
  const today = new Date().toISOString().split('T')[0]
  const todayReceipts = receipts.filter(r => r.date === today)
  const todayTotal = todayReceipts.reduce((a, r) => a + r.amountJPY, 0)
  const tripTotal = receipts.reduce((a, r) => a + r.amountJPY, 0)
  const budgetUsed = Math.round((tripTotal / s.budget) * 100)
  const dayNum = getDayNumber(today, s.tripStart)
  const split = calcSplit(receipts, s.user1, s.user2)

  return (
    <main>
      {/* Header */}
      <div style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
            DAY {dayNum > 0 ? dayNum : '—'} · {s.tripName}
          </div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{today}</div>
        </div>
        <Link href="/settings" style={{ color: 'var(--text-muted)', fontSize: 22 }}>⚙</Link>
      </div>

      <div className="page">
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>今日支出</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{todayTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>≈ NT${toTWD(todayTotal, s.exchangeRate).toLocaleString()}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>旅程累計</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{tripTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>≈ NT${toTWD(tripTotal, s.exchangeRate).toLocaleString()}</div>
          </div>
        </div>

        {/* Budget */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>預算進度</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>剩 ¥{(s.budget - tripTotal).toLocaleString()}</div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 5 }}>已使用 {budgetUsed}%</div>
        </div>

        {/* Split summary */}
        {Math.abs(split.balance) >= 100 && (
          <div style={{ background: 'var(--bg-warm)', border: '0.5px solid var(--accent-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, borderLeft: '2px solid var(--accent)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>分帳摘要</div>
            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{split.oweText}</div>
          </div>
        )}

        {/* Today's records */}
        <div className="section-label">今日花費</div>
        {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>載入中...</div>}
        {!loading && todayReceipts.length === 0 && (
          <div style={{ color: 'var(--text-hint)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            今天還沒有記錄<br />
            <Link href="/scan" style={{ color: 'var(--accent)', marginTop: 8, display: 'inline-block' }}>掃描收據 →</Link>
          </div>
        )}
        {todayReceipts.map((r, i) => (
          <div key={i} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`avatar ${r.paidBy === s.user1 ? 'avatar-1' : 'avatar-2'}`}>
              {(r.paidBy || s.user1).charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.items}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className={`tag ${TAG_MAP[r.category] ?? 'tag-其'}`}>{r.category}</span>
                <span>{r.paymentMethod}</span>
                {r.storeName && <><span style={{ color: 'var(--border)' }}>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.storeName}</span></>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>¥{r.amountJPY.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>NT${toTWD(r.amountJPY, s.exchangeRate).toLocaleString()}</div>
            </div>
          </div>
        ))}

        {/* Quick add */}
        <Link href="/add" style={{ display: 'block', marginTop: 8 }}>
          <div style={{ border: '0.5px dashed var(--border)', borderRadius: 12, padding: '12px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            + 手動新增
          </div>
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}
