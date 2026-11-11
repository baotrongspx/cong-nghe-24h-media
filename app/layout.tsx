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
  description: 'Công cụ làm phim hoạt hình kể chuyện: bảng cảnh, câu lệnh vẽ ảnh, giọng đọc AI, dựng video 16:9.',
  robots: { index: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${chu.variable} h-full antialiased`}>
      <body className="min-h-full bg-nen font-sans">{children}</body>
    </html>
  )
}
