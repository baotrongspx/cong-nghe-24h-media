'use client'

import { useRef, useState, useTransition } from 'react'
import { AP_DUNG, GIO_CHO_TRA_LOI_MOI_TIN, MAU_KICH_BAN, thayTen, type ApDung, type KichBan } from '@/lib/tuDong'
import { batTatTuDong, luuTuDong, xoaTuDong } from '../actions'
import { ICong, ISet, ISua, ITinNhan, IXoa } from '../BieuTuong'
import { CongTac, NutHanhDong } from '../NutHanhDong'

type GiaTri = { id?: string; trangId: string; tuKhoa: string[]; apDung: ApDung; traLoi: string; nhanRieng: string }
type Trang = { id: string; ten: string }

const oNhap = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/15'
const coChoTrong = (s: string) => /\[[^\]]*\]/.test(s)

// Nút chọn dạng phân đoạn
function PhanDoan<T extends string>({ giaTri, doi, lua }: { giaTri: T; doi: (v: T) => void; lua: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
      {lua.map(([k, nhan]) => (
        <button
          key={k}
          type="button"
          onClick={() => doi(k)}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${giaTri === k ? 'bg-white text-chu shadow-sm' : 'text-phu hover:text-chu'}`}
        >
          {nhan}
        </button>
      ))}
    </div>
  )
}

// Ô nhập từ khóa dạng thẻ: Enter hoặc dấu phẩy để thêm
function OTuKhoa({ ds, doi }: { ds: string[]; doi: (ds: string[]) => void }) {
  const [chu, setChu] = useState('')
  const them = (s: string) => {
    const moi = s.split(',').map((x) => x.trim()).filter((x) => x && !ds.includes(x))
    if (moi.length) doi([...ds, ...moi])
    setChu('')
  }
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-chinh focus-within:ring-2 focus-within:ring-chinh/15">
      {ds.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-chinh/10 py-0.5 pl-2 pr-1 text-sm text-chinh">
          {t}
          <button type="button" onClick={() => doi(ds.filter((x) => x !== t))} className="rounded px-1 hover:bg-chinh/15" aria-label={`Bỏ từ khóa ${t}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={chu}
        onChange={(e) => (e.target.value.includes(',') ? them(e.target.value) : setChu(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            them(chu)
          } else if (e.key === 'Backspace' && !chu && ds.length) doi(ds.slice(0, -1))
        }}
        onBlur={() => chu && them(chu)}
        placeholder={ds.length ? 'Thêm từ khóa…' : 'Gõ từ khóa rồi nhấn Enter, ví dụ: giá'}
        aria-label="Từ khóa"
        className="min-w-32 flex-1 bg-transparent py-0.5 text-sm outline-none"
      />
    </div>
  )
}

// Ô soạn nội dung có nút chèn {ten}
function ONoiDung({ nhan, goiY, giaTri, doi, placeholder }: { nhan: string; goiY?: string; giaTri: string; doi: (s: string) => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const chenTen = () => {
    const o = ref.current
    const vt = o?.selectionStart ?? giaTri.length
    doi(`${giaTri.slice(0, vt)}{ten}${giaTri.slice(o?.selectionEnd ?? vt)}`)
    requestAnimationFrame(() => {
      o?.focus()
      o?.setSelectionRange(vt + 5, vt + 5)
    })
  }
  return (
    <label className="block">
      <span className="flex items-end justify-between gap-2">
        <span>
          <span className="text-sm font-medium">{nhan}</span>
          {goiY && <span className="block text-xs text-phu">{goiY}</span>}
        </span>
        <button type="button" onClick={chenTen} className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-chinh hover:bg-chinh/5">
          + Tên khách
        </button>
      </span>
      <textarea ref={ref} value={giaTri} onChange={(e) => doi(e.target.value)} rows={3} placeholder={placeholder} className={`${oNhap} mt-1 resize-y`} />
      {coChoTrong(giaTri) && <span className="mt-1 block text-xs text-amber-700">Còn chỗ [ ] cần thay bằng thông tin của shop.</span>}
    </label>
  )
}

function FormKichBan({ trang, dau, xong, huy }: { trang: Trang[]; dau: GiaTri; xong: () => void; huy?: () => void }) {
  const [g, setG] = useState(dau)
  const [moiTin, setMoiTin] = useState(!dau.tuKhoa.length)
  const [loi, setLoi] = useState('')
  const [dang, chay] = useTransition()
  const doi = (x: Partial<GiaTri>) => setG((c) => ({ ...c, ...x }))
  const coBinhLuan = g.apDung !== 'tin_nhan'

  const luu = () =>
    chay(async () => {
      if (!moiTin && !g.tuKhoa.length) return setLoi('Chưa có từ khóa nào')
      const r = await luuTuDong({ ...g, tuKhoa: moiTin ? [] : g.tuKhoa })
      if (r.ok) xong()
      else setLoi(r.thongBao ?? 'Lưu lỗi')
    })

  const nhanTraLoi =
    g.apDung === 'tin_nhan' ? 'Trả lời tin nhắn' : g.apDung === 'binh_luan' ? 'Trả lời công khai dưới bình luận' : 'Nội dung trả lời'
  const goiYTraLoi =
    g.apDung === 'binh_luan' ? 'Để trống nếu chỉ muốn nhắn riêng' : g.apDung === 'ca_hai' ? 'Gửi vào tin nhắn, và trả lời công khai dưới bình luận' : undefined

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        luu()
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Khi nào trả lời</p>
          <PhanDoan<'tu_khoa' | 'moi_tin'>
            giaTri={moiTin ? 'moi_tin' : 'tu_khoa'}
            doi={(v) => setMoiTin(v === 'moi_tin')}
            lua={[
              ['tu_khoa', 'Có từ khóa'],
              ['moi_tin', 'Mọi tin mới'],
            ]}
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Áp dụng cho</p>
          <PhanDoan<ApDung>
            giaTri={g.apDung}
            doi={(v) => doi({ apDung: v })}
            lua={[
              ['ca_hai', 'Cả hai'],
              ['tin_nhan', 'Tin nhắn'],
              ['binh_luan', 'Bình luận'],
            ]}
          />
        </div>
      </div>

      {moiTin ? (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Gửi khi khách nhắn/bình luận mà không khớp từ khóa nào. Mỗi khách nhận tối đa 1 lần trong {GIO_CHO_TRA_LOI_MOI_TIN} giờ, và không gửi nếu shop vừa trả lời khách.
        </p>
      ) : (
        <div>
          <p className="mb-1 text-sm font-medium">Từ khóa</p>
          <OTuKhoa ds={g.tuKhoa} doi={(tuKhoa) => doi({ tuKhoa })} />
          <p className="mt-1 text-xs text-phu">Khớp nguyên từ, không phân biệt hoa thường. Nên thêm cả kiểu viết không dấu, viết tắt (gia, bn, ib).</p>
        </div>
      )}

      {!g.id && trang.length > 1 && (
        <label className="block">
          <span className="text-sm font-medium">Fanpage</span>
          <select value={g.trangId} onChange={(e) => doi({ trangId: e.target.value })} className={`${oNhap} mt-1`}>
            <option value="tat_ca">Tất cả Page ({trang.length})</option>
            {trang.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ten}
              </option>
            ))}
          </select>
        </label>
      )}

      <ONoiDung nhan={nhanTraLoi} goiY={goiYTraLoi} giaTri={g.traLoi} doi={(traLoi) => doi({ traLoi })} placeholder="Ví dụ: Chào {ten}, shop gửi bạn bảng giá…" />
      {coBinhLuan && (
        <ONoiDung
          nhan="Nhắn riêng vào inbox người bình luận"
          goiY="Tùy chọn. Facebook cho nhắn riêng 1 lần với mỗi bình luận trong 7 ngày."
          giaTri={g.nhanRieng}
          doi={(nhanRieng) => doi({ nhanRieng })}
          placeholder="Ví dụ: Chào {ten}, sản phẩm bạn hỏi giá 250.000đ ạ…"
        />
      )}

      {(g.traLoi.trim() || g.nhanRieng.trim()) && (
        <div className="rounded-lg border border-slate-200 bg-nen p-3">
          <p className="mb-2 text-xs font-medium text-phu">Xem trước (khách tên Lan)</p>
          <div className="space-y-1.5">
            {[g.traLoi, coBinhLuan ? g.nhanRieng : ''].filter((x) => x.trim()).map((x, i) => (
              <p key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-chinh px-3 py-2 text-sm text-white">
                {thayTen(x, 'Lan')}
              </p>
            ))}
          </div>
        </div>
      )}

      {loi && <p className="text-sm text-red-600">{loi}</p>}
      <div className="flex justify-end gap-2">
        {huy && (
          <button type="button" onClick={huy} className="rounded-lg px-4 py-2 text-sm font-medium text-phu hover:bg-slate-100">
            Hủy
          </button>
        )}
        <button disabled={dang} className="rounded-lg bg-chinh px-5 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
          {dang ? 'Đang lưu…' : g.id ? 'Lưu thay đổi' : 'Thêm kịch bản'}
        </button>
      </div>
    </form>
  )
}

// Khu thêm kịch bản: bộ mẫu soạn sẵn + form
export function KhuSoan({ trang }: { trang: Trang[] }) {
  const trong: GiaTri = { trangId: trang.length > 1 ? 'tat_ca' : (trang[0]?.id ?? ''), tuKhoa: [], apDung: 'ca_hai', traLoi: '', nhanRieng: '' }
  const [dau, setDau] = useState<GiaTri | null>(null)
  const [lan, setLan] = useState(0) // đổi key để form nhận giá trị mẫu mới
  const [daThem, setDaThem] = useState(false)
  const mo = (g: GiaTri) => {
    setDau(g)
    setLan((n) => n + 1)
    setDaThem(false)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Kịch bản mẫu</h2>
          <button type="button" onClick={() => mo(trong)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-chinh hover:bg-chinh/5">
            <ICong className="h-4 w-4" /> Tự soạn
          </button>
        </div>
        <p className="mt-0.5 text-xs text-phu">Bấm một mẫu để điền sẵn, sửa lại cho shop mình rồi lưu.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MAU_KICH_BAN.map((m) => (
            <button
              key={m.ten}
              type="button"
              onClick={() => mo({ ...trong, tuKhoa: m.tu_khoa, apDung: m.ap_dung, traLoi: m.tra_loi, nhanRieng: m.nhan_rieng })}
              className="rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-chinh hover:bg-chinh/5"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {m.tu_khoa.length ? <ITinNhan className="h-3.5 w-3.5 text-chinh" /> : <ISet className="h-3.5 w-3.5 text-amber-600" />}
                {m.ten}
              </span>
              <span className="mt-0.5 block truncate text-xs text-phu">{m.moTa}</span>
            </button>
          ))}
        </div>
      </div>
      {dau && (
        <div className="p-4">
          <FormKichBan key={lan} trang={trang} dau={dau} xong={() => (setDau(null), setDaThem(true))} huy={() => setDau(null)} />
        </div>
      )}
      {daThem && !dau && <p className="px-4 py-3 text-sm text-green-700">Đã thêm kịch bản.</p>}
    </section>
  )
}

// Thẻ một kịch bản: xem, bật/tắt, sửa ngay tại chỗ, xóa
export function TheKichBan({ kb, tenTrang }: { kb: KichBan; tenTrang?: string }) {
  const [sua, setSua] = useState(false)
  if (sua) {
    return (
      <li className="rounded-xl border border-chinh/40 bg-white p-4 shadow-sm">
        <FormKichBan
          trang={[]}
          dau={{ id: kb.id, trangId: kb.trang_id, tuKhoa: kb.tu_khoa, apDung: kb.ap_dung, traLoi: kb.tra_loi, nhanRieng: kb.nhan_rieng ?? '' }}
          xong={() => setSua(false)}
          huy={() => setSua(false)}
        />
      </li>
    )
  }
  return (
    <li className={`rounded-xl border border-slate-200 bg-white p-4 transition ${kb.bat ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-phu">{AP_DUNG[kb.ap_dung]}</span>
        {tenTrang && <span className="text-phu">{tenTrang}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setSua(true)} className="rounded-md p-1.5 text-phu hover:bg-slate-100 hover:text-chu" aria-label="Sửa kịch bản">
            <ISua className="h-4 w-4" />
          </button>
          <NutHanhDong chay={xoaTuDong.bind(null, kb.id)} xacNhan="Xóa kịch bản này?" className="rounded-md p-1.5 text-phu hover:bg-red-50 hover:text-red-600">
            <IXoa className="h-4 w-4" />
            <span className="sr-only">Xóa kịch bản</span>
          </NutHanhDong>
        </div>
      </div>
      {kb.tu_khoa.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {kb.tu_khoa.map((t) => (
            <span key={t} className="rounded-md bg-chinh/10 px-2 py-0.5 text-sm text-chinh">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 space-y-2 text-sm">
        {kb.tra_loi && (
          <div>
            {kb.ap_dung !== 'tin_nhan' && <p className="text-xs text-phu">{kb.ap_dung === 'binh_luan' ? 'Trả lời công khai' : 'Trả lời'}</p>}
            <p className="whitespace-pre-wrap">{kb.tra_loi}</p>
          </div>
        )}
        {kb.ap_dung !== 'tin_nhan' && kb.nhan_rieng && (
          <div className="border-l-2 border-chinh/30 pl-3">
            <p className="text-xs text-phu">Nhắn riêng vào inbox</p>
            <p className="whitespace-pre-wrap">{kb.nhan_rieng}</p>
          </div>
        )}
      </div>
      <div className="mt-2 border-t border-slate-100 pt-1">
        <CongTac nhan={kb.bat ? 'Đang bật' : 'Đang tắt'} bat={kb.bat} chay={batTatTuDong.bind(null, kb.id)} />
      </div>
    </li>
  )
}
