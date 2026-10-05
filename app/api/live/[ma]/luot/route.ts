import { NextResponse, type NextRequest } from 'next/server'
import { layPhienTheoMa, luotTiepTheo } from '@/lib/liveAi'

// Gemini viết lời + đọc thành giọng mất vài giây
export const maxDuration = 60

// Sân khấu xin lượt nói tiếp theo của MC ảo
export async function POST(req: NextRequest, { params }: { params: Promise<{ ma: string }> }) {
  const phien = await layPhienTheoMa((await params).ma)
  if (!phien) return NextResponse.json({ loi: 'Không tìm thấy phiên live' }, { status: 404 })
  const than = (await req.json().catch(() => ({}))) as { spTruoc?: number; daNoi?: string[]; dauTien?: boolean }
  try {
    const kq = await luotTiepTheo(phien, {
      spTruoc: Math.max(0, Number(than.spTruoc) || 0),
      daNoi: (Array.isArray(than.daNoi) ? than.daNoi : []).map(String).slice(-3),
      dauTien: !!than.dauTien,
    })
    return NextResponse.json(kq, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    console.error('Live AI lỗi:', e)
    return NextResponse.json({ loi: e instanceof Error ? e.message : 'Lỗi' }, { status: 500 })
  }
}
