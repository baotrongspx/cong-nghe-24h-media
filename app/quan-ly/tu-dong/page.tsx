import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { batTatTuDong, themTuDong, xoaTuDong } from '../actions'
import { CongTac, NutHanhDong } from '../NutHanhDong'

const AP_DUNG = { ca_hai: 'Tin nhắn + bình luận', tin_nhan: 'Chỉ tin nhắn', binh_luan: 'Chỉ bình luận' } as const
const O = 'rounded-lg border border-slate-300 px-3 py-2 text-sm'

export default async function TuDong() {
  const { trangIds } = await batBuocDangNhap()
  const [{ data: trang }, { data: kb }] = await Promise.all([
    db().from('fb_trang').select('id, ten').in('id', trangIds).order('ten'),
    db().from('tu_dong').select('id, trang_id, tu_khoa, tra_loi, ap_dung, bat').in('trang_id', trangIds),
  ])
  const tenTrang = new Map((trang ?? []).map((t) => [t.id, t.ten]))
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Tự động trả lời theo từ khóa</h1>
      <p className="mt-2 text-sm text-phu">
        Khi tin nhắn hoặc bình luận của khách chứa một trong các từ khóa, hệ thống tự gửi câu trả lời. Ví dụ từ khóa: giá, bao nhiêu, ib.
      </p>
      {trang?.length ? (
        <form action={themTuDong} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <select name="trang_id" className={O}>
            {trang.map((t) => (
              <option key={t.id} value={t.id}>{t.ten}</option>
            ))}
          </select>
          <select name="ap_dung" className={O}>
            {Object.entries(AP_DUNG).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input name="tu_khoa" required placeholder="Từ khóa, cách nhau bằng dấu phẩy" className={`${O} sm:col-span-2`} />
          <textarea name="tra_loi" required rows={3} placeholder="Nội dung trả lời" className={`${O} sm:col-span-2`} />
          <button className="rounded-lg bg-chinh px-4 py-2 font-semibold text-white hover:bg-chinh-dam sm:col-span-2 sm:justify-self-end">
            Thêm kịch bản
          </button>
        </form>
      ) : (
        <p className="mt-6 text-phu">Chưa có Fanpage nào được kết nối.</p>
      )}
      <ul className="mt-6 space-y-3">
        {(kb ?? []).map((k) => (
          <li key={k.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-phu">
              <span className="font-semibold text-chu">{tenTrang.get(k.trang_id)}</span>·<span>{AP_DUNG[k.ap_dung as keyof typeof AP_DUNG]}</span>
              <NutHanhDong chay={xoaTuDong.bind(null, k.id)} xacNhan="Xóa kịch bản này?" className="ml-auto text-red-600 hover:underline">
                Xóa
              </NutHanhDong>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(k.tu_khoa as string[]).map((t) => (
                <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-sm">{t}</span>
              ))}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">↳ {k.tra_loi}</p>
            <CongTac nhan="Đang bật" bat={k.bat} chay={batTatTuDong.bind(null, k.id)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
