import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '旅行記帳',
  description: '日本旅行收據辨識記帳',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
