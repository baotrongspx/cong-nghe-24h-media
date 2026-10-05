import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { layPhienTheoMa } from '@/lib/liveAi'
import SanKhau from './SanKhau'

export const metadata: Metadata = { title: 'Live AI', robots: { index: false, follow: false } }

// Sân khấu Live AI: mở trong OBS (Browser source). Link chứa mã bí mật của phiên, không cần đăng nhập.
export default async function TrangLive({ params }: PageProps<'/live/[ma]'>) {
  const phien = await layPhienTheoMa((await params).ma)
  if (!phien) notFound()
  return <SanKhau ma={phien.ma} ten={phien.ten} sanPham={phien.san_pham} />
}
