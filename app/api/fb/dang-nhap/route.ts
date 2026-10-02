import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { urlDangNhap } from '@/lib/facebook'

// Chuyển sang hộp thoại đăng nhập Facebook. state chống giả mạo yêu cầu (CSRF).
export async function GET(req: NextRequest) {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET || !process.env.SESSION_SECRET) {
    const loi = 'Máy chủ chưa cấu hình FACEBOOK_APP_ID / FACEBOOK_APP_SECRET / SESSION_SECRET. Thêm vào Vercel rồi Redeploy.'
    return NextResponse.redirect(new URL(`/dang-nhap?loi=${encodeURIComponent(loi)}`, req.url))
  }
  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set('fb_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return NextResponse.redirect(urlDangNhap(new URL('/api/fb/callback', req.url).toString(), state))
}
