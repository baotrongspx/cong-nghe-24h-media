import Link from 'next/link'
import BangGia from './BangGia'
import { TEN_PHAN_MEM } from '@/lib/goiCuoc'
import { TEN, email, soZalo } from '@/lib/thongTin'

const VAN_DE = [
  ['😵', 'Tin nhắn, bình luận rải rác', 'Mỗi Page một nơi, mở đi mở lại trên điện thoại, khách hỏi giá mà quên trả lời.'],
  ['🕵️', 'Đối thủ "cướp" khách', 'Khách để lại số điện thoại dưới bài viết, shop khác vào xin số và gọi trước bạn.'],
  ['⌨️', 'Gõ đi gõ lại một câu', 'Giá bao nhiêu, ship thế nào, số tài khoản… ngày nào cũng gõ hàng chục lần.'],
]

const TINH_NANG = [
  ['📥', 'Hộp thư chung', 'Tin nhắn Messenger và bình luận của mọi Fanpage về một màn hình, cập nhật liên tục.'],
  ['🙈', 'Tự ẩn bình luận có SĐT', 'Bình luận chứa số điện thoại được ẩn ngay, chỉ bạn và khách thấy. Đối thủ không xin được số.'],
  ['📞', 'Tự bắt số điện thoại', 'Số khách gửi trong tin nhắn, bình luận được lưu vào hồ sơ hội thoại, lọc nhanh khách có số.'],
  ['🤖', 'Tự trả lời theo từ khóa', 'Khách nhắn "giá", "ship", "còn hàng không"… hệ thống trả lời ngay, cả lúc nửa đêm.'],
  ['⚡', 'Mẫu câu trả lời nhanh', 'Gõ /gia, /stk, /ship để chèn câu trả lời soạn sẵn. Nhanh gấp nhiều lần gõ tay.'],
  ['🏷️', 'Gắn thẻ & lọc khách', 'Phân loại Đã chốt, Hỏi giá, Bom hàng… Lọc theo thẻ, theo Page, chưa đọc, có SĐT.'],
  ['💬', 'Trả lời công khai hoặc nhắn riêng', 'Trả lời ngay dưới bình luận hoặc nhắn thẳng vào inbox của người bình luận.'],
  ['🗂️', 'Quản lý nhiều Fanpage', 'Kết nối nhiều Page trên một tài khoản, bật tắt từng Page, cài đặt riêng cho từng Page.'],
]

const SAP_CO = ['Tạo đơn hàng ngay trong khung chat', 'Chốt đơn tự động khi livestream', 'Nhân viên & chia hội thoại', 'Báo cáo tin nhắn, đơn hàng, doanh thu', 'Zalo OA, Instagram, TikTok']

const BUOC = [
  ['Đăng nhập bằng Facebook', 'Không cần tạo tài khoản, không cần cài đặt phần mềm.'],
  ['Chọn Fanpage', 'Tích chọn các Page muốn quản lý khi Facebook hỏi quyền.'],
  ['Bắt đầu trả lời khách', 'Tin nhắn, bình luận mới đổ về hộp thư ngay lập tức.'],
]

const AN_TOAN = [
  'Kết nối qua API chính thức của Meta (Facebook). Không yêu cầu mật khẩu Facebook.',
  'Bạn chọn Page nào được kết nối và có thể gỡ quyền bất cứ lúc nào trong cài đặt Facebook.',
  'Không đăng nhập hộ, không dùng tool giả lập trình duyệt nên không lo bị khóa nick, khóa Page.',
  'Dữ liệu tin nhắn của shop chỉ shop xem được.',
]

const HOI_DAP = [
  ['Phần mềm có mất phí không?', 'Trong giai đoạn ra mắt, gói Miễn phí dùng được đầy đủ tính năng với tối đa 3 Fanpage. Các gói trả phí cho nhiều Page hơn sẽ mở bán sau.'],
  ['Có phải cài đặt gì không?', 'Không. Phần mềm chạy trên trình duyệt máy tính và điện thoại. Chỉ cần đăng nhập bằng Facebook.'],
  ['Có cần đưa mật khẩu Facebook không?', 'Không bao giờ. Bạn đăng nhập trực tiếp trên trang của Facebook và cấp quyền cho các Page bạn chọn.'],
  ['Vì sao bình luận bị ẩn mà khách vẫn thấy?', 'Facebook cho phép Page ẩn bình luận: người bình luận và bạn bè họ vẫn thấy, người khác (kể cả đối thủ) không thấy.'],
  ['Có trả lời được tin nhắn cũ không?', 'Phần mềm nhận tin nhắn, bình luận từ lúc kết nối. Theo quy định của Facebook, Page chỉ nhắn được cho khách trong 24 giờ kể từ tin cuối của khách.'],
]

function HopThuMinhHoa() {
  const ds = [
    ['Thu Hà', '💬', 'Áo này còn size M không shop?', '2', ['Hỏi giá', '#f97316']],
    ['Minh Tuấn', '🗨️', 'Đã ẩn: 0912 *** 678 lấy 2 cái', '', ['Có SĐT', '#16a34a']],
    ['Lan Anh', '💬', 'Bạn: Dạ shop gửi mình bảng giá ạ', '', ['Đã chốt', '#2563eb']],
  ] as const
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="font-extrabold text-chinh-dam">24H<span className="text-nhan"> Page</span></span>
        <span className="ml-auto flex gap-1 text-[11px]">
          {['Tất cả', 'Chưa đọc', 'Có SĐT'].map((x, i) => (
            <span key={x} className={`rounded-full px-2 py-0.5 ${i === 0 ? 'bg-chinh text-white' : 'bg-slate-100 text-phu'}`}>{x}</span>
          ))}
        </span>
      </div>
      <ul>
        {ds.map(([ten, icon, tin, chua, [the, mau]]) => (
          <li key={ten} className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 font-semibold text-phu">
              {ten.charAt(0)}
              <span className="absolute -bottom-1 -right-1 text-sm">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={chua ? 'font-bold' : 'font-medium'}>{ten}</p>
              <p className={`truncate text-sm ${chua ? 'font-semibold' : 'text-phu'}`}>{tin}</p>
              <span className="mt-1 inline-block rounded px-1.5 text-[11px] text-white" style={{ background: mau }}>{the}</span>
            </div>
            {chua && <span className="h-5 rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{chua}</span>}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-slate-100 bg-nen p-3">
        <span className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-phu">/gia</span>
        <span className="rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white">Gửi</span>
      </div>
    </div>
  )
}

export default function TrangChu() {
  const zalo = soZalo()
  const mail = email()
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-chinh-dam">
            24H<span className="text-nhan"> Page</span>
          </Link>
          <nav className="hidden gap-7 text-[15px] font-medium text-phu md:flex">
            <a href="#tinh-nang" className="hover:text-chinh">Tính năng</a>
            <a href="#bang-gia" className="hover:text-chinh">Bảng giá</a>
            <a href="#hoi-dap" className="hover:text-chinh">Hỏi đáp</a>
            <Link href="/dich-vu" className="hover:text-chinh">Dịch vụ chăm sóc Page</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/dang-nhap" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-phu hover:text-chinh sm:block">
              Đăng nhập
            </Link>
            <Link href="/dang-nhap" className="rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam">
              Dùng miễn phí
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Mở đầu */}
        <section className="bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.15fr_1fr] md:py-24">
            <div>
              <p className="mb-4 inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-nhan">
                🎉 Miễn phí trong giai đoạn ra mắt
              </p>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Quản lý <span className="text-chinh">tin nhắn & bình luận</span> mọi Fanpage trên một màn hình
              </h1>
              <p className="mt-5 max-w-xl text-lg text-phu">
                {TEN_PHAN_MEM} giúp shop online trả lời khách nhanh hơn, không bỏ sót đơn, chống đối thủ xin số điện thoại khách.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dang-nhap" className="rounded-lg bg-nhan px-6 py-3 font-semibold text-white shadow-sm hover:brightness-105">
                  Dùng miễn phí ngay
                </Link>
                <a href="#tinh-nang" className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold hover:border-chinh hover:text-chinh">
                  Xem tính năng
                </a>
              </div>
              <p className="mt-5 text-sm text-phu">✔ Không cần cài đặt &nbsp; ✔ Đăng nhập bằng Facebook &nbsp; ✔ API chính thức của Meta</p>
            </div>
            <HopThuMinhHoa />
          </div>
        </section>

        {/* Vấn đề */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Bán hàng Fanpage có đang khiến bạn mệt?</h2>
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

        {/* Tính năng */}
        <section id="tinh-nang" className="scroll-mt-16 bg-nen py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Tính năng</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-phu">Mọi thứ shop cần để chăm sóc khách trên Fanpage, gói gọn trong một màn hình.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TINH_NANG.map(([icon, tieuDe, moTa]) => (
                <div key={tieuDe} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-3xl">{icon}</p>
                  <h3 className="mt-3 font-semibold">{tieuDe}</h3>
                  <p className="mt-2 text-sm text-phu">{moTa}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <p className="font-semibold">🚀 Sắp ra mắt</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SAP_CO.map((x) => (
                  <li key={x} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-phu">{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Các bước */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Bắt đầu trong 1 phút</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {BUOC.map(([tieuDe, moTa], i) => (
              <li key={tieuDe} className="rounded-2xl border border-slate-200 p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-chinh font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{tieuDe}</h3>
                <p className="mt-1.5 text-sm text-phu">{moTa}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Bảng giá */}
        <section id="bang-gia" className="scroll-mt-16 bg-nen py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Bảng giá</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-phu">Bắt đầu miễn phí. Nâng cấp khi shop cần quản lý nhiều Page hơn.</p>
            <div className="mt-10">
              <BangGia nutChinh={{ nhan: 'Dùng miễn phí', href: '/dang-nhap' }} />
            </div>
          </div>
        </section>

        {/* An toàn */}
        <section className="bg-chinh-dam py-16 text-white">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">An toàn cho Page và tài khoản của bạn</h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {AN_TOAN.map((x) => (
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

        {/* Kêu gọi */}
        <section className="bg-gradient-to-r from-chinh to-chinh-dam py-14 text-center text-white">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-3xl font-bold tracking-tight">Không bỏ lỡ khách nào từ Fanpage</h2>
            <p className="mt-3 text-blue-100">Đăng nhập bằng Facebook và dùng thử ngay hôm nay, miễn phí.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/dang-nhap" className="rounded-lg bg-nhan px-6 py-3 font-semibold text-white hover:brightness-105">
                Dùng miễn phí ngay
              </Link>
              {zalo && (
                <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener" className="rounded-lg bg-white/15 px-6 py-3 font-semibold hover:bg-white/25">
                  💬 Hỏi qua Zalo
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-sm text-phu">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {TEN_PHAN_MEM} · {TEN}
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/dich-vu" className="hover:text-chinh">Dịch vụ chăm sóc Page</Link>
            {zalo && <a href={`https://zalo.me/${zalo}`} className="hover:text-chinh">Zalo: {zalo}</a>}
            {mail && <a href={`mailto:${mail}`} className="hover:text-chinh">{mail}</a>}
            <Link href="/chinh-sach-bao-mat" className="hover:text-chinh">Chính sách bảo mật</Link>
            <Link href="/xoa-du-lieu" className="hover:text-chinh">Xóa dữ liệu</Link>
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
