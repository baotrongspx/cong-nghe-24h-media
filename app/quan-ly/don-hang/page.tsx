import Link from 'next/link'
import { db } from '@/lib/db'
import { COT_DON, DS_TRANG_THAI, KHONG_TINH_DOANH_THU, TRANG_THAI_DON, tien, type DonHang, type TrangThaiDon } from '@/lib/donHang'
import { batBuocDangNhap, locDonHang } from '@/lib/phien'
import { NutHanhDong } from '../NutHanhDong'
import { xoaDon } from './actions'
import ChonTrangThai from './ChonTrangThai'

const KHOANG = [
  ['hom_nay', 'Hôm nay'],
  ['7_ngay', '7 ngày'],
  ['30_ngay', '30 ngày'],
  ['tat_ca', 'Tất cả'],
] as const

// Mốc bắt đầu khoảng thời gian, tính theo giờ Việt Nam
function tuNgay(khoang: string) {
  if (khoang === 'tat_ca') return null
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
  const dau = new Date(`${ngay}T00:00:00+07:00`)
  if (khoang === '7_ngay') dau.setDate(dau.getDate() - 6)
  if (khoang === '30_ngay') dau.setDate(dau.getDate() - 29)
  return dau.toISOString()
}

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default async function TrangDonHang({ searchParams }: PageProps<'/quan-ly/don-hang'>) {
  const phien = await batBuocDangNhap()
  const sp = await searchParams
  const lay = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '')
  const khoang = KHOANG.some(([k]) => k === lay('khoang')) ? lay('khoang') : '30_ngay'
  const tt = DS_TRANG_THAI.includes(lay('tt') as TrangThaiDon) ? lay('tt') : ''
  const trangLoc = phien.trangIds.includes(lay('trang')) ? lay('trang') : ''
  const q = lay('q').trim()

  const lienKet = (doi: Record<string, string>) => {
    const p = new URLSearchParams({ khoang, tt, trang: trangLoc, q, ...doi })
    for (const [k, v] of [...p]) if (!v || (k === 'khoang' && v === '30_ngay')) p.delete(k)
    return `/quan-ly/don-hang${p.size ? `?${p}` : ''}`
  }

  const tu = tuNgay(khoang) ?? '1970-01-01T00:00:00Z'
  const quyen = locDonHang({ ...phien, trangIds: trangLoc ? [trangLoc] : phien.trangIds })
  let ds = db().from('don_hang').select(COT_DON).gte('tao_luc', tu).order('tao_luc', { ascending: false }).limit(300)
  if (tt) ds = ds.eq('trang_thai', tt)
  const an = q.replace(/[%,()#]/g, ' ').trim()
  if (/^\d{1,7}$/.test(an)) ds = ds.eq('ma', Number(an)).or(quyen)
  else if (an) ds = ds.or(`and(or(${quyen}),or(khach_ten.ilike.%${an}%,so_dien_thoai.ilike.%${an}%))`)
  else ds = ds.or(quyen)

  const [{ data: dsDon, error }, { data: dsTk }, { data: dsTrang }] = await Promise.all([
    ds,
    // Thống kê theo khoảng thời gian và Page, không lọc theo trạng thái
    db().from('don_hang').select('trang_thai, tong').gte('tao_luc', tu).or(quyen).limit(10000),
    db().from('fb_trang').select('id, ten').in('id', phien.trangIds).order('ten'),
  ])
  const don = (dsDon ?? []) as DonHang[]
  const tk = (dsTk ?? []) as { trang_thai: TrangThaiDon; tong: number }[]
  const trang = (dsTrang ?? []) as { id: string; ten: string }[]
  const tenTrang = new Map(trang.map((t) => [t.id, t.ten]))
  const tinhDoanhThu = tk.filter((d) => !KHONG_TINH_DOANH_THU.includes(d.trang_thai))
  const doanhThu = tinhDoanhThu.reduce((s, d) => s + Number(d.tong), 0)
  const demTheo = (t: TrangThaiDon) => tk.filter((d) => d.trang_thai === t).length
  const tyLeHoan = tk.length ? Math.round((demTheo('hoan') / tk.length) * 100) : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Đơn hàng</h1>
            <p className="mt-1 text-sm text-phu">Tạo đơn ngay trong khung chat ở Hộp thư (nút 🧾 Đơn). Đơn hoàn và đơn hủy không tính vào doanh thu.</p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {KHOANG.map(([k, ten]) => (
              <Link key={k} href={lienKet({ khoang: k })} className={`rounded-md px-3 py-1 font-medium ${khoang === k ? 'bg-white text-chinh shadow-sm' : 'text-phu'}`}>
                {ten}
              </Link>
            ))}
          </nav>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Chưa tải được đơn hàng ({error.message}). Nếu vừa cập nhật phần mềm, hãy chạy lại file supabase/schema.sql để tạo bảng đơn hàng.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Doanh thu', tien(doanhThu)],
            ['Số đơn', `${tinhDoanhThu.length}`],
            ['Đang chờ xử lý', `${demTheo('moi') + demTheo('xac_nhan') + demTheo('dang_giao')}`],
            ['Tỷ lệ hoàn / bom', `${tyLeHoan}%`],
          ].map(([nhan, so]) => (
            <div key={nhan} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-phu">{nhan}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{so}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <Link href={lienKet({ tt: '' })} className={`rounded-full px-3 py-1 ${!tt ? 'bg-chinh text-white' : 'bg-white text-phu ring-1 ring-slate-200'}`}>
            Tất cả ({tk.length})
          </Link>
          {DS_TRANG_THAI.map((t) => (
            <Link key={t} href={lienKet({ tt: t })} className={`rounded-full px-3 py-1 ${tt === t ? 'bg-chinh text-white' : 'bg-white text-phu ring-1 ring-slate-200'}`}>
              {TRANG_THAI_DON[t][0]} ({demTheo(t)})
            </Link>
          ))}
        </div>

        <form action="/quan-ly/don-hang" className="mt-3 flex flex-wrap gap-2">
          {khoang !== '30_ngay' && <input type="hidden" name="khoang" value={khoang} />}
          {tt && <input type="hidden" name="tt" value={tt} />}
          <input name="q" defaultValue={q} placeholder="Tìm mã đơn, tên khách, SĐT…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          {trang.length > 1 && (
            <select name="trang" defaultValue={trangLoc} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Mọi Page</option>
              {trang.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ten}
                </option>
              ))}
            </select>
          )}
          <button className="rounded-lg bg-chinh px-4 py-1.5 text-sm font-semibold text-white">Lọc</button>
        </form>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-phu">
              <tr>
                <th className="px-3 py-2 font-medium">Đơn</th>
                <th className="px-3 py-2 font-medium">Khách</th>
                <th className="px-3 py-2 font-medium">Sản phẩm</th>
                <th className="px-3 py-2 text-right font-medium">Tổng</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!don.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-phu">
                    Chưa có đơn nào. Mở một hội thoại ở <Link href="/quan-ly" className="text-chinh hover:underline">Hộp thư</Link> và bấm 🧾 Đơn để tạo.
                  </td>
                </tr>
              )}
              {don.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-3 py-2">
                    <p className="font-semibold">#{d.ma}</p>
                    <p className="text-xs text-phu">{gio(d.tao_luc)}</p>
                    {trang.length > 1 && <p className="text-xs text-phu">{tenTrang.get(d.trang_id)}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{d.khach_ten || 'Khách'}</p>
                    {d.so_dien_thoai && <p className="text-phu">{d.so_dien_thoai}</p>}
                    {d.dia_chi && <p className="max-w-56 text-xs text-phu">{d.dia_chi}</p>}
                  </td>
                  <td className="px-3 py-2">
                    {d.san_pham.map((x, i) => (
                      <p key={i}>
                        {x.ten} <span className="text-phu">× {x.sl}</span>
                      </p>
                    ))}
                    {d.ghi_chu && <p className="text-xs text-amber-700">📝 {d.ghi_chu}</p>}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{tien(Number(d.tong))}</td>
                  <td className="px-3 py-2">
                    <ChonTrangThai id={d.id} trangThai={d.trang_thai} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {d.hoi_thoai_id && (
                      <Link href={`/quan-ly?h=${d.hoi_thoai_id}`} className="text-chinh hover:underline">
                        Chat
                      </Link>
                    )}
                    <NutHanhDong chay={xoaDon.bind(null, d.id)} xacNhan={`Xóa đơn #${d.ma}?`} className="ml-3 text-red-600 hover:underline">
                      Xóa
                    </NutHanhDong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {don.length === 300 && <p className="mt-2 text-xs text-phu">Đang hiện 300 đơn mới nhất, dùng bộ lọc để thu hẹp.</p>}
      </div>
    </div>
  )
}
