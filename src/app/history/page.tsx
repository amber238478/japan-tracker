'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { getSettings } from '@/lib/settings'
import { Receipt } from '@/lib/types'

const TAG_MAP: Record<string, string> = {
  '餐飲': 'tag-食', '交通': 'tag-交', '購物': 'tag-購',
  '門票': 'tag-門', '住宿': 'tag-住', '藥品': 'tag-藥', '其他': 'tag-其'
}

export default function HistoryPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const s = getSettings()

  useEffect(() => {
    fetch('/api/notion').then(r => r.json()).then(d => {
      if (d.success) setReceipts(d.data)
    }).finally(() => setLoading(false))
  }, [])

  const totalJPY = receipts.filter(r => r.currency !== 'TWD').reduce((a, r) => a + r.amount, 0)
  const totalTWD = receipts.filter(r => r.currency === 'TWD').reduce((a, r) => a + r.amount, 0)

  // Group by date
  const grouped: Record<string, Receipt[]> = {}
  receipts.forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push(r)
  })

  const deleteItem = async (r: Receipt) => {
    if (!confirm('確定刪除？')) return
    await fetch('/api/notion/update', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionId: r.notionId })
    })
    setReceipts(prev => prev.filter(x => x.notionId !== r.notionId))
  }

  return (
    <main>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>所有紀錄</div>
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>旅行總支出</div>
          <div style={{ fontSize: 26, fontWeight: 500 }}>¥{totalJPY.toLocaleString()}</div>
          {totalTWD > 0 && <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-secondary)' }}>NT${totalTWD.toLocaleString()}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>{receipts.length} 筆</div>
        </div>
      </div>

      <div className="page">
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>載入中...</div>}

        {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => {
          const dayJPY = items.filter(r => r.currency !== 'TWD').reduce((a, r) => a + r.amount, 0)
          const dayTWD = items.filter(r => r.currency === 'TWD').reduce((a, r) => a + r.amount, 0)
          const d = new Date(date)
          const weekdays = ['日', '一', '二', '三', '四', '五', '六']
          return (
            <div key={date}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 6px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {date}（{weekdays[d.getDay()]}）
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ¥{dayJPY.toLocaleString()}{dayTWD > 0 && ` · NT$${dayTWD.toLocaleString()}`}
                </div>
              </div>
              {items.map((r, i) => (
                <div key={i} className="card" onClick={() => router.push(`/edit/${r.notionId}`)}
                  style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div className={`avatar ${r.paidBy === s.user1 ? 'avatar-1' : 'avatar-2'}`}>
                    {(r.paidBy || s.user1).charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.items}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className={`tag ${TAG_MAP[r.category] ?? 'tag-其'}`}>{r.category}</span>
                      <span>{r.paymentMethod}</span>
                      {r.splitWith && <span style={{ color: 'var(--accent)', fontSize: 10 }}>⇌ 分帳</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.currency === 'TWD' ? 'NT$' : '¥'}{r.amount.toLocaleString()}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(r) }} style={{ background: 'none', border: 'none', color: 'var(--text-hint)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <BottomNav />
    </main>
  )
}
