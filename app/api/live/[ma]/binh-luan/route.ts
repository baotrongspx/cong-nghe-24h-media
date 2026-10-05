import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { binhLuanGanDay, layPhienTheoMa } from '@/lib/liveAi'

type Ctx = { params: Promise<{ ma: string }> }

// Chương trình đọc bình luận TikTok trên máy gửi bình luận mới về đây. Mã phiên trong link là khóa bí mật.
export async function POST(req: NextRequest, { params }: Ctx) {
  const phien = await layPhienTheoMa((await params).ma)
  if (!phien) return NextResponse.json({ loi: 'Không tìm thấy phiên live' }, { status: 404 })
  const than = (await req.json().catch(() => null)) as { ds?: { ten?: unknown; noiDung?: unknown }[] } | null
  const ds = (than?.ds ?? [])
    .map((x) => ({ phien_id: phien.id, ten: String(x.ten ?? '').trim().slice(0, 80), noi_dung: String(x.noiDung ?? '').trim().slice(0, 300) }))
    .filter((x) => x.noi_dung)
    .slice(0, 50)
  if (ds.length) {
    const { error } = await db().from('live_binh_luan').insert(ds)
    if (error) return NextResponse.json({ loi: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, nhan: ds.length })
}

// Sân khấu lấy bình luận mới nhất để hiện lên màn hình
export async function GET(_req: NextRequest, { params }: Ctx) {
  const phien = await layPhienTheoMa((await params).ma)
  if (!phien) return NextResponse.json({ loi: 'Không tìm thấy phiên live' }, { status: 404 })
  return NextResponse.json({ ds: await binhLuanGanDay(phien.id) }, { headers: { 'cache-control': 'no-store' } })
}
