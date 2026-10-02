import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { nguoiDungId } from '@/lib/phien'
import NutNhanLoiMoi from './NutNhanLoiMoi'

export const metadata: Metadata = { title: 'Lời mời làm nhân viên', robots: { index: false } }

const daQua = (s: string) => new Date(s).getTime() < Date.now()

export default async function LoiMoi({ params }: PageProps<'/moi/[ma]'>) {
  const { ma } = await params
  const { data: lm } = await db()
    .from('loi_moi')
    .select('ma, trang_ids, het_han, da_dung_boi, chu:chu_id (ten, anh)')
    .eq('ma', ma)
    .maybeSingle()
  const chu = lm?.chu as unknown as { ten: string; anh: string | null } | null
  const conHieuLuc = lm && !lm.da_dung_boi && !daQua(lm.het_han)
  const { data: trang } = conHieuLuc ? await db().from('fb_trang').select('id, ten').in('id', lm.trang_ids) : { data: [] }
  const daDangNhap = !!(await nguoiDungId())

  return (
    <main className="flex flex-1 items-center justify-center bg-nen px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Link href="/" className="text-lg font-extrabold text-chinh-dam">
          24H<span className="text-nhan"> Page</span>
        </Link>
        {conHieuLuc ? (
          <>
            {chu?.anh && <img src={chu.anh} alt="" className="mx-auto mt-6 h-14 w-14 rounded-full" />}
            <h1 className="mt-3 text-xl font-bold">{chu?.ten} mời bạn làm nhân viên</h1>
            <p className="mt-2 text-phu">Bạn sẽ trả lời tin nhắn, bình luận của các Fanpage:</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {(trang ?? []).map((t) => (
                <li key={t.id} className="rounded-full bg-chinh/10 px-3 py-1 text-sm font-medium text-chinh">{t.ten}</li>
              ))}
            </ul>
            {daDangNhap ? (
              <NutNhanLoiMoi ma={ma} />
            ) : (
              <a
                href={`/api/fb/dang-nhap?ve=${encodeURIComponent(`/moi/${ma}`)}`}
                className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#1877f2] px-4 py-3 font-semibold text-white hover:bg-[#166fe5]"
              >
                Đăng nhập bằng Facebook để nhận lời mời
              </a>
            )}
            <p className="mt-4 text-xs text-phu">Bạn không cần là quản trị viên của Page trên Facebook. Lời mời dùng được một lần, hết hạn sau 7 ngày.</p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-bold">Lời mời không còn hiệu lực</h1>
            <p className="mt-2 text-phu">Lời mời đã được dùng, đã hết hạn hoặc đã bị hủy. Hãy xin chủ shop gửi lời mời mới.</p>
          </>
        )}
      </div>
    </main>
  )
}
