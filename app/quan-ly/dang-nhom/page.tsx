import Link from 'next/link'
import { db } from '@/lib/db'
import { daLenFacebook, linkChiaSe } from '@/lib/linkFacebook'
import { batBuocDangNhap } from '@/lib/phien'
import { ICanhBao, IChiaSe, ICong, IXuong, ThanhTienDo } from '../BieuTuong'
import DanhSachNhom, { FormThemNhieuNhom, type Nhom } from './DanhSachNhom'
import ChonBai from './ChonBai'
import NutChiaSe from './NutChiaSe'

const NGUONG_MOI_NGAY = 15
// Đầu ngày hôm nay theo giờ Việt Nam (gọi ngoài render)
const dauNgayVN = () => new Date(`${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString()
const ngay = (s: string) => new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default async function DangNhom({ searchParams }: PageProps<'/quan-ly/dang-nhom'>) {
  const { nguoiDung } = await batBuocDangNhap()
  const { bai: baiChon } = await searchParams
  const [{ data: dsBai }, { data: dsNhom }, { data: dsDaDang }, { count: homNay }] = await Promise.all([
    db().from('bai_viet').select('id, noi_dung, anh, bien_the, tao_luc, dang_trang (trang_id, trang_thai, hen_luc, fb_post_id, trang:trang_id (ten))').eq('nguoi_dung_id', nguoiDung.id).order('tao_luc', { ascending: false }).limit(30),
    db().from('nhom_fb').select('id, ten, link, ghi_chu').eq('nguoi_dung_id', nguoiDung.id).order('ten'),
    db().from('dang_nhom').select('nhom_id, bai_viet_id, dang_luc').eq('nguoi_dung_id', nguoiDung.id).order('dang_luc', { ascending: false }).limit(1000),
    db().from('dang_nhom').select('*', { count: 'exact', head: true }).eq('nguoi_dung_id', nguoiDung.id).gte('dang_luc', dauNgayVN()),
  ])
  const bai = (dsBai ?? []) as unknown as {
    id: string
    noi_dung: string
    anh: string[]
    bien_the: string[]
    tao_luc: string
    dang_trang: { trang_id: string; trang_thai: string; hen_luc: string | null; fb_post_id: string | null; trang: { ten: string } | null }[]
  }[]
  const dangChon = bai.find((b) => b.id === baiChon) ?? bai[0]
  const nhom = dsNhom ?? []
  // Bài này đã lên Fanpage nào: chia sẻ bài Page vào nhóm thì ảnh, nội dung tự đi kèm
  const baiTrenPage = (dangChon?.dang_trang ?? []).filter(daLenFacebook)
  const daDang = dsDaDang ?? []
  const lanCuoi = (nhomId: string, baiId?: string) => daDang.find((d) => d.nhom_id === nhomId && (!baiId || d.bai_viet_id === baiId))?.dang_luc ?? null
  const dsHienThi: Nhom[] = nhom.map((n) => ({ ...n, daDangBaiNay: dangChon ? lanCuoi(n.id, dangChon.id) : null, lanCuoi: lanCuoi(n.id) }))
  const soDaDangBaiNay = dsHienThi.filter((n) => n.daDangBaiNay).length
  const soHomNay = homNay ?? 0
  const quaNguong = soHomNay >= NGUONG_MOI_NGAY

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Đăng nhóm</h1>
          <p className="mt-1 text-sm text-phu">Phần mềm chép sẵn bài và mở đúng nhóm, bạn dán (Ctrl+V) rồi bấm Đăng. Nick an toàn vì người thật thao tác.</p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <aside className="space-y-4">
            {/* Bài sẽ đăng */}
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <h2 className="text-sm font-semibold">Bài sẽ đăng</h2>
                {bai.length > 1 && (
                  <ChonBai
                    dangChon={dangChon?.id}
                    bai={bai.map((b) => ({ id: b.id, tieuDe: b.noi_dung.split('\n')[0] || '(chỉ có ảnh)', anh: b.anh[0] ?? null, ngay: ngay(b.tao_luc) }))}
                  />
                )}
              </div>
              {dangChon ? (
                <div className="p-4">
                  {dangChon.anh.length > 0 && (
                    <div className={`mb-3 grid gap-1 overflow-hidden rounded-lg ${dangChon.anh.length > 1 ? 'grid-cols-2' : ''}`}>
                      {dangChon.anh.slice(0, 4).map((u, i) => (
                        <div key={u} className="relative">
                          <img src={u} alt="" className={`w-full object-cover ${dangChon.anh.length > 1 ? 'aspect-square' : 'max-h-56'}`} />
                          {i === 3 && dangChon.anh.length > 4 && (
                            <span className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-semibold text-white">+{dangChon.anh.length - 4}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="line-clamp-6 whitespace-pre-line text-sm">{dangChon.noi_dung || <span className="text-phu">(Không có chữ)</span>}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-phu">{ngay(dangChon.tao_luc)}</span>
                    {dangChon.anh.length > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-phu">{dangChon.anh.length} ảnh</span>}
                    {dangChon.bien_the.length > 0 && (
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 text-violet-700" title="Mỗi nhóm nhận một phiên bản, xoay vòng để đỡ bị coi là spam">
                        {dangChon.bien_the.length + 1} phiên bản nội dung
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="p-4 text-sm text-phu">
                  Chưa có bài.{' '}
                  <Link href="/quan-ly/dang-bai" className="font-medium text-chinh hover:underline">
                    Soạn bài
                  </Link>{' '}
                  (không cần chọn Page) rồi quay lại đây.
                </p>
              )}
            </section>

            {/* Tiến độ */}
            {dangChon && nhom.length > 0 && (
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-phu">Bài này đã đăng</p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums">
                    {soDaDangBaiNay}
                    <span className="text-sm font-medium text-phu">/{nhom.length} nhóm</span>
                  </p>
                  <div className="mt-2">
                    <ThanhTienDo phan={soDaDangBaiNay / nhom.length} mau="bg-green-600" />
                  </div>
                </div>
                <div className={`rounded-xl border p-3 ${quaNguong ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-xs text-phu">Hôm nay đã đăng</p>
                  <p className={`mt-0.5 text-lg font-bold tabular-nums ${quaNguong ? 'text-amber-800' : ''}`}>
                    {soHomNay}
                    <span className="text-sm font-medium text-phu">/{NGUONG_MOI_NGAY} nên dừng</span>
                  </p>
                  <div className="mt-2">
                    <ThanhTienDo phan={soHomNay / NGUONG_MOI_NGAY} mau={quaNguong ? 'bg-amber-500' : 'bg-chinh'} />
                  </div>
                </div>
              </section>
            )}
            {quaNguong && (
              <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <ICanhBao className="mt-0.5 h-4 w-4 shrink-0" />
                Đăng cùng một nội dung vào quá nhiều nhóm trong ngày dễ bị Facebook đánh dấu spam và hạn chế nick. Nên nghỉ, mai đăng tiếp.
              </p>
            )}

            {/* Cách nhanh: chia sẻ bài đã lên Fanpage */}
            {baiTrenPage.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-chinh/10 text-chinh">
                    <IChiaSe className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">Chia sẻ bài từ Fanpage</h2>
                    <p className="mt-0.5 text-xs text-phu">
                      Bài này đã lên Fanpage. Bấm nút → <b>Chia sẻ lên nhóm</b> → chọn nhóm → <b>Đăng</b>. Ảnh và nội dung tự đi kèm.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {baiTrenPage.map((d) => (
                    <NutChiaSe
                      key={d.fb_post_id}
                      link={linkChiaSe(d.fb_post_id!)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    >
                      <IChiaSe className="h-3.5 w-3.5" /> {d.trang?.ten ?? 'Page'}
                    </NutChiaSe>
                  ))}
                </div>
              </section>
            )}

            {/* Thêm nhóm */}
            <details open={!nhom.length} className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
                <ICong className="h-4 w-4 text-chinh" />
                Thêm nhóm từ Facebook
                <IXuong className="ml-auto h-4 w-4 text-phu transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100">
                <FormThemNhieuNhom />
              </div>
            </details>
          </aside>

          <section className="min-w-0">
            <h2 className="text-lg font-bold">
              Nhóm <span className="font-medium text-phu">({nhom.length})</span>
            </h2>
            <DanhSachNhom key={dangChon?.id ?? 'khong'} nhom={dsHienThi} bai={dangChon ? { id: dangChon.id, noiDung: dangChon.noi_dung, bienThe: dangChon.bien_the, anh: dangChon.anh } : null} />
          </section>
        </div>
      </div>
    </div>
  )
}
