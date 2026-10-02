import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { MO_TA, TEN, diaChiWeb } from '@/lib/thongTin'
import './globals.css'

const chu = Be_Vietnam_Pro({
  variable: '--font-chu',
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL(diaChiWeb()),
  title: { default: `${TEN} — Chăm sóc Fanpage, Zalo OA, TikTok cho doanh nghiệp`, template: `%s | ${TEN}` },
  description: MO_TA,
  openGraph: { type: 'website', locale: 'vi_VN', siteName: TEN, description: MO_TA },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${chu.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}
