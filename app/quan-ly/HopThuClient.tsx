'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anHienBinhLuan, danhDauChuaDoc, datThe, giaoHoiThoai, luuSoDienThoai, traLoi } from './actions'

// Tải lại dữ liệu mỗi 5 giây khi tab đang mở để thấy tin mới (webhook đã lưu sẵn vào cơ sở dữ liệu)
export function LamMoi() {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 5000)
    return () => clearInterval(t)
  }, [router])
  return null
}

export function KhungTraLoi({
  hoiThoaiId,
  laBinhLuan,
  mauCau,
}: {
  hoiThoaiId: string
  laBinhLuan: boolean
  mauCau: { phim_tat: string; noi_dung: string }[]
}) {
  const [chu, setChu] = useState('')
  const [kq, guiDi, dangGui] = useActionState(async (truoc: Awaited<ReturnType<typeof traLoi>> | null, f: FormData) => {
    const r = await traLoi(truoc, f)
    if (r.ok) setChu('')
    return r
  }, null)
  const form = useRef<HTMLFormElement>(null)

  // Gõ "/" ở đầu để gợi ý mẫu câu
  const goiY = chu.startsWith('/') ? mauCau.filter((m) => m.phim_tat.startsWith(chu.slice(1).split(/\s/)[0])).slice(0, 6) : []

  return (
    <form ref={form} action={guiDi} className="relative border-t border-slate-200 bg-white p-3">
      <input type="hidden" name="hoi_thoai_id" value={hoiThoaiId} />
      {goiY.length > 0 && (
        <ul className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {goiY.map((m) => (
            <li key={m.phim_tat}>
              <button type="button" onClick={() => setChu(m.noi_dung)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                <b className="text-chinh">/{m.phim_tat}</b> <span className="text-phu">{m.noi_dung.slice(0, 80)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {laBinhLuan && (
        <div className="mb-2 flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="cach" value="cong_khai" defaultChecked /> Trả lời bình luận
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="cach" value="rieng" /> Nhắn riêng vào inbox
          </label>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          name="noi_dung"
          value={chu}
          onChange={(e) => setChu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !goiY.length) {
              e.preventDefault()
              form.current?.requestSubmit()
            }
          }}
          rows={2}
          placeholder={mauCau.length ? 'Nhập tin trả lời… (gõ / để chọn mẫu câu, Enter để gửi)' : 'Nhập tin trả lời… (Enter để gửi)'}
          className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-[15px] focus:border-chinh focus:outline-none"
        />
        <button disabled={dangGui || !chu.trim()} className="rounded-lg bg-chinh px-4 py-2.5 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
          {dangGui ? 'Đang gửi…' : 'Gửi'}
        </button>
      </div>
      {kq && !kq.ok && <p className="mt-2 text-sm text-red-600">{kq.thongBao}</p>}
    </form>
  )
}

export function NutAnHien({ tinId, daAn }: { tinId: string; daAn: boolean }) {
  const [dang, chay] = useTransition()
  const [loi, setLoi] = useState('')
  return (
    <>
      <button
        disabled={dang}
        onClick={() =>
          chay(async () => {
            const r = await anHienBinhLuan(tinId, !daAn)
            setLoi(r.ok ? '' : r.thongBao ?? '')
          })
        }
        className="text-chinh hover:underline disabled:opacity-50"
      >
        {daAn ? 'Hiện' : 'Ẩn'}
      </button>
      {loi && <span className="text-red-600">{loi}</span>}
    </>
  )
}

export function ChonThe({ hoiThoaiId, dangChon, tatCa }: { hoiThoaiId: string; dangChon: string[]; tatCa: { ten: string; mau: string }[] }) {
  const [mo, setMo] = useState(false)
  const [, chay] = useTransition()
  if (!tatCa.length) return null
  const doi = (ten: string) =>
    chay(() => datThe(hoiThoaiId, dangChon.includes(ten) ? dangChon.filter((t) => t !== ten) : [...dangChon, ten]))
  return (
    <div className="relative">
      <button onClick={() => setMo(!mo)} className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">
        🏷️ Thẻ{dangChon.length ? ` (${dangChon.length})` : ''}
      </button>
      {mo && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {tatCa.map((t) => (
            <label key={t.ten} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={dangChon.includes(t.ten)} onChange={() => doi(t.ten)} />
              <span className="h-3 w-3 rounded-full" style={{ background: t.mau }} />
              {t.ten}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// Giao hội thoại cho một người quản lý page (hoặc bỏ giao)
export function ChonPhuTrach({
  hoiThoaiId,
  dangChon,
  nguoi,
  toi,
}: {
  hoiThoaiId: string
  dangChon: string | null
  nguoi: { id: string; ten: string }[]
  toi: string
}) {
  const [dang, chay] = useTransition()
  return (
    <select
      value={dangChon ?? ''}
      disabled={dang}
      onChange={(e) => chay(() => giaoHoiThoai(hoiThoaiId, e.target.value || null))}
      title="Người phụ trách"
      className="max-w-40 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
    >
      <option value="">👤 Chưa giao</option>
      {nguoi.map((n) => (
        <option key={n.id} value={n.id}>
          👤 {n.id === toi ? `${n.ten} (tôi)` : n.ten}
        </option>
      ))}
    </select>
  )
}

export function SoDienThoai({ hoiThoaiId, giaTri }: { hoiThoaiId: string; giaTri: string }) {
  const [sua, setSua] = useState(false)
  const [, chay] = useTransition()
  if (!sua) {
    return (
      <button onClick={() => setSua(true)} className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">
        📞 {giaTri || 'Thêm SĐT'}
      </button>
    )
  }
  return (
    <form
      action={(f) => {
        setSua(false)
        chay(() => luuSoDienThoai(hoiThoaiId, String(f.get('sdt') ?? '')))
      }}
    >
      <input name="sdt" defaultValue={giaTri} autoFocus onBlur={(e) => e.currentTarget.form?.requestSubmit()} className="w-32 rounded-md border border-chinh px-2 py-1 text-sm" />
    </form>
  )
}

export function NutChuaDoc({ hoiThoaiId }: { hoiThoaiId: string }) {
  const router = useRouter()
  const [, chay] = useTransition()
  return (
    <button
      onClick={() =>
        chay(async () => {
          await danhDauChuaDoc(hoiThoaiId)
          router.push('/quan-ly')
        })
      }
      className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
      title="Đánh dấu chưa đọc"
    >
      ✉️
    </button>
  )
}
