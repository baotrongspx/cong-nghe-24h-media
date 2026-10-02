import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

// Phiên đăng nhập: cookie "phien" = <user id>.<hết hạn>.<chữ ký HMAC>. Không lưu token Facebook trong cookie.
const TEN_COOKIE = 'phien'
const THOI_HAN = 30 * 24 * 3600

function khoa() {
  const k = process.env.SESSION_SECRET
  if (!k || k.length < 32) throw new Error('Thiếu SESSION_SECRET (ít nhất 32 ký tự)')
  return k
}

const ky = (s: string) => createHmac('sha256', khoa()).update(s).digest('base64url')

export async function taoPhien(nguoiDungId: string) {
  const het = Math.floor(Date.now() / 1000) + THOI_HAN
  const giaTri = `${nguoiDungId}.${het}`
  ;(await cookies()).set(TEN_COOKIE, `${giaTri}.${ky(giaTri)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: THOI_HAN,
    path: '/',
  })
}

export async function xoaPhien() {
  ;(await cookies()).delete(TEN_COOKIE)
}

export async function nguoiDungId() {
  const c = (await cookies()).get(TEN_COOKIE)?.value
  if (!c) return null
  const [id, het, chuKy] = c.split('.')
  if (!id || !het || !chuKy) return null
  const a = Buffer.from(chuKy)
  const b = Buffer.from(ky(`${id}.${het}`))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(het) < Date.now() / 1000) return null
  return id
}

// Dùng ở trang/hành động cần đăng nhập: trả về id người dùng và danh sách page họ quản lý
export async function batBuocDangNhap() {
  const id = await nguoiDungId()
  if (!id) redirect('/dang-nhap')
  const { data: nd } = await db().from('nguoi_dung').select('id, ten, anh').eq('id', id).maybeSingle()
  if (!nd) redirect('/dang-nhap')
  const { data } = await db().from('trang_quan_tri').select('trang_id').eq('nguoi_dung_id', id)
  return { nguoiDung: nd as { id: string; ten: string; anh: string | null }, trangIds: (data ?? []).map((r) => r.trang_id as string) }
}
