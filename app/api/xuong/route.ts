// Cổng cho công cụ LÀM PHIM HÀNG LOẠT trên máy nhà gọi các agent viết chữ (Gemini) của trang.
// Bảo vệ bằng đúng cookie mật khẩu của trang (máy nhà tự tính từ mật khẩu). Mỗi lần gọi là một bước nhỏ (< 60 giây).
import {
  agentDanY,
  agentKichBan,
  agentLamPhimMay,
  agentNhanVat,
  agentNhanVatTuLieu,
  layBachKhoa,
} from '../../lam-phim/actions'
import { daMoKhoa } from '@/lib/khoa'

export const maxDuration = 60

type Yeu = { buoc: string; [k: string]: unknown }
const S = (x: unknown) => String(x ?? '')
const A = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : [])

export async function POST(req: Request) {
  if (!(await daMoKhoa())) return Response.json({ ok: false, thongBao: 'Sai mật khẩu trang' }, { status: 401 })
  let y: Yeu
  try {
    y = (await req.json()) as Yeu
  } catch {
    return Response.json({ ok: false, thongBao: 'Yêu cầu không hợp lệ' }, { status: 400 })
  }
  const nv = A<{ ten: string; moTa: string; tinhCach?: string; giong?: string }>(y.nhanVat).map((n) => ({ ten: S(n.ten), moTa: S(n.moTa), tinhCach: S(n.tinhCach), giong: S(n.giong) }))
  switch (y.buoc) {
    case 'bach_khoa':
      return Response.json(await layBachKhoa(S(y.chuDe)))
    case 'nhan_vat_tu_lieu':
      return Response.json(await agentNhanVatTuLieu(S(y.tieuDe), S(y.noiDung)))
    case 'nhan_vat':
      return Response.json(await agentNhanVat(S(y.yChinh), S(y.phongCach), nv))
    case 'dan_y':
      return Response.json(await agentDanY(S(y.yChinh), Number(y.phut) || 2, nv, S(y.tuLieu)))
    case 'kich_ban':
      return Response.json(await agentKichBan(S(y.yChinh), Number(y.soCanh) || 4, 15, nv, S(y.nguCanh)))
    case 'dan_dung':
      return Response.json(
        await agentLamPhimMay({
          ten: S(y.ten),
          nhanVat: nv,
          canh: A<{ loi: string; hinh: string; boiCanh?: string }>(y.canh).map((c) => ({ loi: S(c.loi), hinh: S(c.hinh), boiCanh: S(c.boiCanh) })),
        }),
      )
    default:
      return Response.json({ ok: false, thongBao: `Không có bước "${y.buoc}"` }, { status: 400 })
  }
}
