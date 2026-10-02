'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MUC = [
  ['/quan-ly', 'Hộp thư'],
  ['/quan-ly/fanpage', 'Fanpage'],
  ['/quan-ly/tu-dong', 'Tự động trả lời'],
  ['/quan-ly/mau-cau', 'Mẫu câu & thẻ'],
] as const

export default function MenuQuanLy() {
  const duong = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {MUC.map(([href, ten]) => (
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
