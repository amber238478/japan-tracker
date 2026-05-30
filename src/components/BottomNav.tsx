'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
        <span className="nav-icon">⌂</span>
        <span>首頁</span>
      </Link>
      <Link href="/history" className={`nav-item ${path === '/history' ? 'active' : ''}`}>
        <span className="nav-icon">≡</span>
        <span>紀錄</span>
      </Link>
      <Link href="/scan" className="nav-item">
        <div className="scan-fab">
          <span>◎</span>
        </div>
        <span>掃描</span>
      </Link>
      <Link href="/stats" className={`nav-item ${path === '/stats' ? 'active' : ''}`}>
        <span className="nav-icon">◫</span>
        <span>統計</span>
      </Link>
      <Link href="/split" className={`nav-item ${path === '/split' ? 'active' : ''}`}>
        <span className="nav-icon">⇌</span>
        <span>分帳</span>
      </Link>
    </nav>
  )
}
