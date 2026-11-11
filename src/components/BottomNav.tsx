'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { useReceiptScan } from '@/lib/useReceiptScan'
import ScanOverlay from './ScanOverlay'

export default function BottomNav() {
  const path = usePathname()
  const fileRef = useRef<HTMLInputElement>(null)
  const { busy, stage, scan: handleFile } = useReceiptScan()

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
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
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
      {busy && <ScanOverlay stage={stage} />}
    </>
  )
}
