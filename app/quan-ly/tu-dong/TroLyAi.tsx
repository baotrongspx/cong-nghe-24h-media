'use client'

import { useState, useTransition } from 'react'
import type { ApDung } from '@/lib/tuDong'
import { tien, tongDon } from '@/lib/donHang'
import type { DonAi } from '@/lib/gemini'
import { luuTroLyAi, thuTroLyAi } from '../actions'
import { IAi } from '../BieuTuong'
import { PhanDoan, oNhap } from './KichBanClient'

export type CaiDatAiView = { bat: boolean; ap_dung: ApDung; thong_tin: string; cach_noi: string; nghi_gio: number; toan_quyen?: boolean }
type Trang = { id: string; ten: string }

const MAC_DINH: CaiDatAiView = { bat: false, ap_dung: 'tin_nhan', thong_tin: '', cach_noi: '', nghi_gio: 2, toan_quyen: true }

// Thông tin mẫu theo ngành: bấm để điền rồi sửa lại giá, địa chỉ cho đúng shop
const VI_DU: [string, string][] = [
  [
    'Công nghệ',
    `Shop: bán điện thoại, máy tính bảng, phụ kiện chính hãng
Sản phẩm & giá:
- Samsung Galaxy Tab S12 Ultra 12GB/256GB: 28.990.000đ, màu Xám, Bạc
- Samsung Galaxy S26 Ultra 256GB: 31.990.000đ
- iPhone 17 Pro Max 256GB: 34.990.000đ
- Tai nghe Galaxy Buds3 Pro: 4.490.000đ
- Ốp lưng, cường lực, sạc nhanh 45W: từ 150.000đ
Khuyến mãi: tặng bao da + cường lực khi mua máy tính bảng; trả góp 0% qua thẻ tín dụng
Bảo hành: chính hãng 12 tháng; lỗi phần cứng đổi máy mới trong 30 ngày
Thu cũ đổi mới: có, định giá tại cửa hàng
Giao hàng: toàn quốc 30.000đ, miễn phí đơn từ 2.000.000đ; nội thành giao trong 2 giờ
Thanh toán: COD (kiểm tra rồi trả tiền), chuyển khoản, quẹt thẻ
Địa chỉ: 123 Lê Lợi, Quận 1, TP.HCM — mở cửa 8h–21h hằng ngày
Hotline: 0900 000 000`,
  ],
  [
    'Thời trang',
    `Shop bán: quần áo nữ
Sản phẩm & giá:
- Áo thun cotton: 150.000đ, size S–XL, màu trắng/đen/be
- Quần jean ống rộng: 320.000đ, size 26–32
Bảng size: 40–48kg size S, 48–55kg size M, 55–62kg size L
Phí ship: 30.000đ toàn quốc, đơn từ 500.000đ miễn phí ship
Thanh toán: nhận hàng kiểm tra rồi trả tiền (COD) hoặc chuyển khoản
Đổi trả: đổi size trong 7 ngày, sản phẩm còn tem mác
Địa chỉ: 123 Lê Lợi, Quận 1, TP.HCM — mở cửa 8h–21h`,
  ],
  [
    'Mỹ phẩm',
    `Shop bán: mỹ phẩm chính hãng, có hóa đơn nhập khẩu
Sản phẩm & giá:
- Sữa rửa mặt dịu nhẹ 150ml: 220.000đ, hợp da dầu mụn, da nhạy cảm
- Kem chống nắng SPF50 50ml: 350.000đ
- Serum Vitamin C 30ml: 480.000đ, dùng buổi sáng
Cam kết: hàng chính hãng, phát hiện giả hoàn tiền gấp đôi
Phí ship: 25.000đ, đơn từ 400.000đ miễn phí ship
Thanh toán: COD hoặc chuyển khoản
Đổi trả: đổi trong 3 ngày nếu sản phẩm lỗi, còn nguyên seal
Địa chỉ: 45 Nguyễn Trãi, Hà Nội — mở cửa 9h–21h`,
  ],
  [
    'Đồ ăn',
    `Quán bán: cơm văn phòng, đồ uống
Thực đơn & giá:
- Cơm gà xối mỡ: 45.000đ
- Cơm sườn bì chả: 50.000đ
- Trà đào cam sả: 30.000đ
Giờ bán: 10h–14h và 17h–21h
Giao hàng: bán kính 3km miễn phí, xa hơn 15.000đ; đặt trước 30 phút
Thanh toán: tiền mặt khi nhận hoặc chuyển khoản
Địa chỉ: 12 Trần Hưng Đạo, Đà Nẵng`,
  ],
]

const NGHI = [
  [0, 'Luôn trả lời'],
  [1, '1 giờ'],
  [2, '2 giờ'],
  [6, '6 giờ'],
  [24, '24 giờ'],
] as const

function CongTacNho({ bat, doi, nhan }: { bat: boolean; doi: (b: boolean) => void; nhan: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={bat}
      aria-label={nhan}
      onClick={() => doi(!bat)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${bat ? 'bg-chinh' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${bat ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

function FormAi({ trangId, dau, coKhoa }: { trangId: string; dau: CaiDatAiView; coKhoa: boolean }) {
  const [g, setG] = useState(dau)
  const doi = (x: Partial<CaiDatAiView>) => setG((c) => ({ ...c, ...x }))
  const [kq, setKq] = useState<{ ok: boolean; chu: string } | null>(null)
  const [dangLuu, luu] = useTransition()

  const [cauHoi, setCauHoi] = useState('Áo thun còn size M màu đen không shop? Giá bao nhiêu?')
  const [thu, setThu] = useState<{ traLoi?: string; canNguoiThat?: boolean; donHang?: DonAi | null; loi?: string } | null>(null)
  const [dangThu, chayThu] = useTransition()

  const luuLai = () =>
    luu(async () => {
      const r = await luuTroLyAi({ trangId, bat: g.bat, apDung: g.ap_dung, thongTin: g.thong_tin, cachNoi: g.cach_noi, nghiGio: g.nghi_gio, toanQuyen: !!g.toan_quyen })
      setKq(r.ok ? { ok: true, chu: g.bat ? 'Đã lưu. AI đang trả lời khách.' : 'Đã lưu. AI đang tắt.' } : { ok: false, chu: r.thongBao ?? 'Lưu lỗi' })
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg bg-nen px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">{g.bat ? 'AI đang bật' : 'AI đang tắt'}</p>
          <p className="text-xs text-phu">Trả lời khi tin của khách không khớp kịch bản từ khóa nào</p>
        </div>
        <CongTacNho bat={g.bat} doi={(bat) => doi({ bat })} nhan="Bật trợ lý AI" />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Trả lời mọi tình huống</p>
          <p className="text-xs text-phu">
            {g.toan_quyen
              ? 'AI trả lời mọi tin, kể cả khi khớp kịch bản từ khóa (dùng làm câu mẫu), lúc nhân viên vừa nhắn, hay ca khó (chỉ gắn thẻ “Cần tư vấn”).'
              : 'Tắt: kịch bản từ khóa trả lời trước, AI trả lời các tin còn lại và im lặng khi nhân viên vừa nhắn.'}
          </p>
        </div>
        <CongTacNho bat={!!g.toan_quyen} doi={(toan_quyen) => doi({ toan_quyen })} nhan="Trả lời mọi tình huống" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Trả lời</p>
          <PhanDoan<ApDung>
            giaTri={g.ap_dung}
            doi={(ap_dung) => doi({ ap_dung })}
            lua={[
              ['tin_nhan', 'Tin nhắn'],
              ['binh_luan', 'Bình luận'],
              ['ca_hai', 'Cả hai'],
            ]}
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Im lặng khi nhân viên vừa trả lời</span>
          <select value={g.toan_quyen ? 0 : g.nghi_gio} disabled={g.toan_quyen} onChange={(e) => doi({ nghi_gio: Number(e.target.value) })} className={`${oNhap} disabled:bg-slate-50 disabled:text-phu`}>
            {NGHI.map(([v, nhan]) => (
              <option key={v} value={v}>
                {v ? `Trong ${nhan}` : nhan}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="flex items-end justify-between gap-2">
          <span>
            <span className="text-sm font-medium">Thông tin shop</span>
            <span className="block text-xs text-phu">AI chỉ trả lời dựa trên phần này: sản phẩm, giá, size, ship, thanh toán, đổi trả, địa chỉ…</span>
          </span>
          <select
            value=""
            onChange={(e) => {
              const vd = VI_DU.find(([nganh]) => nganh === e.target.value)
              if (vd && (!g.thong_tin.trim() || confirm('Thay nội dung đang có bằng ví dụ?'))) doi({ thong_tin: vd[1] })
            }}
            aria-label="Điền ví dụ theo ngành"
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-chinh"
          >
            <option value="">Điền ví dụ…</option>
            {VI_DU.map(([nganh]) => (
              <option key={nganh} value={nganh}>
                {nganh}
              </option>
            ))}
          </select>
        </span>
        <textarea value={g.thong_tin} onChange={(e) => doi({ thong_tin: e.target.value })} rows={9} placeholder="Ô đang trống. Gõ thông tin shop vào đây, hoặc chọn “Điền ví dụ…” rồi sửa lại giá, địa chỉ cho đúng." className={`${oNhap} mt-1 resize-y font-mono text-[13px]`} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Cách xưng hô & lưu ý</span>
        <textarea
          value={g.cach_noi}
          onChange={(e) => doi({ cach_noi: e.target.value })}
          rows={2}
          placeholder='Ví dụ: Xưng "em", gọi khách là "chị". Vui vẻ, thêm 1 emoji. Luôn xin số điện thoại khi khách hỏi giá.'
          className={`${oNhap} mt-1 resize-y`}
        />
      </label>

      {kq && <p className={`text-sm ${kq.ok ? 'text-green-700' : 'text-red-600'}`}>{kq.chu}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={luuLai} disabled={dangLuu} className="rounded-lg bg-chinh px-5 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
          {dangLuu ? 'Đang lưu…' : 'Lưu cài đặt AI'}
        </button>
      </div>

      {/* Thử AI với nội dung đang soạn */}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-sm font-medium">Thử hỏi AI</p>
        <p className="text-xs text-phu">Đóng vai khách để xem AI trả lời ra sao (dùng thông tin đang soạn, chưa cần lưu, không gửi cho ai).</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!cauHoi.trim()) return
            chayThu(async () => {
              const r = await thuTroLyAi({ trangId, thongTin: g.thong_tin, cachNoi: g.cach_noi, loai: g.ap_dung === 'binh_luan' ? 'binh_luan' : 'tin_nhan', cauHoi, toanQuyen: !!g.toan_quyen })
              setThu(r.ok ? { traLoi: r.traLoi, canNguoiThat: r.canNguoiThat, donHang: r.donHang } : { loi: r.thongBao })
            })
          }}
          className="mt-2 flex gap-2"
        >
          <input value={cauHoi} onChange={(e) => setCauHoi(e.target.value)} placeholder="Khách hỏi…" aria-label="Câu hỏi thử" className={`${oNhap} min-w-0 flex-1`} />
          <button disabled={dangThu || !coKhoa} className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {dangThu ? 'Đang nghĩ…' : 'Thử'}
          </button>
        </form>
        {thu && (
          <div className="mt-3 space-y-1.5">
            <p className="w-fit max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm">{cauHoi}</p>
            {thu.loi ? (
              <p className="text-sm text-red-600">{thu.loi}</p>
            ) : (
              <>
                <p className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-chinh px-3 py-2 text-sm text-white">{thu.traLoi}</p>
                {thu.donHang && (
                  <div className="ml-auto max-w-[85%] rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-xs">
                    <p className="font-semibold text-violet-800">Khi chạy thật, AI sẽ tự lên đơn này:</p>
                    {thu.donHang.sanPham.map((x, i) => (
                      <p key={i}>
                        {x.ten} × {x.sl} — {tien(x.gia * x.sl)}
                      </p>
                    ))}
                    {thu.donHang.phiShip > 0 && <p>Phí ship: {tien(thu.donHang.phiShip)}</p>}
                    <p className="font-semibold">Tổng: {tien(tongDon({ san_pham: thu.donHang.sanPham, phi_ship: thu.donHang.phiShip, giam_gia: 0 }))}</p>
                    <p className="text-phu">
                      {thu.donHang.khachTen} · {thu.donHang.soDienThoai} · {thu.donHang.diaChi}
                    </p>
                  </div>
                )}
                {thu.canNguoiThat && (
                  <p className="text-right text-xs text-amber-700">AI vẫn trả lời tiếp, và gắn thẻ “Cần tư vấn” để nhân viên theo dõi.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TroLyAi({ trang, caiDat, coKhoa }: { trang: Trang[]; caiDat: Record<string, CaiDatAiView>; coKhoa: boolean }) {
  const [trangId, setTrangId] = useState(trang[0]?.id ?? '')
  const soBat = trang.filter((t) => caiDat[t.id]?.bat).length
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700">
          <IAi className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            Trợ lý AI trả lời khách
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-phu">Gemini</span>
            {soBat > 0 && <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700">Đang bật {soBat} Page</span>}
          </h2>
          <p className="mt-0.5 text-xs text-phu">
            AI đọc lịch sử chat và trả lời như nhân viên, dựa trên thông tin shop bạn cung cấp. Gặp câu khó, khiếu nại hoặc khách chốt đơn, AI vẫn trả lời và gắn thẻ “Cần tư vấn” để nhân viên theo dõi.
          </p>
        </div>
      </div>
      <div className="p-4">
        {!coKhoa && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Máy chủ chưa có khóa Gemini. Chủ phần mềm cần thêm biến <code className="font-mono">GEMINI_API_KEY</code> trên Vercel (lấy tại aistudio.google.com/apikey) rồi triển khai lại.
          </p>
        )}
        {trang.length > 1 && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Fanpage</span>
            <select value={trangId} onChange={(e) => setTrangId(e.target.value)} className={oNhap}>
              {trang.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ten}
                  {caiDat[t.id]?.bat ? ' · AI đang bật' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {trangId && <FormAi key={trangId} trangId={trangId} dau={caiDat[trangId] ?? MAC_DINH} coKhoa={coKhoa} />}
      </div>
    </section>
  )
}
