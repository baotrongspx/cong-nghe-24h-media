import Link from 'next/link'
import { db } from '@/lib/db'
import { tien } from '@/lib/donHang'
import { batBuocDangNhap } from '@/lib/phien'
import { BieuDoCot, ChuGiai, MAU_1, MAU_2, type Cot } from './BieuDo'

type BaoCao = {
  tong: {
    tin_nhan: number
    binh_luan: number
    tin_ra: number
    tu_dong: number
    khach: number
    khach_moi: number
    luot: number
    luot_da_tra_loi: number
    trung_vi_giay: number | null
    cho_tra_loi: number
  }
  theo_ngay: { ngay: string; tin_nhan: number; binh_luan: number }[]
  theo_gio: { gio: number; so: number }[]
  nhan_vien: { id: string; so_tin: number; so_luot: number; trung_vi_giay: number | null; so_don: number; doanh_thu: number }[]
  don: { so_don: number; doanh_thu: number; hoan: number; huy: number; theo_ngay: { ngay: string; so_don: number; doanh_thu: number }[] }
}

const KHOANG = [
  ['hom_nay', 'Hôm nay', 1],
  ['7_ngay', '7 ngày', 7],
  ['30_ngay', '30 ngày', 30],
  ['90_ngay', '90 ngày', 90],
] as const

const so = (n: number) => Number(n).toLocaleString('vi-VN')
// 12.500.000 → "12,5 tr"
const rutGon = (n: number) =>
  n >= 1e9 ? `${so(+(n / 1e9).toFixed(1))} tỷ` : n >= 1e6 ? `${so(+(n / 1e6).toFixed(1))} tr` : n >= 1e3 ? `${so(+(n / 1e3).toFixed(1))}k` : so(n)
const thoiGian = (giay: number | null) =>
  giay == null ? '—' : giay < 60 ? `${Math.round(giay)} giây` : giay < 3600 ? `${Math.round(giay / 60)} phút` : `${so(+(giay / 3600).toFixed(1))} giờ`
const phanTram = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

// Ngày theo giờ Việt Nam, dạng YYYY-MM-DD
const ngayVN = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10)

function O({ nhan, gt, phu, canhBao }: { nhan: string; gt: string; phu?: React.ReactNode; canhBao?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${canhBao ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm text-phu">{nhan}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{gt}</p>
      {phu && <p className="mt-0.5 text-xs text-phu">{phu}</p>}
    </div>
  )
}

function The({ tieuDe, phu, children }: { tieuDe: string; phu?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold">{tieuDe}</h2>
        {phu}
      </div>
      {children}
    </section>
  )
}

export default async function TrangBaoCao({ searchParams }: PageProps<'/quan-ly/bao-cao'>) {
  const phien = await batBuocDangNhap()
  const sp = await searchParams
  const lay = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '')
  const [khoang, , soNgay] = KHOANG.find(([k]) => k === lay('khoang')) ?? KHOANG[1]
  const trangLoc = phien.trangIds.includes(lay('trang')) ? lay('trang') : ''
  const lienKet = (doi: Record<string, string>) => {
    const p = new URLSearchParams({ khoang, trang: trangLoc, ...doi })
    for (const [k, v] of [...p]) if (!v || (k === 'khoang' && v === '7_ngay')) p.delete(k)
    return `/quan-ly/bao-cao${p.size ? `?${p}` : ''}`
  }

  // Từ 0 giờ (giờ VN) của ngày đầu khoảng tới hết hôm nay
  const homNay = ngayVN(new Date())
  const tu = new Date(`${homNay}T00:00:00+07:00`)
  tu.setDate(tu.getDate() - (soNgay - 1))
  const den = new Date(`${homNay}T00:00:00+07:00`)
  den.setDate(den.getDate() + 1)

  const [{ data, error }, { data: dsTrang }] = await Promise.all([
    db().rpc('bao_cao', {
      p_tu: tu.toISOString(),
      p_den: den.toISOString(),
      p_trang: trangLoc ? [trangLoc] : phien.trangIds,
      p_chi_cua_minh: phien.chiCuaMinh,
      p_nguoi: phien.nguoiDung.id,
    }),
    db().from('fb_trang').select('id, ten').in('id', phien.trangIds).order('ten'),
  ])
  const trang = (dsTrang ?? []) as { id: string; ten: string }[]
  const bc = data as BaoCao | null

  const dauTrang = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Báo cáo</h1>
        <p className="mt-1 text-sm text-phu">Khách nhắn tới, tốc độ trả lời, đơn hàng và doanh thu. Tính theo giờ Việt Nam.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {trang.length > 1 && (
          <form action="/quan-ly/bao-cao" className="flex gap-2">
            {khoang !== '7_ngay' && <input type="hidden" name="khoang" value={khoang} />}
            <select name="trang" defaultValue={trangLoc} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
              <option value="">Mọi Page</option>
              {trang.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ten}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Xem</button>
          </form>
        )}
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {KHOANG.map(([k, ten]) => (
            <Link key={k} href={lienKet({ khoang: k })} className={`rounded-md px-3 py-1 font-medium ${khoang === k ? 'bg-white text-chinh shadow-sm' : 'text-phu'}`}>
              {ten}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )

  if (error || !bc) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {dauTrang}
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Chưa tải được báo cáo{error ? ` (${error.message})` : ''}. Hãy chạy lại file <b>supabase/schema.sql</b> trong Supabase → SQL Editor để tạo hàm báo cáo.
          </p>
        </div>
      </div>
    )
  }

  const { tong, don } = bc
  // Điền đủ mọi ngày trong khoảng (ngày không có tin = 0)
  const dsNgay = Array.from({ length: soNgay }, (_, i) => {
    const d = new Date(tu.getTime() + i * 86400_000)
    return ngayVN(d)
  })
  const tinTheoNgay = new Map(bc.theo_ngay.map((x) => [x.ngay, x]))
  const donTheoNgay = new Map(don.theo_ngay.map((x) => [x.ngay, x]))
  const nhanNgay = (n: string) => `${n.slice(8, 10)}/${n.slice(5, 7)}`
  const thuNgay = (n: string) => new Date(`${n}T12:00:00+07:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
  const moiNhan = soNgay > 30 ? 14 : soNgay > 7 ? 5 : 1

  const cotTin: Cot[] = dsNgay.map((n) => {
    const x = tinTheoNgay.get(n)
    return { nhan: nhanNgay(n), nhanDai: thuNgay(n), gt: [Number(x?.tin_nhan ?? 0), Number(x?.binh_luan ?? 0)] }
  })
  const cotDon: Cot[] = dsNgay.map((n) => {
    const x = donTheoNgay.get(n)
    return { nhan: nhanNgay(n), nhanDai: thuNgay(n), gt: [Number(x?.doanh_thu ?? 0)], chuThich: `${so(Number(x?.so_don ?? 0))} đơn` }
  })
  const gioMap = new Map(bc.theo_gio.map((x) => [x.gio, Number(x.so)]))
  const cotGio: Cot[] = Array.from({ length: 24 }, (_, g) => ({ nhan: `${g}h`, nhanDai: `${g}:00 – ${g}:59`, gt: [gioMap.get(g) ?? 0] }))
  const gioDinh = [...gioMap.entries()].sort((a, b) => b[1] - a[1])[0]

  // Tên nhân viên
  const ids = bc.nhan_vien.map((n) => n.id)
  const { data: dsNguoi } = ids.length ? await db().from('nguoi_dung').select('id, ten, anh').in('id', ids) : { data: [] }
  const nguoi = new Map((dsNguoi ?? []).map((n) => [n.id as string, n as { ten: string; anh: string | null }]))
  const nhanVien = [...bc.nhan_vien].sort((a, b) => Number(b.so_tin) - Number(a.so_tin))

  const tongTinVao = Number(tong.tin_nhan) + Number(tong.binh_luan)
  const doanhThu = Number(don.doanh_thu)
  const soDon = Number(don.so_don)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {dauTrang}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <O nhan="Khách nhắn tới" gt={so(tong.khach)} phu={`${so(tong.khach_moi)} khách mới`} />
          <O nhan="Tin nhắn & bình luận" gt={so(tongTinVao)} phu={`${so(tong.tin_nhan)} tin nhắn · ${so(tong.binh_luan)} bình luận`} />
          <O nhan="Phản hồi (trung vị)" gt={thoiGian(tong.trung_vi_giay)} phu={`${phanTram(tong.luot_da_tra_loi, tong.luot)} lượt được nhân viên trả lời`} />
          <O
            nhan="Đang chờ trả lời"
            gt={so(tong.cho_tra_loi)}
            phu={tong.cho_tra_loi ? <Link href="/quan-ly?loc=chua_doc" className="text-chinh hover:underline">Mở hộp thư →</Link> : 'Không còn khách nào chờ'}
            canhBao={tong.cho_tra_loi > 0}
          />
          <O nhan="Doanh thu" gt={rutGon(doanhThu)} phu={tien(doanhThu)} />
          <O nhan="Đơn hàng" gt={so(soDon)} phu={`Tỷ lệ chốt ${phanTram(soDon, tong.khach)} số khách`} />
          <O nhan="Giá trị trung bình / đơn" gt={soDon ? rutGon(Math.round(doanhThu / soDon)) : '—'} phu={`${so(don.hoan)} hoàn · ${so(don.huy)} hủy (không tính)`} />
          <O nhan="Tin tự động đã gửi" gt={so(tong.tu_dong)} phu={`Nhân viên gửi ${so(tong.tin_ra)} tin`} />
        </div>

        {soNgay > 1 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <The tieuDe="Tin nhắn & bình luận theo ngày" phu={<ChuGiai muc={[[MAU_1, 'Tin nhắn'], [MAU_2, 'Bình luận']]} />}>
              <BieuDoCot cot={cotTin} mau={[MAU_1, MAU_2]} tenChuoi={['Tin nhắn', 'Bình luận']} moiNhan={moiNhan} />
            </The>
            <The tieuDe="Doanh thu theo ngày" phu={<span className="text-xs text-phu">Không tính đơn hoàn, đơn hủy</span>}>
              <BieuDoCot cot={cotDon} mau={[MAU_1]} tenChuoi={['Doanh thu']} dinhDang={rutGon} moiNhan={moiNhan} />
            </The>
          </div>
        )}

        <The
          tieuDe="Giờ khách nhắn nhiều nhất"
          phu={gioDinh && <span className="text-xs text-phu">Cao điểm {gioDinh[0]}:00 – {gioDinh[0]}:59 · nên có người trực giờ này</span>}
        >
          <BieuDoCot cot={cotGio} mau={[MAU_1]} tenChuoi={['Tin nhắn & bình luận']} cao={140} moiNhan={3} />
        </The>

        <The tieuDe="Hiệu quả nhân viên" phu={<span className="text-xs text-phu">Phản hồi: từ lúc khách nhắn tới lúc nhân viên trả lời đầu tiên</span>}>
          {nhanVien.length ? (
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-slate-200 text-left text-phu">
                  <tr>
                    <th className="px-4 py-2 font-medium">Nhân viên</th>
                    <th className="px-4 py-2 text-right font-medium">Tin đã gửi</th>
                    <th className="px-4 py-2 text-right font-medium">Lượt trả lời</th>
                    <th className="px-4 py-2 text-right font-medium">Phản hồi (trung vị)</th>
                    <th className="px-4 py-2 text-right font-medium">Đơn</th>
                    <th className="px-4 py-2 text-right font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {nhanVien.map((n) => {
                    const p = nguoi.get(n.id)
                    return (
                      <tr key={n.id}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            {p?.anh ? <img src={p.anh} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-slate-200" />}
                            <span className="font-medium">
                              {p?.ten ?? 'Không rõ'}
                              {n.id === phien.nguoiDung.id && <span className="font-normal text-phu"> (tôi)</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">{so(n.so_tin)}</td>
                        <td className="px-4 py-2.5 text-right">{so(n.so_luot)}</td>
                        <td className="px-4 py-2.5 text-right">{thoiGian(n.trung_vi_giay)}</td>
                        <td className="px-4 py-2.5 text-right">{so(n.so_don)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{tien(Number(n.doanh_thu))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-phu">Chưa có nhân viên nào trả lời khách trong khoảng này.</p>
          )}
        </The>
      </div>
    </div>
  )
}
