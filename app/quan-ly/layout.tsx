import type { Metadata } from 'next'
import Link from 'next/link'
import { batBuocDangNhap } from '@/lib/phien'
import MenuQuanLy from './MenuQuanLy'

export const metadata: Metadata = { title: 'Quản lý Fanpage', robots: { index: false } }

export default async function LayoutQuanLy({ children }: LayoutProps<'/quan-ly'>) {
  const { nguoiDung } = await batBuocDangNhap()
  return (
    <div className="flex h-dvh flex-col bg-nen">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-slate-200 bg-white px-4">
        <Link href="/quan-ly" className="font-extrabold text-chinh-dam">
          24H<span className="text-nhan"> Page</span>
        </Link>
        <MenuQuanLy />
        <div className="ml-auto flex items-center gap-3 text-sm">
          {nguoiDung.anh && <img src={nguoiDung.anh} alt="" className="h-8 w-8 rounded-full" />}
          <span className="hidden font-medium sm:inline">{nguoiDung.ten}</span>
          <form action="/api/fb/dang-xuat" method="post">
            <button className="rounded-md px-2 py-1 text-phu hover:bg-slate-100">Đăng xuất</button>
          </form>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
