import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google'
import './globals.css'

// 本文用（ゴシック）
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

// ロゴ用（Source Han Serif JP Bold 相当）
const ritzSerif = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-ritz',
})

export const metadata: Metadata = {
  title: 'パーソナルジムRitz | 予約',
  description: 'Ritzパーソナルジム予約システム',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e1b4b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${ritzSerif.variable}`}>
      <body className={`${notoSansJP.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
