'use client'
import { useEffect, useState } from 'react'

/** 掃描收據時的全螢幕「讀取中」畫面（掃描頁、底部掃描按鈕共用） */
export default function ScanOverlay({ stage }: { stage: string }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div role="status" aria-live="polite"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
      <div className="spinner" />
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>讀取中…</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{stage}<span style={{ color: 'var(--text-muted)' }}> · 已 {seconds} 秒</span></div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {seconds < 15 ? '通常需要 5–15 秒，請不要關閉畫面' : '收據比較長，還在努力辨識中…'}
      </div>
    </div>
  )
}
