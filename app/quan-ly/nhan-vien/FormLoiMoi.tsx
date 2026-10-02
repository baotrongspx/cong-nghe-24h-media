'use client'

import { useActionState, useState } from 'react'
import { taoLoiMoi } from '../actions'

export default function FormLoiMoi({ trang }: { trang: { id: string; ten: string }[] }) {
  const [kq, gui, dang] = useActionState(taoLoiMoi, null)
  const [daChep, setDaChep] = useState(false)
  const link = kq?.ok && kq.ma ? `${window.location.origin}/moi/${kq.ma}` : ''
  return (
    <form action={gui} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-semibold">Mời nhân viên</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {trang.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5">
            <input type="checkbox" name="trang_id" value={t.id} defaultChecked={trang.length === 1} /> {t.ten}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="chi_xem_cua_minh" /> Chỉ thấy hội thoại được giao cho mình
      </label>
      <button disabled={dang} className="justify-self-start rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
        {dang ? 'Đang tạo…' : 'Tạo link mời'}
      </button>
      {kq && !kq.ok && <p className="text-sm text-red-600">{kq.thongBao}</p>}
      {link && (
        <div className="rounded-lg bg-green-50 p-3 text-sm">
          <p className="text-green-800">Gửi link này cho nhân viên (Zalo, Messenger…). Dùng một lần, hết hạn sau 7 ngày:</p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-green-200 bg-white px-2 py-1" />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(link).then(() => setDaChep(true))}
              className="rounded bg-green-600 px-3 py-1 font-semibold text-white"
            >
              {daChep ? 'Đã chép' : 'Chép'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
