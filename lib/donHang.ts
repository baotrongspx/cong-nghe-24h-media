// Đơn hàng tạo trong khung chat. Dùng được cả phía máy chủ lẫn trình duyệt (không chứa bí mật).

export type SanPham = { ten: string; sl: number; gia: number }

export type DonHang = {
  id: string
  ma: number
  trang_id: string
  hoi_thoai_id: string | null
  nguoi_tao_id: string | null
  khach_ten: string
  so_dien_thoai: string
  dia_chi: string
  san_pham: SanPham[]
  phi_ship: number
  giam_gia: number
  tong: number
  ghi_chu: string
  trang_thai: TrangThaiDon
  tao_luc: string
}

export const COT_DON =
  'id, ma, trang_id, hoi_thoai_id, nguoi_tao_id, khach_ten, so_dien_thoai, dia_chi, san_pham, phi_ship, giam_gia, tong, ghi_chu, trang_thai, tao_luc'

export const TRANG_THAI_DON = {
  moi: ['Mới', 'bg-blue-100 text-blue-700'],
  xac_nhan: ['Đã xác nhận', 'bg-indigo-100 text-indigo-700'],
  dang_giao: ['Đang giao', 'bg-amber-100 text-amber-800'],
  da_giao: ['Đã giao', 'bg-green-100 text-green-700'],
  hoan: ['Hoàn / bom', 'bg-red-100 text-red-700'],
  huy: ['Đã hủy', 'bg-slate-100 text-phu'],
} as const

export type TrangThaiDon = keyof typeof TRANG_THAI_DON
export const DS_TRANG_THAI = Object.keys(TRANG_THAI_DON) as TrangThaiDon[]
// Đơn không tính vào doanh thu
export const KHONG_TINH_DOANH_THU: TrangThaiDon[] = ['hoan', 'huy']

export const tien = (n: number) => `${n.toLocaleString('vi-VN')}đ`

// "150k" → 150000, "1tr2" → 1200000, "150.000" → 150000
export function docTien(s: string) {
  const t = s.toLowerCase().replace(/\s|đ|vnd/g, '')
  const tr = t.match(/^(\d+(?:[.,]\d+)?)(?:tr|m)(\d*)$/)
  if (tr) return Math.round(Number(tr[1].replace(',', '.')) * 1_000_000 + (tr[2] ? Number(tr[2].padEnd(6, '0').slice(0, 6)) : 0))
  const k = t.match(/^(\d+(?:[.,]\d+)?)k$/)
  if (k) return Math.round(Number(k[1].replace(',', '.')) * 1000)
  return Number(t.replace(/[^\d]/g, '')) || 0
}

export const tienHang = (sp: SanPham[]) => sp.reduce((s, x) => s + x.sl * x.gia, 0)
export const tongDon = (d: { san_pham: SanPham[]; phi_ship: number; giam_gia: number }) =>
  Math.max(0, tienHang(d.san_pham) + d.phi_ship - d.giam_gia)

// Tin nhắn xác nhận gửi cho khách
export function noiDungXacNhan(d: Pick<DonHang, 'ma' | 'khach_ten' | 'so_dien_thoai' | 'dia_chi' | 'san_pham' | 'phi_ship' | 'giam_gia' | 'tong' | 'ghi_chu'>) {
  const dong = [`Xác nhận đơn hàng #${d.ma}`, ...d.san_pham.map((x) => `• ${x.ten} x${x.sl}: ${tien(x.sl * x.gia)}`)]
  if (d.phi_ship) dong.push(`Phí ship: ${tien(d.phi_ship)}`)
  if (d.giam_gia) dong.push(`Giảm giá: -${tien(d.giam_gia)}`)
  dong.push(`Tổng thanh toán: ${tien(d.tong)}`)
  if (d.khach_ten || d.so_dien_thoai) dong.push(`Người nhận: ${[d.khach_ten, d.so_dien_thoai].filter(Boolean).join(' - ')}`)
  if (d.dia_chi) dong.push(`Địa chỉ: ${d.dia_chi}`)
  if (d.ghi_chu) dong.push(`Ghi chú: ${d.ghi_chu}`)
  dong.push('Bạn kiểm tra giúp shop, có gì sai nhắn lại nhé. Cảm ơn bạn!')
  return dong.join('\n')
}
