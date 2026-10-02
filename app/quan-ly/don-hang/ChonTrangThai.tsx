'use client'

import { useTransition } from 'react'
import { DS_TRANG_THAI, TRANG_THAI_DON, type TrangThaiDon } from '@/lib/donHang'
import { doiTrangThaiDon } from './actions'

export default function ChonTrangThai({ id, trangThai }: { id: string; trangThai: TrangThaiDon }) {
  const [dang, chay] = useTransition()
  return (
    <select
      value={trangThai}
      disabled={dang}
      aria-label="Trạng thái đơn"
      onChange={(e) => chay(() => doiTrangThaiDon(id, e.target.value as TrangThaiDon))}
      className={`rounded px-1.5 py-0.5 text-xs font-semibold disabled:opacity-50 ${TRANG_THAI_DON[trangThai][1]}`}
    >
      {DS_TRANG_THAI.map((t) => (
        <option key={t} value={t}>
          {TRANG_THAI_DON[t][0]}
        </option>
      ))}
    </select>
  )
}
