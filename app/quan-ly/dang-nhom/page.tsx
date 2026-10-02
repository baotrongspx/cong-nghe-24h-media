import Link from 'next/link'
import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import DanhSachNhom, { FormThemNhieuNhom, type Nhom } from './DanhSachNhom'

const NGUONG_MOI_NGAY = 15
// Đầu ngày hôm nay theo giờ Việt Nam (gọi ngoài render)
const dauNgayVN = () => new Date(`${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString()

export default async function DangNhom({ searchParams }: PageProps<'/quan-ly/dang-nhom'>) {
  const { nguoiDung } = await batBuocDangNhap()
  const { bai: baiChon } = await searchParams
  const [{ data: dsBai }, { data: dsNhom }, { data: dsDaDang }, { count: homNay }] = await Promise.all([
    db().from('bai_viet').select('id, noi_dung, anh').eq('nguoi_dung_id', nguoiDung.id).order('tao_luc', { ascending: false }).limit(30),
    db().from('nhom_fb').select('id, ten, link, ghi_chu').eq('nguoi_dung_id', nguoiDung.id).order('ten'),
    db().from('dang_nhom').select('nhom_id, bai_viet_id, dang_luc').eq('nguoi_dung_id', nguoiDung.id).order('dang_luc', { ascending: false }).limit(1000),
    db().from('dang_nhom').select('*', { count: 'exact', head: true }).eq('nguoi_dung_id', nguoiDung.id).gte('dang_luc', dauNgayVN()),
  ])
  const bai = (dsBai ?? []) as { id: string; noi_dung: string; anh: string[] }[]
  const dangChon = bai.find((b) => b.id === baiChon) ?? bai[0]
  const nhom = dsNhom ?? []
  const daDang = dsDaDang ?? []
  const lanCuoi = (nhomId: string, baiId?: string) => daDang.find((d) => d.nhom_id === nhomId && (!baiId || d.bai_viet_id === baiId))?.dang_luc ?? null
  const dsHienThi: Nhom[] = nhom.map((n) => ({ ...n, daDangBaiNay: dangChon ? lanCuoi(n.id, dangChon.id) : null, lanCuoi: lanCuoi(n.id) }))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[2fr_3fr]">
        <section className="min-w-0 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Trợ lý đăng nhóm</h1>
            <p className="mt-1 text-sm text-phu">
              Facebook không cho phần mềm tự đăng vào nhóm. Trợ lý chép sẵn nội dung và mở đúng nhóm, bạn chỉ cần dán (Ctrl+V), kéo ảnh vào và bấm Đăng
              trên Facebook. Nick của bạn an toàn vì người thật thao tác.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">Chọn bài để đăng</p>
            {bai.length ? (
              <ul className="mt-2 space-y-1">
                {bai.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/quan-ly/dang-nhom?bai=${b.id}`}
                      className={`block truncate rounded-md px-2 py-1.5 text-sm ${b.id === dangChon?.id ? 'bg-chinh/10 font-semibold text-chinh' : 'hover:bg-slate-50'}`}
                    >
                      {b.noi_dung.split('\n')[0] || '(chỉ có ảnh)'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-phu">
                Chưa có bài. <Link href="/quan-ly/dang-bai" className="text-chinh hover:underline">Soạn bài</Link> (không cần chọn Page) rồi quay lại đây.
              </p>
            )}
          </div>

          {dangChon && dangChon.anh.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold">Ảnh của bài</p>
              <p className="text-xs text-phu">Kéo ảnh thả vào ô đăng bài của Facebook, hoặc bấm để mở ảnh rồi lưu về máy.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dangChon.anh.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <FormThemNhieuNhom />
        </section>

        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">Nhóm của bạn ({nhom.length})</h2>
            <p className={`text-sm ${(homNay ?? 0) >= NGUONG_MOI_NGAY ? 'font-semibold text-red-600' : 'text-phu'}`}>Hôm nay đã đăng {homNay ?? 0} nhóm</p>
          </div>
          {(homNay ?? 0) >= NGUONG_MOI_NGAY && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Đăng cùng một nội dung vào quá nhiều nhóm trong ngày dễ bị Facebook đánh dấu spam và hạn chế nick. Nên nghỉ, mai đăng tiếp.
            </p>
          )}
          <DanhSachNhom key={dangChon?.id ?? 'khong'} nhom={dsHienThi} bai={dangChon ? { id: dangChon.id, noiDung: dangChon.noi_dung } : null} />
        </section>
      </div>
    </div>
  )
}
