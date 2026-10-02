import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { caiDatTrang, goTrang } from '../actions'
import { CongTac, NutHanhDong } from '../NutHanhDong'

export default async function Fanpage() {
  const { trangIds } = await batBuocDangNhap()
  const { data } = await db()
    .from('fb_trang')
    .select('id, ten, anh, an_binh_luan_sdt, an_tat_ca_binh_luan')
    .in('id', trangIds)
    .order('ten')
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Fanpage đã kết nối</h1>
        <a href="/api/fb/dang-nhap" className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe5]">
          + Thêm / cập nhật Page
        </a>
      </div>
      <p className="mt-2 text-sm text-phu">Muốn thêm Page, bấm nút trên và tích chọn Page đó khi Facebook hỏi quyền.</p>
      <ul className="mt-6 space-y-4">
        {(data ?? []).map((t) => (
          <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              {t.anh && <img src={t.anh} alt="" className="h-10 w-10 rounded-full" />}
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
              <CongTac
                nhan="Tự ẩn bình luận có số điện thoại (chống đối thủ xin số khách)"
                bat={t.an_binh_luan_sdt}
                chay={caiDatTrang.bind(null, t.id, 'an_binh_luan_sdt')}
              />
              <CongTac nhan="Ẩn tất cả bình luận mới" bat={t.an_tat_ca_binh_luan} chay={caiDatTrang.bind(null, t.id, 'an_tat_ca_binh_luan')} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
