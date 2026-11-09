import type { Metadata, Viewport } from 'next'
import './globals.css'
import ClientLogger from '@/components/ClientLogger'

// iOS 點輸入框時不要自動放大畫面
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: '旅行記帳',
  description: '日本旅行收據辨識記帳',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title: '旅行記帳',
    description: '日本旅行收據辨識記帳',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '旅行記帳',
    description: '日本旅行收據辨識記帳',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientLogger />
        {children}
      </body>
    </html>
  )
}
