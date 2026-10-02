import { after, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { chuKyHopLe } from '@/lib/facebook'
import { COT_TRANG, xuLyBinhLuan, xuLyTinNhan, type Trang } from '@/lib/hopThu'

export const maxDuration = 60

// Facebook gọi GET một lần để xác minh địa chỉ webhook
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === process.env.FB_VERIFY_TOKEN?.trim()) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('Sai mã xác minh', { status: 403 })
}

type ThanWebhook = {
  object: string
  entry?: { id: string; messaging?: Parameters<typeof xuLyTinNhan>[1][]; changes?: { field: string; value: Parameters<typeof xuLyBinhLuan>[1] }[] }[]
}

// Tin nhắn / bình luận mới. Trả 200 ngay (Facebook yêu cầu nhanh), xử lý sau khi đã phản hồi.
export async function POST(req: NextRequest) {
  const than = await req.text()
  if (!chuKyHopLe(than, req.headers.get('x-hub-signature-256'))) {
    return new Response('Chữ ký không hợp lệ', { status: 401 })
  }
  const du = JSON.parse(than) as ThanWebhook
  if (du.object !== 'page') return new Response('OK')

  after(async () => {
    for (const entry of du.entry ?? []) {
      const { data: trang } = await db()
        .from('fb_trang')
        .select(COT_TRANG)
        .eq('id', entry.id)
        .maybeSingle<Trang>()
      if (!trang) continue
      for (const e of entry.messaging ?? []) {
        await xuLyTinNhan(trang, e).catch((loi) => console.error('Webhook tin nhắn lỗi:', loi))
      }
      for (const c of entry.changes ?? []) {
        if (c.field === 'feed') await xuLyBinhLuan(trang, c.value).catch((loi) => console.error('Webhook bình luận lỗi:', loi))
      }
    }
  })
  return new Response('OK')
}
