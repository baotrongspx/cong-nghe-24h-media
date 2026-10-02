'use client'

import { useActionState } from 'react'
import { dangKyTuVan, type KetQua } from './actions'
import type { Goi } from '@/lib/thongTin'

const o = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-chinh focus:ring-2 focus:ring-chinh/20'

export default function FormDangKy({ goi }: { goi: Goi[] }) {
  const [kq, gui, dangGui] = useActionState<KetQua | null, FormData>(dangKyTuVan, null)

  if (kq?.ok)
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-4xl">✅</p>
        <p className="mt-3 text-lg font-semibold text-green-800">{kq.thongBao}</p>
      </div>
    )

  const loi = kq?.loi ?? {}
  return (
    <form action={gui} className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Họ tên *</span>
        <input name="ho_ten" required className={o} placeholder="Nguyễn Văn A" />
        {loi.ho_ten && <span className="text-sm text-red-600">{loi.ho_ten}</span>}
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Số điện thoại / Zalo *</span>
        <input name="so_dien_thoai" required inputMode="tel" className={o} placeholder="0912 345 678" />
        {loi.so_dien_thoai && <span className="text-sm text-red-600">{loi.so_dien_thoai}</span>}
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Tên cửa hàng / doanh nghiệp</span>
        <input name="ten_doanh_nghiep" className={o} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Lĩnh vực kinh doanh</span>
        <input name="linh_vuc" className={o} placeholder="Ví dụ: spa, nhà hàng, nội thất…" />
      </label>
      <label className="grid gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium">Gói quan tâm</span>
        <select name="goi_quan_tam" className={o} defaultValue="">
          <option value="">Chưa biết, cần tư vấn</option>
          {goi.map((g) => (
            <option key={g.ma} value={g.ma}>{g.ten}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium">Bạn cần hỗ trợ gì?</span>
        <textarea name="loi_nhan" rows={3} className={o} placeholder="Link Fanpage hiện tại, mục tiêu, thời gian muốn bắt đầu…" />
      </label>
      {kq && !kq.ok && <p className="text-sm font-medium text-red-600 sm:col-span-2">{kq.thongBao}</p>}
      <button
        disabled={dangGui}
        className="rounded-lg bg-nhan px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60 sm:col-span-2"
      >
        {dangGui ? 'Đang gửi…' : 'Nhận tư vấn miễn phí'}
      </button>
      <p className="text-xs text-phu sm:col-span-2">
        Thông tin chỉ dùng để liên hệ tư vấn. Xem <a href="/chinh-sach-bao-mat" className="underline">chính sách bảo mật</a>.
      </p>
    </form>
  )
}
