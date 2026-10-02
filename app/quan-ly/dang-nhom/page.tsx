import Link from 'next/link'
import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { NutHanhDong } from '../NutHanhDong'
import { themNhom, xoaNhom } from '../dang-bai/actions'
import NutMoNhom from './NutMoNhom'

const NGUONG_MOI_NGAY = 15
const ngay = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
// Đầu ngày hôm nay theo giờ Việt Nam (gọi ngoài render)
const dauNgayVN = () => new Date(`${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString()
const O = 'rounded-lg border border-slate-300 px-3 py-2 text-sm'

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
  const lanCuoi = (nhomId: string, baiId?: string) => daDang.find((d) => d.nhom_id === nhomId && (!baiId || d.bai_viet_id === baiId))?.dang_luc

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[2fr_3fr]">
        <section className="space-y-5">
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

          <form action={themNhom} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">Thêm nhóm đã tham gia</p>
            <input name="ten" required placeholder="Tên nhóm" className={O} />
            <input name="link" required type="url" placeholder="https://www.facebook.com/groups/..." className={O} />
            <input name="ghi_chu" placeholder="Ghi chú (quy định nhóm, ngày được đăng…)" className={O} />
            <button className="justify-self-start rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam">Thêm nhóm</button>
          </form>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">Nhóm của bạn ({nhom.length})</h2>
            <p className={`text-sm ${(homNay ?? 0) >= NGUONG_MOI_NGAY ? 'font-semibold text-red-600' : 'text-phu'}`}>Hôm nay đã đăng {homNay ?? 0} nhóm</p>
          </div>
          {(homNay ?? 0) >= NGUONG_MOI_NGAY && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Đăng cùng một nội dung vào quá nhiều nhóm trong ngày dễ bị Facebook đánh dấu spam và hạn chế nick. Nên nghỉ, mai đăng tiếp.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {!nhom.length && <li className="text-sm text-phu">Chưa có nhóm nào. Thêm link các nhóm bạn đã tham gia ở cột bên trái.</li>}
            {nhom.map((n) => {
              const baiNay = dangChon ? lanCuoi(n.id, dangChon.id) : undefined
              const batKy = lanCuoi(n.id)
              return (
                <li key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <a href={n.link} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                        {n.ten}
                      </a>
                      {n.ghi_chu && <p className="text-xs text-phu">{n.ghi_chu}</p>}
                      <p className="mt-1 text-xs text-phu">
                        {baiNay ? <span className="font-semibold text-green-700">Đã đăng bài này {ngay(baiNay)}</span> : 'Chưa đăng bài này'}
                        {batKy && ` · Lần đăng gần nhất ${ngay(batKy)}`}
                      </p>
                    </div>
                    <NutHanhDong chay={xoaNhom.bind(null, n.id)} xacNhan={`Xóa nhóm ${n.ten}?`} className="text-xs text-red-600 hover:underline">
                      Xóa
                    </NutHanhDong>
                  </div>
                  {dangChon && (
                    <div className="mt-3">
                      <NutMoNhom link={n.link} noiDung={dangChon.noi_dung} nhomId={n.id} baiId={dangChon.id} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
