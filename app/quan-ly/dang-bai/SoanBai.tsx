'use client'

import { useActionState, useState } from 'react'
import { layLinkTaiAnh, taoBaiViet, type KetQua } from './actions'

export default function SoanBai({ trang }: { trang: { id: string; ten: string }[] }) {
  const [noiDung, setNoiDung] = useState('')
  const [anh, setAnh] = useState<string[]>([])
  const [dangTai, setDangTai] = useState(0)
  const [loiAnh, setLoiAnh] = useState('')
  const [cheDo, setCheDo] = useState<'ngay' | 'hen'>('ngay')
  const [kq, gui, dangGui] = useActionState(async (truoc: KetQua | null, f: FormData) => {
    const r = await taoBaiViet(truoc, f)
    if (r.ok) {
      setNoiDung('')
      setAnh([])
    }
    return r
  }, null)

  async function chonAnh(files: FileList | null) {
    setLoiAnh('')
    for (const file of Array.from(files ?? []).slice(0, 10 - anh.length)) {
      if (file.size > 8 * 1024 * 1024) {
        setLoiAnh(`${file.name} lớn hơn 8MB`)
        continue
      }
      setDangTai((n) => n + 1)
      try {
        const link = await layLinkTaiAnh(file.type)
        if (!link.ok) throw new Error(link.thongBao)
        const r = await fetch(link.linkTai, { method: 'PUT', body: file, headers: { 'content-type': file.type } })
        if (!r.ok) throw new Error(`Tải ảnh lỗi (${r.status})`)
        setAnh((ds) => [...ds, link.linkAnh])
      } catch (e) {
        setLoiAnh(e instanceof Error ? e.message : 'Tải ảnh lỗi')
      } finally {
        setDangTai((n) => n - 1)
      }
    }
  }

  return (
    <form action={gui} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <textarea
        name="noi_dung"
        value={noiDung}
        onChange={(e) => setNoiDung(e.target.value)}
        rows={6}
        placeholder="Nội dung bài viết…"
        className="rounded-lg border border-slate-300 px-3 py-2 text-[15px] focus:border-chinh focus:outline-none"
      />
      {anh.map((u) => (
        <input key={u} type="hidden" name="anh" value={u} />
      ))}
      <div className="flex flex-wrap gap-2">
        {anh.map((u) => (
          <div key={u} className="relative">
            <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setAnh((ds) => ds.filter((x) => x !== u))}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-xs text-white"
              aria-label="Bỏ ảnh"
            >
              ✕
            </button>
          </div>
        ))}
        {anh.length < 10 && (
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 text-center text-xs text-phu hover:border-chinh">
            {dangTai ? 'Đang tải…' : '+ Ảnh'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => chonAnh(e.target.files)} />
          </label>
        )}
      </div>
      {loiAnh && <p className="text-sm text-red-600">{loiAnh}</p>}

      <div>
        <p className="text-sm font-semibold">Đăng lên Fanpage</p>
        {trang.length ? (
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {trang.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5">
                <input type="checkbox" name="trang_id" value={t.id} /> {t.ten}
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-phu">Chưa có Fanpage. Bài sẽ chỉ lưu vào thư viện để đăng nhóm.</p>
        )}
        <p className="mt-1 text-xs text-phu">Không chọn Page nào thì bài chỉ được lưu vào thư viện (dùng cho Trợ lý đăng nhóm).</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="che_do" value="ngay" checked={cheDo === 'ngay'} onChange={() => setCheDo('ngay')} /> Đăng ngay
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="che_do" value="hen" checked={cheDo === 'hen'} onChange={() => setCheDo('hen')} /> Hẹn giờ
        </label>
        {cheDo === 'hen' && <input type="datetime-local" name="hen_luc" required className="rounded-md border border-slate-300 px-2 py-1" />}
      </div>

      <button
        disabled={dangGui || dangTai > 0}
        className="justify-self-start rounded-lg bg-chinh px-5 py-2 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50"
      >
        {dangGui ? 'Đang đăng…' : 'Lưu & đăng'}
      </button>
      {kq && <p className={`text-sm ${kq.ok ? 'text-green-700' : 'text-red-600'}`}>{kq.thongBao}</p>}
    </form>
  )
}
