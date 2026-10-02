import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { themMauCau, themThe, xoaMauCau, xoaThe } from '../actions'
import { NutHanhDong } from '../NutHanhDong'

const O = 'rounded-lg border border-slate-300 px-3 py-2 text-sm'

export default async function MauCau() {
  const { nguoiDung } = await batBuocDangNhap()
  const [{ data: mau }, { data: the }] = await Promise.all([
    db().from('mau_cau').select('id, phim_tat, noi_dung').eq('nguoi_dung_id', nguoiDung.id).order('phim_tat'),
    db().from('the_hoi_thoai').select('id, ten, mau').eq('nguoi_dung_id', nguoiDung.id).order('ten'),
  ])
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h1 className="text-2xl font-bold">Mẫu câu trả lời nhanh</h1>
          <p className="mt-2 text-sm text-phu">Trong hộp thư, gõ dấu / và phím tắt để chèn nhanh. Ví dụ: /gia, /ship, /stk.</p>
          <form action={themMauCau} className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <input name="phim_tat" required placeholder="Phím tắt, ví dụ: gia" className={O} />
            <textarea name="noi_dung" required rows={3} placeholder="Nội dung mẫu câu" className={O} />
            <button className="justify-self-end rounded-lg bg-chinh px-4 py-2 font-semibold text-white hover:bg-chinh-dam">Thêm mẫu câu</button>
          </form>
          <ul className="mt-4 space-y-2">
            {(mau ?? []).map((m) => (
              <li key={m.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <b className="shrink-0 text-chinh">/{m.phim_tat}</b>
                <span className="flex-1 whitespace-pre-wrap">{m.noi_dung}</span>
                <NutHanhDong chay={xoaMauCau.bind(null, m.id)} className="text-red-600 hover:underline">
                  Xóa
                </NutHanhDong>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Thẻ hội thoại</h2>
          <p className="mt-2 text-sm text-phu">Gắn thẻ để phân loại khách (Đã chốt, Hỏi giá, Bom hàng…) và lọc trong hộp thư.</p>
          <form action={themThe} className="mt-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <input name="ten" required placeholder="Tên thẻ" className={`${O} min-w-0 flex-1`} />
            <input name="mau" type="color" defaultValue="#2563eb" aria-label="Màu thẻ" className="h-10 w-12 rounded border border-slate-300" />
            <button className="rounded-lg bg-chinh px-4 py-2 font-semibold text-white hover:bg-chinh-dam">Thêm</button>
          </form>
          <ul className="mt-4 flex flex-wrap gap-2">
            {(the ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white" style={{ background: t.mau }}>
                {t.ten}
                <NutHanhDong chay={xoaThe.bind(null, t.id)} className="opacity-80 hover:opacity-100">
                  ✕
                </NutHanhDong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
