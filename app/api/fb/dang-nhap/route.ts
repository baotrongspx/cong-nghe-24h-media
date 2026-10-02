import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { urlDangNhap } from '@/lib/facebook'

// Chuyển sang hộp thoại đăng nhập Facebook. state chống giả mạo yêu cầu (CSRF).
export async function GET(req: NextRequest) {
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
