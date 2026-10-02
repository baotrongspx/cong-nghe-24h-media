import 'server-only'

// Gọi Google Gemini (generateContent). Khóa lấy tại https://aistudio.google.com/apikey, đặt vào GEMINI_API_KEY.
const MODEL = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

export const coKhoaGemini = () => !!process.env.GEMINI_API_KEY?.trim()

export type TinHoiThoai = { vai: 'khach' | 'shop'; noiDung: string }
export type KetQuaAi = { traLoi: string; canNguoiThat: boolean }

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
  const kq = JSON.parse(chu) as { tra_loi?: string; can_nguoi_that?: boolean }
  return { traLoi: (kq.tra_loi ?? '').trim(), canNguoiThat: !!kq.can_nguoi_that }
}
