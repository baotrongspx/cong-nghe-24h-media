import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Khóa trang bằng một mật khẩu đặt ở biến môi trường MAT_KHAU_LAM_PHIM (trên Vercel).
// Nhập đúng thì trình duyệt giữ một cookie = mã băm của mật khẩu; đổi mật khẩu là mọi máy phải nhập lại.
const TEN_COOKIE = 'khoa_lam_phim'
const THOI_HAN = 90 * 24 * 3600

const matKhau = () => process.env.MAT_KHAU_LAM_PHIM?.trim() ?? ''
const bam = (s: string) => createHash('sha256').update(`lam-phim:${s}`).digest()

export const coMatKhau = () => matKhau().length >= 6

export async function daMoKhoa() {
  if (!coMatKhau()) return false
  const c = (await cookies()).get(TEN_COOKIE)?.value
  if (!c) return false
  const a = Buffer.from(c, 'base64url')
  const b = bam(matKhau())
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function moKhoa(nhap: string) {
  if (!coMatKhau() || !timingSafeEqual(bam(nhap.trim()), bam(matKhau()))) return false
  ;(await cookies()).set(TEN_COOKIE, bam(matKhau()).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: THOI_HAN,
    path: '/',
  })
  return true
}
