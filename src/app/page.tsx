'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { getSettings, saveSettings, getActiveTrip, getDayNumber, receiptBelongsToTrip } from '@/lib/settings'
import { calcSplit, personalTotal } from '@/lib/split'
import { Receipt } from '@/lib/types'

const TAG_MAP: Record<string, string> = {
  '餐飲': 'tag-食', '交通': 'tag-交', '購物': 'tag-購',
  '門票': 'tag-門', '住宿': 'tag-住', '藥品': 'tag-藥', '代買': 'tag-代', '其他': 'tag-其'
}

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notion')
      .then(r => r.json())
      .then(d => { if (d.success) setReceipts(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const settings = getSettings()
  const trip = getActiveTrip(settings)
  const visibleTrips = settings.trips.filter(t => !t.archived)
  const tripReceipts = receipts.filter(r => receiptBelongsToTrip(r.trip, settings))
  const today = new Date().toISOString().split('T')[0]
  // 檢查 today 是否在 trip 範圍內，若不在就顯示真實的 today 並把 Day 顯示成「—」
  const tripStartObj = new Date(trip.tripStart)
  const tripEndObj = new Date(trip.tripStart)
  tripEndObj.setDate(tripEndObj.getDate() + trip.tripDays - 1)
  const todayObj = new Date(today)
  const inRange = todayObj >= tripStartObj && todayObj <= tripEndObj
  const initialOffset = inRange ? Math.max(0, getDayNumber(today, trip.tripStart) - 1) : 0
  const [dayOffset, setDayOffset] = useState<number>(initialOffset)
  const [showRealToday, setShowRealToday] = useState<boolean>(!inRange)
  useEffect(() => {
    setDayOffset(initialOffset)
    setShowRealToday(!inRange)
  }, [trip.name])
  const [showTripMenu, setShowTripMenu] = useState(false)
  const tripMenuRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!tripMenuRef.current) return
      if (!(e.target instanceof Node)) return
      if (!tripMenuRef.current.contains(e.target)) setShowTripMenu(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])
  const selectTrip = (name: string) => {
    saveSettings({ ...settings, activeTrip: name })
    setShowTripMenu(false)
  }
  const touchStartX = useRef<number | null>(null)
    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const endX = e.changedTouches[0].clientX
      const dx = endX - touchStartX.current
      const THRESH = 50
      if (dx > THRESH) setDayOffset(d => Math.max(0, d - 1))
      else if (dx < -THRESH) setDayOffset(d => Math.min(d + 1, trip.tripDays - 1))
      touchStartX.current = null
    }
    const displayDateObj = new Date(trip.tripStart)
    displayDateObj.setDate(displayDateObj.getDate() + dayOffset)
    const tripDisplayDate = displayDateObj.toISOString().split('T')[0]
    const displayDate = showRealToday ? today : tripDisplayDate
    const dayNum = showRealToday ? 0 : dayOffset + 1
    const tripDayReceipts = tripReceipts.filter(r => r.date === displayDate)
    const tripDayJPY = tripDayReceipts.filter(r => r.currency !== 'TWD').reduce((a, r) => a + r.amount, 0)
    const tripDayTWD = tripDayReceipts.filter(r => r.currency === 'TWD').reduce((a, r) => a + r.amount, 0)
    // 建立旅程日期選單資料
    const tripDaysArray = Array.from({ length: trip.tripDays }, (_, i) => {
      const d = new Date(trip.tripStart)
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
  const tripJPY = personalTotal(tripReceipts, 'JPY', settings.user1, settings.user2)
  const tripTWD = personalTotal(tripReceipts, 'TWD', settings.user1, settings.user2)
  const split = calcSplit(tripReceipts, settings.user1, settings.user2)

  // 鍵盤左右鍵與 Home 支援
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setDayOffset(d => Math.max(0, d - 1))
      if (e.key === 'ArrowRight') setDayOffset(d => Math.min(d + 1, trip.tripDays - 1))
      if (e.key === 'Home') setDayOffset(initialOffset)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [initialOffset, trip.tripDays])

  return (
    <main>
      {/* Header */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        style={{ padding: '20px 16px 8px', position: 'relative' }}>
        {/* Settings - top right */}
        <Link href="/settings" style={{ position: 'absolute', top: 20, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 16 }}>⚙</Link>
        {/* Centered trip label */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
          DAY {dayNum > 0 ? dayNum : '—'} ·{' '}
          {visibleTrips.length > 1 ? (
            <span ref={tripMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
              <span onClick={() => setShowTripMenu(v => !v)} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                {trip.name}
              </span>
              {showTripMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '0.5px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 50, textAlign: 'left' }}>
                  {visibleTrips.map(t => (
                    <div key={t.name} onClick={() => selectTrip(t.name)}
                      style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap', color: t.name === trip.name ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {t.name}
                    </div>
                  ))}
                </div>
              )}
            </span>
          ) : trip.name}
        </div>
        {/* Centered buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowDayMenu(s => !s)} aria-haspopup="true" aria-expanded={showDayMenu}
              style={{ padding: '4px 8px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'white', fontSize: 13, fontFamily: 'inherit', color: 'var(--accent)', cursor: 'pointer' }}>
              {showRealToday ? `今天 · ${today}` : `DAY ${dayNum > 0 ? dayNum : '—'} · ${tripDisplayDate}`}
            </button>
            {showDayMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: 'white', border: '0.5px solid var(--border)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 50 }}>
                {tripDaysArray.map(d => (
                  <div key={d.day} onClick={() => { setShowRealToday(false); setDayOffset(d.day - 1); setShowDayMenu(false) }}
                    style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    DAY {d.day} · {d.date}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button aria-label="today" onClick={() => { setShowRealToday(true); setShowDayMenu(false) }}
            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer' }}>今天</button>
        </div>
      </div>

      <div className="page">
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>當日支出</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{tripDayJPY.toLocaleString()}</div>
            {tripDayTWD > 0 && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>NT${tripDayTWD.toLocaleString()}</div>}
          </div>
          <div className="card">
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>旅程累計（{settings.user1}）</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>¥{tripJPY.toLocaleString()}</div>
            {tripTWD > 0 && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>NT${tripTWD.toLocaleString()}</div>}
          </div>
        </div>

        {/* Budget removed per request */}

        {/* Split summary */}
        {(Math.abs(split.JPY.balance) >= 100 || Math.abs(split.TWD.balance) >= 30) && (
          <div style={{ background: 'var(--bg-warm)', border: '0.5px solid var(--accent-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, borderLeft: '2px solid var(--accent)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 4 }}>分帳摘要</div>
            {Math.abs(split.JPY.balance) >= 100 && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{split.JPY.oweText}</div>}
            {Math.abs(split.TWD.balance) >= 30 && <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{split.TWD.oweText}</div>}
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
            <div className={`avatar ${r.paidBy === settings.user1 ? 'avatar-1' : 'avatar-2'}`}>
              {(r.paidBy || settings.user1).charAt(0)}
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
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.currency === 'TWD' ? 'NT$' : '¥'}{r.amount.toLocaleString()}</div>
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
