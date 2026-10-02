'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const MUC = [
  ['/quan-ly', 'Hộp thư'],
  ['/quan-ly/don-hang', 'Đơn hàng'],
  ['/quan-ly/bao-cao', 'Báo cáo'],
  ['/quan-ly/fanpage', 'Fanpage'],
  ['/quan-ly/dang-bai', 'Đăng bài'],
  ['/quan-ly/dang-nhom', 'Đăng nhóm'],
  ['/quan-ly/tu-dong', 'Tự động trả lời'],
  ['/quan-ly/mau-cau', 'Mẫu câu & thẻ'],
  ['/quan-ly/nhan-vien', 'Nhân viên'],
  ['/quan-ly/goi-cuoc', 'Gói cước'],
] as const

// Mục vừa bấm: nhấp nháy trong lúc chờ máy chủ trả trang
function TenMuc({ ten }: { ten: string }) {
  const { pending } = useLinkStatus()
  return <span className={pending ? 'animate-pulse' : undefined}>{ten}</span>
}

export default function MenuQuanLy({ laQuanTri }: { laQuanTri: boolean }) {
  const duong = usePathname()
  // Tô sáng mục vừa bấm ngay lập tức, không đợi trang mới tải xong
  const [vuaBam, setVuaBam] = useState<{ tu: string; den: string } | null>(null)
  const dangChon = vuaBam && vuaBam.tu === duong ? vuaBam.den : duong
  const muc: readonly (readonly [string, string])[] = laQuanTri ? [...MUC, ['/quan-ly/quan-tri', 'Quản trị']] : MUC
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {muc.map(([href, ten]) => (
        <Link
          key={href}
          href={href}
          onClick={() => setVuaBam({ tu: duong, den: href })}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            dangChon === href ? 'bg-chinh/10 text-chinh' : 'text-phu hover:bg-slate-100'
          }`}
        >
          <TenMuc ten={ten} />
        </Link>
      ))}
    </nav>
  )
}
