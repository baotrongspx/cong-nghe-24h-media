'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { nhanLoiMoi } from '@/app/quan-ly/actions'

export default function NutNhanLoiMoi({ ma }: { ma: string }) {
  const router = useRouter()
  const [dang, chay] = useTransition()
  const [loi, setLoi] = useState('')
  return (
    <>
      <button
        disabled={dang}
        onClick={() =>
          chay(async () => {
            const r = await nhanLoiMoi(ma)
            if (r.ok) router.push('/quan-ly')
            else setLoi(r.thongBao ?? 'Có lỗi xảy ra')
          })
        }
        className="mt-6 w-full rounded-lg bg-chinh px-4 py-3 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50"
      >
        {dang ? 'Đang xử lý…' : 'Nhận lời mời'}
      </button>
      {loi && <p className="mt-3 text-sm text-red-600">{loi}</p>}
    </>
  )
}
