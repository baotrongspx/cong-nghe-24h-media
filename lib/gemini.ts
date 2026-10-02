import 'server-only'

// Gọi Google Gemini (generateContent). Khóa lấy tại https://aistudio.google.com/apikey, đặt vào GEMINI_API_KEY.
const MODEL = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

export const coKhoaGemini = () => !!process.env.GEMINI_API_KEY?.trim()

export type TinHoiThoai = { vai: 'khach' | 'shop'; noiDung: string }
// Đơn khách vừa chốt trong cuộc trò chuyện (AI đọc ra từ lịch sử chat)
export type DonAi = { khachTen: string; soDienThoai: string; diaChi: string; sanPham: { ten: string; sl: number; gia: number }[]; phiShip: number; ghiChu: string }
export type KetQuaAi = { traLoi: string; canNguoiThat: boolean; donHang: DonAi | null }

// Gemini cần lượt đầu là của người dùng, và nên xen kẽ user/model: gộp các tin liền nhau cùng một bên
function dungHoiThoai(ds: TinHoiThoai[]) {
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  for (const t of ds) {
    const role = t.vai === 'khach' ? 'user' : 'model'
    const cuoi = contents.at(-1)
    if (cuoi?.role === role) cuoi.parts[0].text += `\n${t.noiDung}`
    else contents.push({ role, parts: [{ text: t.noiDung }] })
  }
  while (contents[0]?.role === 'model') contents.shift()
  return contents
}

export async function hoiGemini(heThong: string, hoiThoai: TinHoiThoai[]): Promise<KetQuaAi> {
  const khoa = process.env.GEMINI_API_KEY?.trim()
  if (!khoa) throw new Error('Chưa cài GEMINI_API_KEY')
  const contents = dungHoiThoai(hoiThoai)
  if (!contents.length || contents.at(-1)!.role !== 'user') throw new Error('Không có tin nào của khách để trả lời')

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: heThong }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            tra_loi: { type: 'STRING', description: 'Tin trả lời gửi cho khách' },
            can_nguoi_that: { type: 'BOOLEAN', description: 'true nếu cần nhân viên thật xử lý tiếp' },
            don_hang: {
              type: 'OBJECT',
              nullable: true,
              description: 'Chỉ điền khi khách đã chốt mua và đã có đủ: sản phẩm, số lượng, tên, số điện thoại, địa chỉ nhận hàng. Ngược lại để null.',
              properties: {
                khach_ten: { type: 'STRING' },
                so_dien_thoai: { type: 'STRING' },
                dia_chi: { type: 'STRING' },
                san_pham: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      ten: { type: 'STRING', description: 'Tên sản phẩm kèm phân loại (màu, size, dung lượng)' },
                      sl: { type: 'INTEGER' },
                      gia: { type: 'INTEGER', description: 'Đơn giá (đồng) theo thông tin shop, 0 nếu không rõ' },
                    },
                    required: ['ten', 'sl', 'gia'],
                  },
                },
                phi_ship: { type: 'INTEGER', description: 'Phí ship (đồng) theo thông tin shop, 0 nếu miễn phí / không rõ' },
                ghi_chu: { type: 'STRING' },
              },
              required: ['khach_ten', 'so_dien_thoai', 'dia_chi', 'san_pham'],
            },
          },
          required: ['tra_loi', 'can_nguoi_that'],
        },
      },
    }),
    signal: AbortSignal.timeout(25_000),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Gemini lỗi: ${json.error?.message ?? res.status}`)
  const chu = ((json.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
  if (!chu) throw new Error(`Gemini không trả lời (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? 'không rõ'})`)
  const kq = JSON.parse(chu) as {
    tra_loi?: string
    can_nguoi_that?: boolean
    don_hang?: { khach_ten?: string; so_dien_thoai?: string; dia_chi?: string; san_pham?: { ten?: string; sl?: number; gia?: number }[]; phi_ship?: number; ghi_chu?: string } | null
  }
  const d = kq.don_hang
  const sanPham = (d?.san_pham ?? [])
    .filter((x) => x.ten?.trim())
    .map((x) => ({ ten: x.ten!.trim().slice(0, 200), sl: Math.max(1, Math.round(Number(x.sl)) || 1), gia: Math.max(0, Math.round(Number(x.gia)) || 0) }))
  const soDienThoai = (d?.so_dien_thoai ?? '').replace(/[^\d+]/g, '')
  // Chỉ nhận đơn đủ thông tin: có sản phẩm, SĐT hợp lệ, địa chỉ
  const donHang =
    d && sanPham.length && soDienThoai.replace(/\D/g, '').length >= 9 && (d.dia_chi ?? '').trim().length >= 5
      ? {
          khachTen: (d.khach_ten ?? '').trim().slice(0, 200),
          soDienThoai,
          diaChi: d.dia_chi!.trim().slice(0, 500),
          sanPham,
          phiShip: Math.max(0, Math.round(Number(d.phi_ship)) || 0),
          ghiChu: (d.ghi_chu ?? '').trim().slice(0, 1000),
        }
      : null
  return { traLoi: (kq.tra_loi ?? '').trim(), canNguoiThat: !!kq.can_nguoi_that, donHang }
}
