'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MUC = [
  ['/quan-ly', 'Hộp thư'],
  ['/quan-ly/fanpage', 'Fanpage'],
  ['/quan-ly/dang-bai', 'Đăng bài'],
  ['/quan-ly/dang-nhom', 'Đăng nhóm'],
  ['/quan-ly/tu-dong', 'Tự động trả lời'],
  ['/quan-ly/mau-cau', 'Mẫu câu & thẻ'],
  ['/quan-ly/nhan-vien', 'Nhân viên'],
  ['/quan-ly/goi-cuoc', 'Gói cước'],
] as const

export default function MenuQuanLy({ laQuanTri }: { laQuanTri: boolean }) {
  const duong = usePathname()
  const muc: readonly (readonly [string, string])[] = laQuanTri ? [...MUC, ['/quan-ly/quan-tri', 'Quản trị']] : MUC
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {muc.map(([href, ten]) => (
        <Link
          key={href}
          href={href}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            duong === href ? 'bg-chinh/10 text-chinh' : 'text-phu hover:bg-slate-100'
          }`}
        >
          {ten}
        </Link>
      ))}
    </nav>
  )
}
