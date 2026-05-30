'use client'
import { useEffect, useState, useRef } from 'react'
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
  // 檢查 today 是否在 trip 範圍內，若不在就顯示真實的 today 並把 Day 顯示成「—」
  const tripStartObj = new Date(s.tripStart)
  const tripEndObj = new Date(s.tripStart)
  tripEndObj.setDate(tripEndObj.getDate() + s.tripDays - 1)
  const todayObj = new Date(today)
  const inRange = todayObj >= tripStartObj && todayObj <= tripEndObj
  const initialOffset = inRange ? Math.max(0, getDayNumber(today, s.tripStart) - 1) : 0
  const [dayOffset, setDayOffset] = useState<number>(initialOffset)
  const touchStartX = useRef<number | null>(null)
    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const endX = e.changedTouches[0].clientX
      const dx = endX - touchStartX.current
      const THRESH = 50
      if (dx > THRESH) setDayOffset(d => Math.max(0, d - 1))
      else if (dx < -THRESH) setDayOffset(d => Math.min(d + 1, s.tripDays - 1))
      touchStartX.current = null
    }
    const displayDateObj = new Date(s.tripStart)
    displayDateObj.setDate(displayDateObj.getDate() + dayOffset)
    const tripDisplayDate = displayDateObj.toISOString().split('T')[0]
    const displayDate = inRange ? tripDisplayDate : today
    const dayNum = inRange ? dayOffset + 1 : 0
    const tripDayReceipts = receipts.filter(r => r.date === displayDate)
    const tripDayTotal = tripDayReceipts.reduce((a, r) => a + r.amountJPY, 0)
    // 建立旅程日期選單資料
    const tripDaysArray = Array.from({ length: s.tripDays }, (_, i) => {
      const d = new Date(s.tripStart)
      d.setDate(d.getDate() + i)
      return { day: i + 1, date: d.toISOString().split('T')[0] }
    })
    const [showDayMenu, setShowDayMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
      const onDocClick = (e: MouseEvent) => {
        if (!menuRef.current) return
        if (!(e.target instanceof Node)) return
        if (!menuRef.current.contains(e.target)) setShowDayMenu(false)
      }
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }, [])
  const tripTotal = receipts.reduce((a, r) => a + r.amountJPY, 0)
  const split = calcSplit(receipts, s.user1, s.user2)

  // 鍵盤左右鍵與 Home 支援
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setDayOffset(d => Math.max(0, d - 1))
      if (e.key === 'ArrowRight') setDayOffset(d => Math.min(d + 1, s.tripDays - 1))
      if (e.key === 'Home') setDayOffset(initialOffset)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [initialOffset, s.tripDays])

  return (
    <main>
      {/* Header */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        style={{ padding: '20px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
            DAY {dayNum > 0 ? dayNum : '—'} · {s.tripName}
          </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button aria-label="previous day" onClick={() => setDayOffset(d => Math.max(0, d - 1))} disabled={!inRange || dayOffset <= 0}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: dayOffset <= 0 ? 'default' : 'pointer', color: dayOffset <= 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>‹</button>
              <div style={{ fontSize: 22, fontWeight: 500 }}>{displayDate}</div>
              <button aria-label="next day" onClick={() => setDayOffset(d => Math.min(d + 1, s.tripDays - 1))} disabled={!inRange || dayOffset >= s.tripDays - 1}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: dayOffset >= s.tripDays - 1 ? 'default' : 'pointer', color: dayOffset >= s.tripDays - 1 ? 'var(--text-muted)' : 'var(--text-primary)' }}>›</button>
              <button aria-label="today" onClick={() => setDayOffset(initialOffset)}
                style={{ marginLeft: 6, fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>今天</button>
              <div ref={menuRef} style={{ position: 'relative', marginLeft: 8 }}>
                <button onClick={() => setShowDayMenu(s => !s)} aria-haspopup="true" aria-expanded={showDayMenu}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer' }}>
                  DAY {dayOffset + 1} · {tripDaysArray[dayOffset]?.date}
                </button>
                {showDayMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', border: '0.5px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 50 }}>
                    {tripDaysArray.map(d => (
                      <div key={d.day} onClick={() => { setDayOffset(d.day - 1); setShowDayMenu(false) }}
                        style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        DAY {d.day} · {d.date}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
        <Link href="/settings" style={{ color: 'var(--text-muted)', fontSize: 22 }}>⚙</Link>
      </div>

      <div className="page">
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>當日支出</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{tripDayTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>≈ NT${toTWD(tripDayTotal, s.exchangeRate).toLocaleString()}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>旅程累計</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{tripTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 2 }}>≈ NT${toTWD(tripTotal, s.exchangeRate).toLocaleString()}</div>
          </div>
        </div>

        {/* Budget removed per request */}

        {/* Split summary */}
        {Math.abs(split.balance) >= 100 && (
          <div style={{ background: 'var(--bg-warm)', border: '0.5px solid var(--accent-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, borderLeft: '2px solid var(--accent)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>分帳摘要</div>
            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{split.oweText}</div>
          </div>
        )}

        {/* Trip day records (label removed - DAY N shown in header) */}
        {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>載入中...</div>}
        {!loading && tripDayReceipts.length === 0 && (
          <div style={{ color: 'var(--text-hint)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            目前第 {dayNum > 0 ? dayNum : '—'} 日沒有記錄<br />
            <Link href="/scan" style={{ color: 'var(--accent)', marginTop: 8, display: 'inline-block' }}>掃描收據 →</Link>
          </div>
        )}
        {tripDayReceipts.map((r, i) => (
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
