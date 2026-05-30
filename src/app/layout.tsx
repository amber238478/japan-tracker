import type { Metadata } from 'next'
import './globals.css'
import ClientLogger from '@/components/ClientLogger'
import FloatingReportButton from '@/components/FloatingReportButton'

export const metadata: Metadata = {
  title: '旅行記帳',
  description: '日本旅行收據辨識記帳',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientLogger />
        {children}
        <FloatingReportButton />
      </body>
    </html>
  )
}
