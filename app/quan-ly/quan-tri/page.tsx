import { db } from '@/lib/db'
import { GOI_CUOC, goiHieuLuc } from '@/lib/goiCuoc'
import { batBuocQuanTri } from '@/lib/phien'
import { capNhatKhach } from '../actions'

type Khach = {
  id: string
  ten: string
  anh: string | null
  goi: string
  het_han: string | null
  bi_khoa: boolean
  la_quan_tri: boolean
  ghi_chu: string | null
  tao_luc: string
  dang_nhap_luc: string | null
}

// Mốc thời gian cách đây `gio` giờ (gọi ngoài render)
const truoc = (gio: number) => new Date(Date.now() - gio * 3600_000).toISOString()
const ngay = (s: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—')
// Giá trị cho <input type="date"> theo giờ Việt Nam
const ngayInput = (s: string | null) => (s ? new Date(new Date(s).getTime() + 7 * 3600_000).toISOString().slice(0, 10) : '')

export default async function QuanTri({ searchParams }: PageProps<'/quan-ly/quan-tri'>) {
  await batBuocQuanTri()
  const { q } = await searchParams
  const tim = typeof q === 'string' ? q.trim() : ''

  const dem = (bang: string) => db().from(bang).select('*', { count: 'exact', head: true })

  let truyVan = db()
    .from('nguoi_dung')
    .select('id, ten, anh, goi, het_han, bi_khoa, la_quan_tri, ghi_chu, tao_luc, dang_nhap_luc')
    .order('tao_luc', { ascending: false })
    .limit(200)
  if (tim) truyVan = truyVan.ilike('ten', `%${tim.replace(/[%,]/g, ' ')}%`)

  const [{ count: tongKhach }, { count: khachMoi }, { count: tongTin24h }, { data: dsKhach }, { data: dsTrang }] = await Promise.all([
    dem('nguoi_dung'),
    dem('nguoi_dung').gte('tao_luc', truoc(24 * 7)),
    dem('tin').gte('tao_luc', truoc(24)),
    truyVan,
    db().from('trang_quan_tri').select('nguoi_dung_id, bat').neq('vai_tro', 'nhan_vien'),
  ])
  const khach = (dsKhach ?? []) as Khach[]
  const soTrang = new Map<string, { bat: number; tong: number }>()
  for (const r of dsTrang ?? []) {
    const s = soTrang.get(r.nguoi_dung_id) ?? { bat: 0, tong: 0 }
    s.tong++
    if (r.bat) s.bat++
    soTrang.set(r.nguoi_dung_id, s)
  }
  const tongTrang = [...soTrang.values()].reduce((a, s) => a + s.bat, 0)

  const the = [
    ['Tổng khách hàng', tongKhach],
    ['Khách mới 7 ngày', khachMoi],
    ['Fanpage đang quản lý', tongTrang],
    ['Tin nhắn + bình luận 24h', tongTin24h],
  ] as const
  const o = 'rounded-md border border-slate-300 px-2 py-1 text-sm'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Quản trị phần mềm</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {the.map(([nhan, so]) => (
            <div key={nhan} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-phu">{nhan}</p>
              <p className="mt-1 text-3xl font-extrabold">{(so ?? 0).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Khách hàng</h2>
          <form className="flex gap-2">
            <input name="q" defaultValue={tim} placeholder="Tìm theo tên…" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Tìm</button>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-nen text-left text-phu">
              <tr>
                <th className="px-3 py-2 font-medium">Khách</th>
                <th className="px-3 py-2 font-medium">Đăng ký / Đăng nhập</th>
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Gói · Hạn · Khóa · Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {khach.map((k) => {
                const { goi, daHet } = goiHieuLuc(k)
                const s = soTrang.get(k.id) ?? { bat: 0, tong: 0 }
                return (
                  <tr key={k.id} className={k.bi_khoa ? 'bg-red-50/50' : ''}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {k.anh && <img src={k.anh} alt="" className="h-8 w-8 rounded-full" />}
                        <div>
                          <p className="font-medium">
                            {k.ten} {k.la_quan_tri && <span className="rounded bg-chinh/10 px-1.5 text-xs text-chinh">Quản trị</span>}
                          </p>
                          <p className="text-xs text-phu">ID {k.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-phu">
                      {ngay(k.tao_luc)}
                      <br />
                      {ngay(k.dang_nhap_luc)}
                    </td>
                    <td className="px-3 py-2">
                      {s.bat}/{goi.soTrang}
                      {s.tong > s.bat && <span className="text-xs text-phu"> (+{s.tong - s.bat} tắt)</span>}
                    </td>
                    <td className="px-3 py-2">
                      <form action={capNhatKhach} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={k.id} />
                        <select name="goi" defaultValue={k.goi} className={o}>
                          {GOI_CUOC.map((g) => (
                            <option key={g.ma} value={g.ma}>{g.ten}</option>
                          ))}
                        </select>
                        <input type="date" name="het_han" defaultValue={ngayInput(k.het_han)} title="Để trống = không hết hạn" className={`${o} ${daHet ? 'border-red-400 text-red-600' : ''}`} />
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="bi_khoa" defaultChecked={k.bi_khoa} disabled={k.la_quan_tri} /> Khóa
                        </label>
                        <input name="ghi_chu" defaultValue={k.ghi_chu ?? ''} placeholder="Ghi chú (SĐT, đã trả tiền…)" className={`${o} w-48`} />
                        <button className="rounded-md bg-chinh px-3 py-1 text-sm font-semibold text-white hover:bg-chinh-dam">Lưu</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {!khach.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-phu">Chưa có khách hàng nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-phu">Hạn sử dụng để trống = không hết hạn. Gói trả phí hết hạn tự quay về gói Miễn phí.</p>
      </div>
    </div>
  )
}
