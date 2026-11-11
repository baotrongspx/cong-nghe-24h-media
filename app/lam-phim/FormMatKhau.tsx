'use client'

import { useActionState } from 'react'
import { nhapMatKhau } from './actions'

export default function FormMatKhau() {
  const [loi, gui, dangGui] = useActionState(nhapMatKhau, null)
  return (
    <form action={gui} className="mx-auto mt-20 grid max-w-sm gap-3 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
      <p className="font-extrabold text-chinh-dam">Công Nghệ 24H<span className="text-nhan"> Media</span></p>
      <h1 className="text-xl font-bold">Xưởng phim hoạt hình 2D</h1>
      <p className="-mt-1 text-sm text-phu">Nhập mật khẩu để vào xưởng.</p>
      <label className="grid gap-1 text-sm font-medium">
        Mật khẩu
        <input name="mat_khau" type="password" required autoFocus autoComplete="current-password" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
      </label>
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      <button disabled={dangGui} className="rounded-lg bg-chinh px-3 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
        {dangGui ? 'Đang kiểm tra…' : 'Vào trang'}
      </button>
    </form>
  )
}
