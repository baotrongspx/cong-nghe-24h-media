import type { Metadata } from 'next'
import Link from 'next/link'
import FormDangKy from '../FormDangKy'
import { GOI, MO_TA, TEN, email, soZalo } from '@/lib/thongTin'

export const metadata: Metadata = { title: { absolute: `Dịch vụ chăm sóc Fanpage, Zalo OA, TikTok | ${TEN}` }, description: MO_TA }

const VAN_DE = [
  ['📉', 'Page đăng bài thất thường', 'Bận bán hàng nên tuần đăng, tuần nghỉ; khách vào thấy Page "chết".'],
  ['💬', 'Bỏ lỡ tin nhắn', 'Khách hỏi giá lúc tối muộn, sáng hôm sau mới trả lời thì khách đã mua chỗ khác.'],
  ['🤷', 'Không biết hiệu quả ra sao', 'Bỏ tiền thuê làm nhưng không có báo cáo rõ ràng.'],
]

const QUY_TRINH = [
  ['Tư vấn', 'Tìm hiểu sản phẩm, khách hàng mục tiêu và tình trạng các kênh hiện có.'],
  ['Lên kế hoạch', 'Gửi lịch nội dung cả tháng để bạn xem trước và góp ý.'],
  ['Duyệt bài', 'Bạn duyệt từng bài trước khi đăng. Bài nào bạn chưa đồng ý thì không đăng.'],
  ['Đăng & chăm sóc', 'Đăng đúng lịch, trả lời bình luận, tin nhắn trong giờ làm việc.'],
  ['Báo cáo', 'Cuối tháng gửi số liệu: lượt tiếp cận, tương tác, tin nhắn, kèm đề xuất cho tháng sau.'],
]

const CAM_KET = [
  'Chỉ dùng công cụ chính thức của Facebook, Zalo, TikTok. Không dùng phần mềm lậu đăng nhập vào tài khoản của bạn.',
  'Không bán like, follow ảo: dễ bị nền tảng phạt, giảm tiếp cận, thậm chí khóa Page.',
  'Nick Facebook cá nhân chỉ được nhân viên chăm sóc thủ công, không chạy tool tự động.',
  'Bạn luôn giữ quyền quản trị cao nhất trên Page và Zalo OA của mình.',
]

const HOI_DAP = [
  ['Bảng giá thế nào?', 'Giá tùy số kênh, số bài mỗi tháng và lĩnh vực. Bạn để lại thông tin, chúng tôi gửi báo giá cụ thể trong ngày làm việc.'],
  ['Tôi có phải giao mật khẩu không?', 'Không. Bạn chỉ cần thêm chúng tôi làm biên tập viên hoặc quản trị viên trên Page và Zalo OA, và có thể gỡ bất cứ lúc nào.'],
  ['Có ký hợp đồng không, tối thiểu bao lâu?', 'Có hợp đồng dịch vụ theo tháng. Nên thử tối thiểu 3 tháng để nội dung đủ thời gian phát huy.'],
  ['Phí quảng cáo có nằm trong gói không?', 'Không. Tiền chạy quảng cáo bạn trả thẳng cho Facebook/TikTok. Chúng tôi có thể tư vấn và quản lý giúp nếu cần.'],
]

const LICH_MAU = [
  ['T2', 'Fanpage', 'Giới thiệu sản phẩm mới', 'Đã duyệt', 'bg-green-100 text-green-700'],
  ['T3', 'Zalo OA', 'Tin nhắn ưu đãi khách cũ', 'Đã duyệt', 'bg-green-100 text-green-700'],
  ['T4', 'TikTok', 'Video hậu trường 30 giây', 'Chờ duyệt', 'bg-amber-100 text-amber-700'],
  ['T6', 'Fanpage', 'Chia sẻ cảm nhận khách hàng', 'Đang soạn', 'bg-slate-100 text-slate-600'],
]

export default function TrangChu() {
  const zalo = soZalo()
  const mail = email()
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-chinh-dam">
            Công Nghệ 24H<span className="text-nhan"> Media</span>
          </Link>
          <nav className="hidden gap-7 text-[15px] font-medium text-phu md:flex">
            <a href="#dich-vu" className="hover:text-chinh">Dịch vụ</a>
            <a href="#quy-trinh" className="hover:text-chinh">Quy trình</a>
            <a href="#hoi-dap" className="hover:text-chinh">Hỏi đáp</a>
            <Link href="/" className="hover:text-chinh">Phần mềm 24H Page</Link>
          </nav>
          <a href="#dang-ky" className="rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam">
            Nhận tư vấn
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Mở đầu */}
        <section className="bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
            <div>
              <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-chinh">
                Fanpage · Zalo OA · TikTok
              </p>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Kênh bán hàng online <span className="text-chinh">luôn hoạt động</span>, bạn chỉ cần tập trung bán hàng
              </h1>
              <p className="mt-5 max-w-xl text-lg text-phu">
                Chúng tôi lên kế hoạch nội dung, đăng bài, trả lời khách và báo cáo hằng tháng cho Fanpage, Zalo OA và
                TikTok của doanh nghiệp bạn.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#dang-ky" className="rounded-lg bg-nhan px-6 py-3 font-semibold text-white shadow-sm hover:brightness-105">
                  Nhận tư vấn miễn phí
                </a>
                <a href="#dich-vu" className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold hover:border-chinh hover:text-chinh">
                  Xem các gói dịch vụ
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5">
              <p className="text-sm font-semibold text-phu">Lịch nội dung tuần này</p>
              <ul className="mt-4 grid gap-3 text-[15px]">
                {LICH_MAU.map(([ngay, kenh, bai, tt, mau]) => (
                  <li key={ngay} className="flex items-center gap-3 rounded-lg bg-nen p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white font-bold text-chinh shadow-sm">{ngay}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{bai}</span>
                      <span className="text-sm text-phu">{kenh}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${mau}`}>{tt}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-phu">Minh họa cổng khách hàng: bạn xem lịch và duyệt bài trước khi đăng.</p>
            </div>
          </div>
        </section>

        {/* Vấn đề */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Bạn có đang gặp những chuyện này?</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {VAN_DE.map(([icon, tieuDe, moTa]) => (
              <div key={tieuDe} className="rounded-2xl border border-slate-200 p-6">
                <p className="text-3xl">{icon}</p>
                <h3 className="mt-3 text-lg font-semibold">{tieuDe}</h3>
                <p className="mt-2 text-phu">{moTa}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gói dịch vụ */}
        <section id="dich-vu" className="scroll-mt-16 bg-nen py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Các gói dịch vụ</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-phu">
              Giá được báo theo số kênh, số bài mỗi tháng và lĩnh vực của bạn. Để lại thông tin để nhận báo giá cụ thể.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {GOI.map((g) => (
                <div
                  key={g.ma}
                  className={`relative flex flex-col rounded-2xl bg-white p-7 ${g.noiBat ? 'border-2 border-chinh shadow-xl shadow-blue-900/10' : 'border border-slate-200'}`}
                >
                  {g.noiBat && (
                    <span className="absolute -top-3 left-7 rounded-full bg-chinh px-3 py-1 text-xs font-semibold text-white">
                      Phổ biến
                    </span>
                  )}
                  <h3 className="text-xl font-bold">{g.ten}</h3>
                  <p className="mt-2 min-h-12 text-sm text-phu">{g.danhCho}</p>
                  <p className="mt-5 text-2xl font-extrabold text-chinh-dam">Liên hệ báo giá</p>
                  <ul className="mt-6 grid flex-1 content-start gap-3 text-[15px]">
                    {g.gom.map((x) => (
                      <li key={x} className="flex gap-2.5">
                        <span className="mt-0.5 text-chinh">✔</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#dang-ky"
                    className={`mt-7 rounded-lg px-5 py-2.5 text-center font-semibold ${g.noiBat ? 'bg-chinh text-white hover:bg-chinh-dam' : 'border border-slate-300 hover:border-chinh hover:text-chinh'}`}
                  >
                    Nhận báo giá
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quy trình */}
        <section id="quy-trinh" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Cách chúng tôi làm việc</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-5">
            {QUY_TRINH.map(([tieuDe, moTa], i) => (
              <li key={tieuDe} className="rounded-2xl border border-slate-200 p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-chinh font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{tieuDe}</h3>
                <p className="mt-1.5 text-sm text-phu">{moTa}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Cam kết */}
        <section className="bg-chinh-dam py-16 text-white">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">An toàn cho tài khoản của bạn</h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {CAM_KET.map((x) => (
                <li key={x} className="flex gap-3 rounded-xl bg-white/10 p-5">
                  <span className="text-xl">🛡️</span>
                  <span className="text-blue-50">{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Hỏi đáp */}
        <section id="hoi-dap" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Câu hỏi thường gặp</h2>
          <div className="mt-8 grid gap-3">
            {HOI_DAP.map(([hoi, dap]) => (
              <details key={hoi} className="group rounded-xl border border-slate-200 p-5 open:bg-nen">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {hoi}
                  <span className="text-xl text-chinh transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-phu">{dap}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Đăng ký */}
        <section id="dang-ky" className="scroll-mt-16 bg-nen py-16">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Nhận tư vấn & báo giá miễn phí</h2>
              <p className="mt-4 text-phu">
                Để lại thông tin, chúng tôi gọi lại trong giờ làm việc để tìm hiểu nhu cầu và gửi báo giá phù hợp.
              </p>
              {zalo && (
                <a
                  href={`https://zalo.me/${zalo}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0068ff] px-5 py-3 font-semibold text-white hover:brightness-110"
                >
                  💬 Chat Zalo ngay
                </a>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <FormDangKy goi={GOI} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-sm text-phu">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} {TEN}</p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            {zalo && <a href={`https://zalo.me/${zalo}`} className="hover:text-chinh">Zalo: {zalo}</a>}
            {mail && <a href={`mailto:${mail}`} className="hover:text-chinh">{mail}</a>}
            <a href="/chinh-sach-bao-mat" className="hover:text-chinh">Chính sách bảo mật</a>
          </p>
        </div>
      </footer>

      {zalo && (
        <a
          href={`https://zalo.me/${zalo}`}
          target="_blank"
          rel="noopener"
          aria-label="Chat Zalo"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#0068ff] text-sm font-bold text-white shadow-lg hover:scale-105"
        >
          Zalo
        </a>
      )}
    </>
  )
}
