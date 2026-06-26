'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { resizeImageToBase64 } from '@/lib/image'

export default function BottomNav() {
  const path = usePathname()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File) => {
    setBusy(true)
    try {
      const { base64, mimeType } = await resizeImageToBase64(file)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('scanned-receipt', JSON.stringify(data.data))
        router.push('/scan/confirm')
      } else {
        alert(data.error ? `辨識失敗：${data.error}` : '辨識失敗，請重試或使用上傳頁面')
      }
    } catch (err) {
      console.error(err)
      alert('網路錯誤，請稍後重試')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <nav className="bottom-nav">
        <Link href="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
          <span className="nav-icon">⌂</span>
          <span>首頁</span>
        </Link>
        <Link href="/history" className={`nav-item ${path === '/history' ? 'active' : ''}`}>
          <span className="nav-icon">≡</span>
          <span>紀錄</span>
        </Link>
        <div className="nav-item">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="scan-fab"
            aria-label="開啟相機掃描"
            style={{ cursor: 'pointer' }}
            disabled={busy}
          >
            <span>◎</span>
          </button>
          <span>掃描</span>
        </div>
        <Link href="/stats" className={`nav-item ${path === '/stats' ? 'active' : ''}`}>
          <span className="nav-icon">◫</span>
          <span>統計</span>
        </Link>
        <Link href="/split" className={`nav-item ${path === '/split' ? 'active' : ''}`}>
          <span className="nav-icon">⇌</span>
          <span>分帳</span>
        </Link>
      </nav>
    </>
  )
}
