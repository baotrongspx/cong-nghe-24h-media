import Link from 'next/link'
import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { batTatQuanLyTrang, caiDatTrang, goTrang } from '../actions'
import { CongTac, NutHanhDong } from '../NutHanhDong'

type Dong = {
  bat: boolean
  trang: { id: string; ten: string; anh: string | null; an_binh_luan_sdt: boolean; an_tat_ca_binh_luan: boolean }
}

export default async function Fanpage() {
  const { nguoiDung, goi, trangChu: trangIds } = await batBuocDangNhap()
  const { data } = await db()
    .from('trang_quan_tri')
    .select('bat, trang:trang_id (id, ten, anh, an_binh_luan_sdt, an_tat_ca_binh_luan)')
    .eq('nguoi_dung_id', nguoiDung.id)
    .neq('vai_tro', 'nhan_vien')
  const ds = ((data ?? []) as unknown as Dong[]).sort((a, b) => a.trang.ten.localeCompare(b.trang.ten, 'vi'))
  const dangQuanLy = new Set(trangIds)

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Fanpage đã kết nối</h1>
        <a href="/api/fb/dang-nhap" className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe5]">
          + Thêm / cập nhật Page
        </a>
      </div>
      <p className="mt-2 text-sm text-phu">
        Đang quản lý <b className="text-chu">{trangIds.length}/{goi.soTrang}</b> Page theo gói <b className="text-chu">{goi.ten}</b>.{' '}
        <Link href="/quan-ly/goi-cuoc" className="text-chinh hover:underline">Xem gói cước</Link>
        <br />
        Muốn thêm Page, bấm nút trên và tích chọn Page đó khi Facebook hỏi quyền.
      </p>
      <ul className="mt-6 space-y-4">
        {ds.map(({ bat, trang: t }) => (
          <li key={t.id} className={`rounded-xl border bg-white p-4 ${dangQuanLy.has(t.id) ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
            <div className="flex items-center gap-3">
              {t.anh && <img src={t.anh} alt="" className={`h-10 w-10 rounded-full ${dangQuanLy.has(t.id) ? '' : 'grayscale'}`} />}
              <div className="min-w-0 flex-1">
                <a href={`https://www.facebook.com/${t.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {t.ten}
                </a>
                <p className="text-xs text-phu">ID {t.id}</p>
              </div>
              <NutHanhDong chay={goTrang.bind(null, t.id)} xacNhan={`Gỡ ${t.ten} khỏi tài khoản của bạn?`} className="text-sm text-red-600 hover:underline">
                Gỡ
              </NutHanhDong>
            </div>
            <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              <CongTac nhan="Quản lý Page này (nhận tin nhắn, bình luận vào hộp thư)" bat={bat && dangQuanLy.has(t.id)} chay={batTatQuanLyTrang.bind(null, t.id)} />
              {dangQuanLy.has(t.id) && (
                <>
                  <CongTac
                    nhan="Tự ẩn bình luận có số điện thoại (chống đối thủ xin số khách)"
                    bat={t.an_binh_luan_sdt}
                    chay={caiDatTrang.bind(null, t.id, 'an_binh_luan_sdt')}
                  />
                  <CongTac nhan="Ẩn tất cả bình luận mới" bat={t.an_tat_ca_binh_luan} chay={caiDatTrang.bind(null, t.id, 'an_tat_ca_binh_luan')} />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
