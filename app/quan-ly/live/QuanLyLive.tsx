'use client'

import { useState, useTransition } from 'react'
import { docTien, tien } from '@/lib/donHang'
import { GIONG } from '@/lib/giongDoc'
import { layLinkTaiAnh } from '../dang-bai/actions'
import { IAi, IChep, ICong, IMoNgoai, ISua, IXoa, IXong } from '../BieuTuong'
import { NutHanhDong } from '../NutHanhDong'
import { doiMaPhienLive, luuPhienLive, ngheThuGiong, vietKichBanAi, xoaPhienLive } from './actions'

export type SanPhamLive = { ten: string; gia: number; anh: string; mo_ta: string }
export type Phien = {
  id: string
  ma: string
  ten: string
  tiktok: string
  thong_tin: string
  cach_noi: string
  loi_mo_dau: string
  giong: string
  san_pham: SanPhamLive[]
  kich_ban?: string
}

// Đọc thử bằng giọng tiếng Việt có sẵn trên máy (giọng "máy tính")
function docBangMay(chu: string) {
  const ds = speechSynthesis.getVoices()
  const giong = ds.find((g) => /HoaiMy|NamMinh/i.test(g.name)) ?? ds.find((g) => g.lang.toLowerCase().startsWith('vi'))
  if (!giong) return false
  const u = new SpeechSynthesisUtterance(chu)
  u.voice = giong
  u.lang = giong.lang
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
  return true
}

const oNhap = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/15'

function NutChep({ chu, nhan }: { chu: string; nhan: string }) {
  const [daChep, setDaChep] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(chu).then(() => (setDaChep(true), setTimeout(() => setDaChep(false), 1500)))}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${daChep ? 'bg-green-600 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`}
    >
      {daChep ? <IXong className="h-3.5 w-3.5" /> : <IChep className="h-3.5 w-3.5" />}
      {daChep ? 'Đã chép' : nhan}
    </button>
  )
}

function DongChep({ nhan, chu }: { nhan: string; chu: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-phu">{nhan}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-slate-100 px-2.5 py-1.5 font-mono text-xs">{chu}</code>
        <NutChep chu={chu} nhan="Chép" />
      </div>
    </div>
  )
}

// Hướng dẫn lên live cho một phiên
function HuongDan({ p, goc }: { p: Phien; goc: string }) {
  const linkSanKhau = `${goc}/live/${p.ma}`
  const lenh = `node live-ai-may.mjs ${goc}/api/live/${p.ma}/binh-luan ${p.tiktok || '<ten-tiktok>'}`
  const buoc: [string, React.ReactNode][] = [
    [
      'Cài OBS Studio và Node.js (một lần)',
      <>
        Tải miễn phí{' '}
        <a href="https://obsproject.com" target="_blank" rel="noreferrer" className="text-chinh underline">
          OBS Studio
        </a>{' '}
        và{' '}
        <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-chinh underline">
          Node.js
        </a>
        . Trong OBS vào Settings → Video, đặt Base và Output Resolution là <b>1080x1920</b> (màn hình dọc).
      </>,
    ],
    [
      'Chạy chương trình trên máy (đọc giọng + bình luận)',
      <>
        Tạo thư mục (vd. C:\live-ai), tải{' '}
        <a href="/cong-cu/live-ai-may.mjs" download className="text-chinh underline">
          live-ai-may.mjs
        </a>{' '}
        vào đó. Mở PowerShell trong thư mục, chạy một lần <code className="rounded bg-slate-100 px-1 font-mono text-xs">npm install tiktok-live-connector</code>, rồi chạy lệnh dưới. Chương
        trình đọc lời MC bằng <b>giọng tiếng Việt của Windows</b> (miễn phí, không giới hạn) và gửi bình luận TikTok về phần mềm. Để cửa sổ mở suốt buổi live.
        <div className="mt-2">
          <DongChep nhan="Lệnh chạy" chu={lenh} />
        </div>
      </>,
    ],
    [
      'Thêm sân khấu MC ảo vào OBS',
      <>
        Sources → + → <b>Browser</b>, dán link sân khấu, Width 1080, Height 1920, tích <b>Control audio via OBS</b>. MC tự nói khi nguồn này được mở.
        <div className="mt-2">
          <DongChep nhan="Link sân khấu (giữ bí mật)" chu={linkSanKhau} />
        </div>
      </>,
    ],
    [
      'Nối OBS với TikTok',
      <>
        Lấy <b>Server URL</b> và <b>Stream Key</b> của TikTok (tài khoản đủ điều kiện phát live từ máy tính, hoặc qua TikTok LIVE Studio), dán vào OBS → Settings → Stream → Custom, rồi bấm{' '}
        <b>Start Streaming</b>.
      </>,
    ],
  ]
  return (
    <ol className="space-y-3">
      {buoc.map(([tieuDe, noiDung], i) => (
        <li key={tieuDe} className="flex gap-3">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-chinh text-xs font-bold text-white">{i + 1}</span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{tieuDe}</p>
            <div className="mt-0.5 text-phu">{noiDung}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

type DongSp = { ten: string; gia: string; anh: string; mo_ta: string }

function FormPhien({ dau, macDinh, xong, huy }: { dau: Phien | null; macDinh: { ten: string; thongTin: string }; xong: () => void; huy: () => void }) {
  const [ten, setTen] = useState(dau?.ten ?? macDinh.ten)
  const [tiktok, setTiktok] = useState(dau?.tiktok ?? '')
  const [giong, setGiong] = useState(dau?.giong ?? 'may')
  const [kichBan, setKichBan] = useState(dau?.kich_ban ?? '')
  const [dangViet, viet] = useTransition()
  const [loiMoDau, setLoiMoDau] = useState(dau?.loi_mo_dau ?? '')
  const [thongTin, setThongTin] = useState(dau?.thong_tin ?? macDinh.thongTin)
  const [cachNoi, setCachNoi] = useState(dau?.cach_noi ?? '')
  const [sp, setSp] = useState<DongSp[]>(dau?.san_pham.length ? dau.san_pham.map((x) => ({ ...x, gia: x.gia ? String(x.gia) : '' })) : [{ ten: '', gia: '', anh: '', mo_ta: '' }])
  const [loi, setLoi] = useState('')
  const [dang, chay] = useTransition()
  const [dangNghe, nghe] = useTransition()
  const [taiAnh, setTaiAnh] = useState<number | null>(null)

  const suaSp = (i: number, doi: Partial<DongSp>) => setSp((ds) => ds.map((x, j) => (j === i ? { ...x, ...doi } : x)))
  const chonAnh = async (i: number, file: File) => {
    setTaiAnh(i)
    try {
      const link = await layLinkTaiAnh(file.type)
      if (!link.ok) throw new Error(link.thongBao)
      const r = await fetch(link.linkTai, { method: 'PUT', body: file, headers: { 'content-type': file.type } })
      if (!r.ok) throw new Error(`Tải ảnh lỗi (${r.status})`)
      suaSp(i, { anh: link.linkAnh })
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Tải ảnh lỗi')
    } finally {
      setTaiAnh(null)
    }
  }

  const luu = () =>
    chay(async () => {
      const r = await luuPhienLive({
        id: dau?.id,
        ten,
        tiktok,
        giong,
        loiMoDau,
        kichBan,
        thongTin,
        cachNoi,
        sanPham: sp.filter((x) => x.ten.trim()).map((x) => ({ ten: x.ten.trim(), gia: docTien(x.gia), anh: x.anh, mo_ta: x.mo_ta.trim() })),
      })
      if (r.ok) xong()
      else setLoi(r.thongBao ?? 'Lưu lỗi')
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        luu()
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Tên shop hiển thị trên live</span>
          <input value={ten} onChange={(e) => setTen(e.target.value)} className={`${oNhap} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Tên TikTok</span>
          <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@congnghe24h" className={`${oNhap} mt-1`} />
        </label>
      </div>

      <div>
        <span className="text-sm font-medium">Giọng MC</span>
        <div className="mt-1 flex gap-2">
          <select value={giong} onChange={(e) => setGiong(e.target.value)} className={oNhap}>
            {GIONG.map(([ma, moTa]) => (
              <option key={ma} value={ma}>
                {ma} — {moTa}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={dangNghe}
            onClick={() =>
              nghe(async () => {
                if (giong === 'may') {
                  if (!docBangMay('Chào cả nhà đã ghé live của shop! Hôm nay bên em có nhiều ưu đãi lắm, cả nhà thả tim ủng hộ em nha.'))
                    setLoi('Máy này chưa có giọng tiếng Việt. Vào Cài đặt Windows → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → Tiếng Việt.')
                  return
                }
                const r = await ngheThuGiong(giong)
                if (r.ok) await new Audio(`data:audio/wav;base64,${r.amThanh}`).play()
                else setLoi(r.thongBao)
              })
            }
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {dangNghe ? 'Đang tạo…' : '▶ Nghe thử'}
          </button>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Sản phẩm giới thiệu trên live</legend>
        <p className="text-xs text-phu">MC ảo lần lượt giới thiệu từng sản phẩm khi không có bình luận. Giá gõ 150k, 1tr2 hoặc 150000.</p>
        <div className="mt-2 space-y-2">
          {sp.map((x, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-slate-200 p-2">
              <label className="relative grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md bg-slate-100 text-xs text-phu hover:bg-slate-200">
                {x.anh ? <img src={x.anh} alt="" className="h-full w-full object-cover" /> : taiAnh === i ? '…' : '+ Ảnh'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && chonAnh(i, e.target.files[0])} />
              </label>
              <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[1fr_7rem]">
                <input value={x.ten} onChange={(e) => suaSp(i, { ten: e.target.value })} placeholder="Tên sản phẩm" aria-label="Tên sản phẩm" className={oNhap} />
                <input value={x.gia} onChange={(e) => suaSp(i, { gia: e.target.value })} placeholder="Giá" aria-label="Giá" className={`${oNhap} text-right`} />
                <input value={x.mo_ta} onChange={(e) => suaSp(i, { mo_ta: e.target.value })} placeholder="Điểm nổi bật, ưu đãi (tùy chọn)" aria-label="Mô tả" className={`${oNhap} sm:col-span-2`} />
              </div>
              <button type="button" onClick={() => setSp((ds) => (ds.length > 1 ? ds.filter((_, j) => j !== i) : ds))} className="self-start p-1 text-phu hover:text-red-600" aria-label="Xóa sản phẩm">
                <IXoa className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setSp((ds) => [...ds, { ten: '', gia: '', anh: '', mo_ta: '' }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-chinh hover:underline">
          <ICong className="h-4 w-4" /> Thêm sản phẩm
        </button>
      </fieldset>

      <label className="block">
        <span className="flex items-end justify-between gap-2">
          <span>
            <span className="text-sm font-medium">Kịch bản đọc</span>
            <span className="block text-xs text-phu">
              Khi không có bình luận, MC đọc lần lượt từng đoạn rồi lặp lại, không tốn lượt AI. Mỗi đoạn cách nhau một dòng trống. Để trống thì AI tự nghĩ lời (tốn lượt).
            </span>
          </span>
          <button
            type="button"
            disabled={dangViet}
            onClick={() =>
              viet(async () => {
                if (kichBan.trim() && !confirm('Thay kịch bản đang có bằng kịch bản AI viết?')) return
                const r = await vietKichBanAi({ ten, thongTin, cachNoi, sanPham: sp.filter((x) => x.ten.trim()).map((x) => ({ ten: x.ten, gia: docTien(x.gia), mo_ta: x.mo_ta })) })
                if (r.ok) setKichBan(r.kichBan)
                else setLoi(r.thongBao)
              })
            }
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            <IAi className="h-3.5 w-3.5" /> {dangViet ? 'AI đang viết…' : 'AI viết kịch bản'}
          </button>
        </span>
        <textarea
          value={kichBan}
          onChange={(e) => setKichBan(e.target.value)}
          rows={10}
          placeholder={
            'Chào cả nhà đã ghé live của shop! Hôm nay bên em có nhiều ưu đãi lắm.\n\nĐây là Galaxy Tab S12 Ultra, màn hình mười bốn phẩy sáu inch, giá hai mươi tám triệu chín.\n\nCả nhà thả tim, bấm theo dõi kênh để không bỏ lỡ ưu đãi nha!'
          }
          className={`${oNhap} mt-1 resize-y`}
        />
        {kichBan.trim() && <span className="mt-1 block text-xs text-phu">{kichBan.split(/\n\s*\n/).filter((x) => x.trim()).length} đoạn</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Lời mở đầu</span>
        <textarea
          value={loiMoDau}
          onChange={(e) => setLoiMoDau(e.target.value)}
          rows={2}
          placeholder="Chào cả nhà đã ghé live của shop! Hôm nay bên em có… (để trống thì AI tự nghĩ)"
          className={`${oNhap} mt-1 resize-y`}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Thông tin shop cho AI</span>
        <span className="block text-xs text-phu">Ship, bảo hành, thanh toán, khuyến mãi… AI chỉ trả lời dựa trên phần này và danh sách sản phẩm.</span>
        <textarea value={thongTin} onChange={(e) => setThongTin(e.target.value)} rows={5} className={`${oNhap} mt-1 resize-y`} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Phong cách MC</span>
        <input
          value={cachNoi}
          onChange={(e) => setCachNoi(e.target.value)}
          placeholder='Ví dụ: Xưng "em", gọi "cả nhà", năng lượng cao, hay pha trò nhẹ'
          className={`${oNhap} mt-1`}
        />
      </label>

      {loi && <p className="text-sm text-red-600">{loi}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={huy} className="rounded-lg px-4 py-2 text-sm font-medium text-phu hover:bg-slate-100">
          Hủy
        </button>
        <button disabled={dang} className="rounded-lg bg-chinh px-5 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
          {dang ? 'Đang lưu…' : dau ? 'Lưu thay đổi' : 'Tạo phiên live'}
        </button>
      </div>
    </form>
  )
}

export default function QuanLyLive({ ds, goc, macDinh, coKhoa }: { ds: Phien[]; goc: string; macDinh: { ten: string; thongTin: string }; coKhoa: boolean }) {
  const [soan, setSoan] = useState<Phien | 'moi' | null>(ds.length ? null : 'moi')
  const [moHuongDan, setMoHuongDan] = useState<string | null>(ds[0]?.id ?? null)

  return (
    <div className="space-y-6">
      {!coKhoa && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Máy chủ chưa có khóa Gemini (<code className="font-mono">GEMINI_API_KEY</code>) nên MC ảo chưa nói được. Thêm khóa trên Vercel rồi triển khai lại.
        </p>
      )}

      {soan ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">{soan === 'moi' ? 'Tạo phiên live mới' : `Sửa: ${soan.ten}`}</h2>
          <FormPhien key={soan === 'moi' ? 'moi' : soan.id} dau={soan === 'moi' ? null : soan} macDinh={macDinh} xong={() => setSoan(null)} huy={() => setSoan(null)} />
        </section>
      ) : (
        <button onClick={() => setSoan('moi')} className="inline-flex items-center gap-2 rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam">
          <ICong className="h-4 w-4" /> Tạo phiên live mới
        </button>
      )}

      <ul className="space-y-4">
        {ds.map((p) => (
          <li key={p.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-100 text-violet-700">
                <IAi className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.ten}</p>
                <p className="text-xs text-phu">
                  {p.tiktok ? `@${p.tiktok}` : 'Chưa nhập tên TikTok'} · {p.san_pham.length} sản phẩm · Giọng {p.giong}
                  {p.san_pham[0]?.gia ? ` · từ ${tien(Math.min(...p.san_pham.filter((x) => x.gia).map((x) => x.gia)))}` : ''}
                </p>
              </div>
              <a
                href={`/live/${p.ma}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam"
              >
                <IMoNgoai className="h-3.5 w-3.5" /> Mở sân khấu
              </a>
              <button onClick={() => setSoan(p)} className="rounded-md p-1.5 text-phu hover:bg-slate-100 hover:text-chu" aria-label="Sửa phiên live">
                <ISua className="h-4 w-4" />
              </button>
              <NutHanhDong chay={xoaPhienLive.bind(null, p.id)} xacNhan={`Xóa phiên live "${p.ten}"?`} className="rounded-md p-1.5 text-phu hover:bg-red-50 hover:text-red-600">
                <IXoa className="h-4 w-4" />
                <span className="sr-only">Xóa phiên live</span>
              </NutHanhDong>
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button onClick={() => setMoHuongDan(moHuongDan === p.id ? null : p.id)} className="text-sm font-medium text-chinh hover:underline">
                {moHuongDan === p.id ? 'Ẩn hướng dẫn lên live' : 'Hướng dẫn lên live (OBS + TikTok)'}
              </button>
              {moHuongDan === p.id && (
                <div className="mt-4 space-y-4">
                  <HuongDan p={p} goc={goc} />
                  <p className="flex flex-wrap items-center gap-2 text-xs text-phu">
                    Lỡ để lộ link sân khấu?
                    <NutHanhDong chay={doiMaPhienLive.bind(null, p.id)} xacNhan="Đổi link mới? Link cũ trong OBS và lệnh chạy sẽ ngừng hoạt động." className="text-chinh hover:underline">
                      Đổi link mới
                    </NutHanhDong>
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
