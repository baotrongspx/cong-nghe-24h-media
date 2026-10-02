import { db } from '@/lib/db'
import { batBuocDangNhap } from '@/lib/phien'
import { capNhatNhanVien, doiCheDoChia, xoaLoiMoi, xoaNhanVien } from '../actions'
import { CongTac, NutHanhDong } from '../NutHanhDong'
import FormLoiMoi from './FormLoiMoi'

type ThanhVien = {
  nguoi_dung_id: string
  trang_id: string
  vai_tro: string
  nhan_chia: boolean
  chi_xem_cua_minh: boolean
  nguoi: { ten: string; anh: string | null } | null
}

const ngay = (s: string) => new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
// Gọi ngoài render để tránh hàm không thuần trong component
const bayGio = () => new Date().toISOString()

export default async function NhanVien() {
  const { nguoiDung, goi, trangChu, trangIds } = await batBuocDangNhap()
  const laNhanVienO = trangIds.filter((t) => !trangChu.includes(t))

  if (!trangChu.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Nhân viên</h1>
        <p className="mt-3 text-phu">
          {laNhanVienO.length
            ? `Bạn đang là nhân viên của ${laNhanVienO.length} Page. Chỉ chủ Page mới mời và quản lý nhân viên.`
            : 'Kết nối Fanpage của bạn trước, sau đó mời nhân viên cùng trả lời khách.'}
        </p>
      </div>
    )
  }

  const [{ data: dsTrang }, { data: dsThanhVien }, { data: dsMoi }] = await Promise.all([
    db().from('fb_trang').select('id, ten, che_do_chia').in('id', trangChu).order('ten'),
    db()
      .from('trang_quan_tri')
      .select('nguoi_dung_id, trang_id, vai_tro, nhan_chia, chi_xem_cua_minh, nguoi:nguoi_dung_id (ten, anh)')
      .in('trang_id', trangChu)
      .eq('bat', true),
    db()
      .from('loi_moi')
      .select('ma, trang_ids, het_han')
      .eq('chu_id', nguoiDung.id)
      .is('da_dung_boi', null)
      .gt('het_han', bayGio()),
  ])
  const trang = dsTrang ?? []
  const tenTrang = new Map(trang.map((t) => [t.id as string, t.ten as string]))
  const thanhVien = (dsThanhVien ?? []) as unknown as ThanhVien[]

  // Gom theo người
  const theoNguoi = new Map<string, { ten: string; anh: string | null; laNhanVien: boolean; dong: ThanhVien[] }>()
  for (const r of thanhVien) {
    const x = theoNguoi.get(r.nguoi_dung_id) ?? { ten: r.nguoi?.ten ?? 'Không rõ', anh: r.nguoi?.anh ?? null, laNhanVien: false, dong: [] }
    if (r.vai_tro === 'nhan_vien') x.laNhanVien = true
    x.dong.push(r)
    theoNguoi.set(r.nguoi_dung_id, x)
  }
  const soNhanVien = [...theoNguoi.values()].filter((x) => x.laNhanVien).length

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <h1 className="text-2xl font-bold">Nhân viên</h1>
          <p className="mt-1 text-sm text-phu">
            {soNhanVien}/{goi.soNhanVien} nhân viên theo gói {goi.ten}. Nhân viên trả lời tin nhắn, bình luận; không đổi được cài đặt Page và kịch bản tự
            động.
          </p>
          <ul className="mt-5 space-y-3">
            {[...theoNguoi.entries()].map(([id, x]) => (
              <li key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  {x.anh ? <img src={x.anh} alt="" className="h-9 w-9 rounded-full" /> : <span className="h-9 w-9 rounded-full bg-slate-200" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {x.ten} {id === nguoiDung.id && <span className="text-xs font-normal text-phu">(bạn)</span>}
                    </p>
                    <p className="text-xs text-phu">{x.laNhanVien ? 'Nhân viên' : 'Quản trị Page'}</p>
                  </div>
                  {x.laNhanVien && (
                    <NutHanhDong chay={xoaNhanVien.bind(null, id)} xacNhan={`Xóa ${x.ten} khỏi nhân viên?`} className="text-sm text-red-600 hover:underline">
                      Xóa
                    </NutHanhDong>
                  )}
                </div>
                <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                  {x.dong.map((r) => (
                    <div key={r.trang_id} className="py-1">
                      <p className="pt-1 text-xs font-semibold text-phu">{tenTrang.get(r.trang_id)}</p>
                      <CongTac nhan="Nhận hội thoại khi chia xoay vòng" bat={r.nhan_chia} chay={capNhatNhanVien.bind(null, id, r.trang_id, 'nhan_chia')} />
                      {r.vai_tro === 'nhan_vien' && (
                        <CongTac
                          nhan="Chỉ thấy hội thoại được giao cho mình"
                          bat={r.chi_xem_cua_minh}
                          chay={capNhatNhanVien.bind(null, id, r.trang_id, 'chi_xem_cua_minh')}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-5">
          <FormLoiMoi trang={trang.map((t) => ({ id: t.id as string, ten: t.ten as string }))} />
          {(dsMoi ?? []).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold">Lời mời chưa dùng</p>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {(dsMoi ?? []).map((m) => (
                  <li key={m.ma} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate">
                      {(m.trang_ids as string[]).map((t) => tenTrang.get(t)).join(', ')} · hết hạn {ngay(m.het_han)}
                    </span>
                    <NutHanhDong chay={xoaLoiMoi.bind(null, m.ma)} className="text-red-600 hover:underline">
                      Hủy
                    </NutHanhDong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold">Chia hội thoại mới</p>
            <p className="mt-1 text-xs text-phu">
              Xoay vòng: mỗi khách mới lần lượt giao cho người tiếp theo đang bật Nhận hội thoại. Thủ công: tự giao trong hộp thư, ai trả lời trước sẽ phụ trách.
            </p>
            <div className="mt-2 divide-y divide-slate-100">
              {trang.map((t) => (
                <CongTac key={t.id} nhan={`${t.ten}: chia xoay vòng tự động`} bat={t.che_do_chia === 'xoay_vong'} chay={doiCheDoChia.bind(null, t.id)} />
              ))}
            </div>
          </div>
          <p className="text-xs text-phu">
            Khi app Facebook chưa được Meta duyệt, nhân viên cần được thêm vào mục Vai trò của app (Người thử nghiệm) thì mới đăng nhập được.
          </p>
        </section>
      </div>
    </div>
  )
}
