import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import type { KichBan } from '@/lib/tuDong'
import { ISet, ITinNhan } from '../BieuTuong'
import { KhuSoan, TheKichBan } from './KichBanClient'

export default async function TuDong() {
  const { trangChu: trangIds } = await batBuocDangNhap()
  const [{ data: dsTrang }, { data: dsKb }] = await Promise.all([
    db().from('fb_trang').select('id, ten').in('id', trangIds).order('ten'),
    // select('*'): vẫn hiện được khi chưa thêm cột mới vào cơ sở dữ liệu
    db().from('tu_dong').select('*').in('trang_id', trangIds),
  ])
  const trang = (dsTrang ?? []) as { id: string; ten: string }[]
  const tenTrang = new Map(trang.map((t) => [t.id, t.ten]))
  const kb = ((dsKb ?? []) as KichBan[]).sort((a, b) => (a.tao_luc ?? '').localeCompare(b.tao_luc ?? ''))
  const moiTin = kb.filter((k) => !k.tu_khoa.length)
  const tuKhoa = kb.filter((k) => k.tu_khoa.length)
  const nhieuTrang = trang.length > 1

  const nhom = (tieuDe: string, moTa: string, bieuTuong: React.ReactNode, ds: KichBan[], trong: string) => (
    <section>
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-slate-200">{bieuTuong}</span>
        <div>
          <h2 className="font-semibold">
            {tieuDe} <span className="font-normal text-phu">({ds.length})</span>
          </h2>
          <p className="text-xs text-phu">{moTa}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-3">
        {ds.length ? (
          ds.map((k) => <TheKichBan key={k.id} kb={k} tenTrang={nhieuTrang ? tenTrang.get(k.trang_id) : undefined} />)
        ) : (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-phu">{trong}</li>
        )}
      </ul>
    </section>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tự động trả lời</h1>
            <p className="mt-1 max-w-2xl text-sm text-phu">
              Trả lời khách ngay lập tức, cả lúc nửa đêm. Kịch bản có từ khóa được ưu tiên; không khớp từ khóa nào thì dùng kịch bản “mọi tin mới”.
            </p>
          </div>
          {kb.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
                <b className="tabular-nums">{kb.filter((k) => k.bat).length}</b> <span className="text-phu">đang bật</span>
              </span>
              <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
                <b className="tabular-nums">{kb.length}</b> <span className="text-phu">kịch bản</span>
              </span>
            </div>
          )}
        </header>

        {trang.length ? (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <KhuSoan trang={trang} />
            <div className="space-y-8">
              {nhom(
                'Trả lời mọi tin mới',
                'Lời chào khi khách nhắn, hoặc báo “đã inbox” khi khách bình luận',
                <ISet className="h-4 w-4 text-amber-600" />,
                moiTin,
                'Chưa có. Thử mẫu “Chào khách nhắn tin” hoặc “Bình luận: báo đã inbox”.',
              )}
              {nhom('Trả lời theo từ khóa', 'Khách hỏi giá, ship, còn hàng… được trả lời đúng câu hỏi', <ITinNhan className="h-4 w-4 text-chinh" />, tuKhoa, 'Chưa có. Bấm một mẫu bên trái để bắt đầu.')}
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-phu">Chưa có Fanpage nào bạn là chủ. Chỉ chủ Page mới cài được tự động trả lời.</p>
        )}
      </div>
    </div>
  )
}
