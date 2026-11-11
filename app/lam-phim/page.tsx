import { connection } from 'next/server'
import { coKhoaGemini } from '@/lib/gemini'
import { coMatKhau, daMoKhoa } from '@/lib/khoa'
import { DAO_CU_2D, DS_KHU_2D, HANH_DONG_2D } from './danhMuc2d'
import FormMatKhau from './FormMatKhau'
import XuongPhim from './XuongPhim'

// Giọng đọc cho một đoạn dài có thể mất gần một phút
export const maxDuration = 60

const BUOC = [
  { id: 'cau-chuyen', so: 1, ten: 'Câu chuyện', mo: 'Ý chính, độ dài phim' },
  { id: 'nhan-vat', so: 2, ten: 'Nhân vật', mo: 'Ngoại hình, tính cách' },
  { id: 'kich-ban', so: 3, ten: 'Kịch bản', mo: 'Cảnh, lời thoại' },
  { id: 'dao-dien', so: 4, ten: 'Đạo diễn', mo: 'Chấm điểm, sửa' },
  { id: 'boi-canh', so: 5, ten: 'Bối cảnh', mo: 'Nơi chốn' },
  { id: 'dao-cu', so: 6, ten: 'Xưởng đạo cụ', mo: 'Gemini vẽ thêm đồ' },
  { id: 'xuat-may', so: 7, ten: 'Làm phim', mo: 'Tải kịch bản về máy' },
]

export default async function LamPhim() {
  // Luôn dựng trang lúc có người mở (không dựng sẵn lúc build) để đọc mật khẩu và khóa Gemini hiện hành
  await connection()
  if (!coMatKhau())
    return (
      <p className="mx-auto mt-16 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Trang chưa được đặt mật khẩu. Chủ trang vào Vercel → Settings → Environment Variables, thêm biến <b>MAT_KHAU_LAM_PHIM</b> (ít nhất 6 ký tự) rồi Redeploy.
      </p>
    )
  if (!(await daMoKhoa())) return <FormMatKhau />
  const so = [
    { gt: DS_KHU_2D.length, ten: 'khu vực bối cảnh' },
    { gt: Object.keys(DAO_CU_2D).length, ten: 'đạo cụ tương tác' },
    { gt: HANH_DONG_2D.length + 6, ten: 'hành động diễn xuất' },
    { gt: 25, ten: 'giọng đọc tiếng Việt' },
    { gt: '15′', ten: 'phim dài tối đa' },
  ]
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-extrabold tracking-tight text-chinh-dam">
            Công Nghệ 24H<span className="text-nhan"> Media</span>
          </p>
          <nav className="hidden items-center gap-1 text-sm font-medium text-phu md:flex">
            {BUOC.slice(0, 7).map((b) => (
              <a key={b.id} href={`#${b.id}`} className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-chinh">
                {b.ten}
              </a>
            ))}
          </nav>
          <span className="rounded-full bg-chinh px-3 py-1 text-xs font-semibold text-white">Xưởng phim 2D</span>
        </div>
      </header>

      <section className="bg-gradient-to-br from-chinh-dam via-chinh to-indigo-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Studio hoạt hình 2D tự động</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">Từ một ý tưởng thành phim hoạt hình hoàn chỉnh, dài tới 15 phút</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            AI viết truyện, thiết kế nhân vật, dàn dựng từng cảnh với bối cảnh sống, đạo cụ tương tác, góc máy điện ảnh. Máy nhà tự lồng tiếng, dựng hình, thêm tiếng động, nhạc nền và xuất bản ngang lẫn dọc.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {so.map((x) => (
              <div key={x.ten} className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
                <p className="text-2xl font-extrabold">{x.gt}</p>
                <p className="text-xs text-white/75">{x.ten}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-phu">Quy trình</p>
            <ol className="grid gap-0.5">
              {BUOC.map((b) => (
                <li key={b.id}>
                  <a href={`#${b.id}`} className="group flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-chinh group-hover:text-white">{b.so}</span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800 group-hover:text-chinh">{b.ten}</span>
                      <span className="block text-xs text-phu">{b.mo}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <b>Trên máy nhà:</b> kéo tệp kịch bản vào <code>XEM_TRUOC.bat</code> để duyệt storyboard, rồi vào <code>LAM_PHIM.bat</code> để xuất phim.
            </div>
          </div>
        </aside>
        <main className="min-w-0">
          <XuongPhim coAi={coKhoaGemini()} />
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-phu">© Công Nghệ 24H Media · Xưởng phim hoạt hình 2D</footer>
    </div>
  )
}
