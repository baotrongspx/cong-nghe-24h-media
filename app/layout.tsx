import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const chu = Be_Vietnam_Pro({
  variable: '--font-chu',
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Xưởng phim hoạt hình — Công Nghệ 24H Media',
  description: 'Studio hoạt hình 2D tự động: AI viết truyện, thiết kế nhân vật, dàn dựng cảnh, máy nhà lồng tiếng và xuất phim tới 15 phút.',
  robots: { index: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${chu.variable} h-full antialiased`}>
      <body className="min-h-full bg-nen font-sans">{children}</body>
    </html>
  )
}
