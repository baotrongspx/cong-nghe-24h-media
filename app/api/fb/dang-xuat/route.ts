import { NextResponse, type NextRequest } from 'next/server'
import { xoaPhien } from '@/lib/phien'

export async function POST(req: NextRequest) {
  await xoaPhien()
  return NextResponse.redirect(new URL('/dang-nhap', req.url), 303)
}
