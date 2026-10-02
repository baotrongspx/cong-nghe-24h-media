'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IXong, IXuong } from '../BieuTuong'

export type BaiNgan = { id: string; tieuDe: string; anh: string | null; ngay: string }

// Đổi bài sẽ đăng: danh sách bài gần đây có ảnh thu nhỏ
export default function ChonBai({ bai, dangChon }: { bai: BaiNgan[]; dangChon?: string }) {
  const router = useRouter()
  const [mo, setMo] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMo(!mo)}
        aria-expanded={mo}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-chinh hover:bg-chinh/5"
      >
        Đổi bài <IXuong className={`h-4 w-4 transition ${mo ? 'rotate-180' : ''}`} />
      </button>
      {mo && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMo(false)} />
          <ul className="absolute right-0 z-30 mt-1 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {bai.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMo(false)
                    if (b.id !== dangChon) router.push(`/quan-ly/dang-nhom?bai=${b.id}`)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50 ${b.id === dangChon ? 'bg-chinh/5' : ''}`}
                >
                  {b.anh ? (
                    <img src={b.anh} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-xs text-phu">Aa</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm">{b.tieuDe}</span>
                    <span className="text-xs text-phu">{b.ngay}</span>
                  </span>
                  {b.id === dangChon && <IXong className="h-4 w-4 shrink-0 text-chinh" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
