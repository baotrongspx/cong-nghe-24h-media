import type { Metadata } from 'next'
import { soZalo } from '@/lib/thongTin'

export const metadata: Metadata = { title: 'Tài khoản tạm khóa', robots: { index: false } }

export default function BiKhoa() {
  const zalo = soZalo()
  return (
    <main className="flex flex-1 items-center justify-center bg-nen px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-xl font-bold">Tài khoản đang tạm khóa</h1>
        <p className="mt-2 text-phu">Vui lòng liên hệ bộ phận hỗ trợ để được mở lại.</p>
        {zalo && (
          <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener" className="mt-5 inline-block rounded-lg bg-[#0068ff] px-5 py-2.5 font-semibold text-white">
            Nhắn Zalo hỗ trợ
          </a>
        )}
        <form action="/api/fb/dang-xuat" method="post" className="mt-4">
          <button className="text-sm text-phu hover:underline">Đăng xuất</button>
        </form>
      </div>
    </main>
  )
}
