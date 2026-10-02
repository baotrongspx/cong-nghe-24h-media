import Link from 'next/link'
import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { NutHanhDong } from '../NutHanhDong'
import { huyHenGio, xoaBaiViet } from './actions'
import SoanBai from './SoanBai'

type Bai = {
  id: string
  noi_dung: string
  anh: string[]
  bien_the: string[]
  tao_luc: string
  dang_trang: { id: string; trang_id: string; hen_luc: string | null; fb_post_id: string | null; trang_thai: string; loi: string | null }[]
}

const gio = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const TRANG_THAI: Record<string, [string, string]> = {
  da_dang: ['Đã đăng', 'bg-green-100 text-green-700'],
  da_hen: ['Đã hẹn', 'bg-blue-100 text-blue-700'],
  loi: ['Lỗi', 'bg-red-100 text-red-700'],
  da_huy: ['Đã hủy', 'bg-slate-100 text-phu'],
}

export default async function DangBai() {
  const { nguoiDung, trangChu } = await batBuocDangNhap()
  const [{ data: dsTrang }, { data: dsBai }] = await Promise.all([
    db().from('fb_trang').select('id, ten').in('id', trangChu).order('ten'),
    db()
      .from('bai_viet')
      .select('id, noi_dung, anh, bien_the, tao_luc, dang_trang (id, trang_id, hen_luc, fb_post_id, trang_thai, loi)')
      .eq('nguoi_dung_id', nguoiDung.id)
      .order('tao_luc', { ascending: false })
      .limit(50),
  ])
  const trang = (dsTrang ?? []) as { id: string; ten: string }[]
  const tenTrang = new Map(trang.map((t) => [t.id, t.ten]))
  const bai = (dsBai ?? []) as Bai[]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[2fr_3fr]">
        <section className="min-w-0">
          <h1 className="text-2xl font-bold">Đăng bài</h1>
          <p className="mt-1 text-sm text-phu">Soạn một lần, đăng ngay hoặc hẹn giờ lên nhiều Fanpage. Bài hẹn giờ nằm trong mục Bài viết đã lên lịch của Page.</p>
          <div className="mt-4">
            <SoanBai trang={trang} />
          </div>
        </section>
        <section className="min-w-0">
          <h2 className="text-xl font-bold">Thư viện bài viết</h2>
          <ul className="mt-4 space-y-3">
            {!bai.length && <li className="text-sm text-phu">Chưa có bài viết nào.</li>}
            {bai.map((b) => (
              <li key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex gap-3">
                  {b.anh[0] && <img src={b.anh[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm">{b.noi_dung || <i className="text-phu">(chỉ có ảnh)</i>}</p>
                    <p className="mt-1 text-xs text-phu">
                      {gio(b.tao_luc)}
                      {b.anh.length > 0 && ` · ${b.anh.length} ảnh`}
                      {b.bien_the.length > 0 && ` · ${b.bien_the.length + 1} phiên bản`}
                    </p>
                  </div>
                </div>
                {b.dang_trang.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-sm">
                    {b.dang_trang.map((d) => {
                      const [nhan, mau] = TRANG_THAI[d.trang_thai] ?? [d.trang_thai, '']
                      return (
                        <li key={d.id} className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 text-xs font-semibold ${mau}`}>{nhan}</span>
                          <span className="font-medium">{tenTrang.get(d.trang_id) ?? 'Page'}</span>
                          {d.hen_luc && <span className="text-xs text-phu">lúc {gio(d.hen_luc)}</span>}
                          {d.fb_post_id && d.trang_thai === 'da_dang' && (
                            <a href={`https://www.facebook.com/${d.fb_post_id}`} target="_blank" rel="noreferrer" className="text-xs text-chinh hover:underline">
                              Xem bài
                            </a>
                          )}
                          {d.trang_thai === 'da_hen' && (
                            <NutHanhDong chay={huyHenGio.bind(null, d.id)} xacNhan="Hủy bài hẹn giờ này trên Facebook?" className="text-xs text-red-600 hover:underline">
                              Hủy hẹn
                            </NutHanhDong>
                          )}
                          {d.loi && <span className="w-full text-xs text-red-600">{d.loi}</span>}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2 text-sm">
                  <Link href={`/quan-ly/dang-nhom?bai=${b.id}`} className="font-semibold text-chinh hover:underline">
                    Đăng vào nhóm →
                  </Link>
                  <NutHanhDong chay={xoaBaiViet.bind(null, b.id)} xacNhan="Xóa bài khỏi thư viện? (Bài đã đăng trên Facebook không bị xóa)" className="ml-auto text-red-600 hover:underline">
                    Xóa
                  </NutHanhDong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
