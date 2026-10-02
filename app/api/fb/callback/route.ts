import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { dangKyWebhook, doiCodeLayToken, graph, layDanhSachTrang } from '@/lib/facebook'
import { taoPhien } from '@/lib/phien'

const veDangNhap = (req: NextRequest, loi: string) =>
  NextResponse.redirect(new URL(`/dang-nhap?loi=${encodeURIComponent(loi)}`, req.url))

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const kho = await cookies()
  const state = kho.get('fb_state')?.value
  kho.delete('fb_state')

  if (q.get('error')) return veDangNhap(req, 'Bạn đã hủy đăng nhập Facebook.')
  const code = q.get('code')
  if (!code || !state || q.get('state') !== state) return veDangNhap(req, 'Phiên đăng nhập hết hạn, vui lòng thử lại.')

  try {
    const userToken = await doiCodeLayToken(code, new URL('/api/fb/callback', req.url).toString())
    const me = await graph<{ id: string; name: string; picture?: { data?: { url?: string } } }>('me', {
      access_token: userToken,
      fields: 'id,name,picture{url}',
    })
    const { error: loiNd } = await db()
      .from('nguoi_dung')
      .upsert({ id: me.id, ten: me.name, anh: me.picture?.data?.url ?? null })
    if (loiNd) throw new Error(loiNd.message)

    const trang = await layDanhSachTrang(userToken)
    if (trang.length) {
      // Chỉ cập nhật tên/ảnh/token; giữ nguyên các cài đặt (tự ẩn bình luận...) đã chỉnh
      const { error } = await db()
        .from('fb_trang')
        .upsert(trang.map((t) => ({ id: t.id, ten: t.name, anh: t.picture?.data?.url ?? null, access_token: t.access_token })))
      if (error) throw new Error(error.message)
      await db()
        .from('trang_quan_tri')
        .upsert(trang.map((t) => ({ nguoi_dung_id: me.id, trang_id: t.id })), { ignoreDuplicates: true })
      const kq = await Promise.allSettled(trang.map((t) => dangKyWebhook(t.id, t.access_token)))
      kq.forEach((k, i) => k.status === 'rejected' && console.error(`Đăng ký webhook ${trang[i].name} lỗi:`, k.reason))
    }

    await taoPhien(me.id)
    return NextResponse.redirect(new URL('/quan-ly', req.url))
  } catch (e) {
    console.error('Đăng nhập Facebook lỗi:', e)
    return veDangNhap(req, 'Không đăng nhập được Facebook. Vui lòng thử lại.')
  }
}
