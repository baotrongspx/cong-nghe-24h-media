'use client'

import { useState } from 'react'
import { loiNhacVeo, taoDanhSachClip, type ClipMc } from '@/lib/videoMc'
import { IChep, ICong, IMoNgoai, IXoa, IXong } from '../BieuTuong'
import { layLinkTaiVideo } from './actions'

const oNhap = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/15'

// Thư viện clip MC nhép miệng: soạn câu lệnh cho ứng dụng Gemini (Veo, ~8 giây), tải video tạo xong lên từng clip
export default function ThuVienVideo({
  clip,
  doi,
  tenShop,
  sanPham,
  anhMc,
  baoLoi,
}: {
  clip: ClipMc[]
  doi: (c: ClipMc[]) => void
  tenShop: string
  sanPham: { ten: string; gia: number }[]
  anhMc: string
  baoLoi: (s: string) => void
}) {
  const [daChep, setDaChep] = useState<number | null>(null)
  const [dangTai, setDangTai] = useState<number | null>(null)
  const sua = (i: number, x: Partial<ClipMc>) => doi(clip.map((c, j) => (j === i ? { ...c, ...x } : c)))
  const soCo = clip.filter((c) => c.url).length

  const taiLen = async (i: number, f: File) => {
    setDangTai(i)
    try {
      const link = await layLinkTaiVideo(f.type)
      if (!link.ok) throw new Error(link.thongBao)
      const r = await fetch(link.linkTai, { method: 'PUT', body: f, headers: { 'content-type': f.type } })
      if (!r.ok) throw new Error(`Tải video lỗi (${r.status})`)
      sua(i, { url: link.linkVideo })
    } catch (e) {
      baoLoi(e instanceof Error ? e.message : 'Tải video lỗi')
    } finally {
      setDangTai(null)
    }
  }

  return (
    <fieldset className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-violet-800">Video MC nhép miệng (tạo bằng Gemini)</legend>
      <p className="text-xs text-phu">
        Khi không có bình luận, sân khấu phát lần lượt các clip đã tải lên (miệng khớp lời), ưu tiên hơn kịch bản đọc. Khách bình luận thì MC trả lời bằng giọng như thường.
        {clip.length > 0 && (
          <b className="ml-1 text-chu">
            Đã có {soCo}/{clip.length} video.
          </b>
        )}
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-phu">
        <li>
          Mở{' '}
          <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className="font-medium text-chinh underline">
            ứng dụng Gemini
          </a>{' '}
          (gói Pro), chọn tạo <b>Video</b>.
        </li>
        <li>
          Tải lên ảnh nhân vật
          {anhMc && (
            <>
              {' '}
              (
              <a href={anhMc} target="_blank" rel="noreferrer" download className="text-chinh underline">
                lấy ảnh MC
              </a>
              )
            </>
          )}
          , dán câu lệnh của từng clip (nút <b>Chép câu lệnh</b>), chờ Gemini tạo video.
        </li>
        <li>
          Tải video về máy, bấm <b>Tải video</b> ở đúng clip đó. Xong hết thì bấm <b>Lưu</b> phiên live.
        </li>
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (clip.length && !confirm('Tạo lại danh sách clip từ sản phẩm? Các clip và video đang có sẽ bị thay.')) return
            doi(taoDanhSachClip(tenShop || 'shop', sanPham))
          }}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {clip.length ? 'Tạo lại danh sách clip' : 'Tạo danh sách clip từ sản phẩm'}
        </button>
        {clip.length > 0 && (
          <button
            type="button"
            onClick={() => doi([...clip, { chu: '', san_pham: 0, url: '' }])}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            <ICong className="h-4 w-4" /> Thêm clip
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-3">
        {clip.map((c, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={`rounded-md px-2 py-0.5 font-bold ${c.url ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-phu'}`}>
                Clip {i + 1} {c.url ? '· đã có video' : '· chưa có video'}
              </span>
              {c.san_pham > 0 && <span className="truncate text-phu">Sản phẩm {c.san_pham}: {sanPham[c.san_pham - 1]?.ten}</span>}
              <button type="button" onClick={() => doi(clip.filter((_, j) => j !== i))} className="ml-auto rounded p-1 text-phu hover:text-red-600" aria-label="Xóa clip">
                <IXoa className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={c.chu}
              onChange={(e) => sua(i, { chu: e.target.value })}
              rows={2}
              placeholder="Lời MC nói trong clip (~8 giây, khoảng 20 chữ)"
              aria-label={`Lời clip ${i + 1}`}
              className={`${oNhap} mt-2 resize-y`}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!c.chu.trim()}
                onClick={() => navigator.clipboard.writeText(loiNhacVeo(c.chu)).then(() => (setDaChep(i), setTimeout(() => setDaChep(null), 1500)))}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${daChep === i ? 'bg-green-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}
              >
                {daChep === i ? <IXong className="h-3.5 w-3.5" /> : <IChep className="h-3.5 w-3.5" />}
                {daChep === i ? 'Đã chép' : 'Chép câu lệnh Gemini'}
              </button>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                <IMoNgoai className="h-3.5 w-3.5" /> Mở Gemini
              </a>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100">
                {dangTai === i ? 'Đang tải…' : c.url ? 'Đổi video' : 'Tải video'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && taiLen(i, e.target.files[0])} />
              </label>
            </div>
            {c.url && <video src={c.url} controls preload="metadata" className="mt-2 h-40 rounded-md bg-black" />}
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
