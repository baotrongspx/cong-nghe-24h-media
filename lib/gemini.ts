import 'server-only'

// Gọi Google Gemini (generateContent). Khóa lấy tại https://aistudio.google.com/apikey, đặt vào GEMINI_API_KEY.
const MODEL = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

export const coKhoaGemini = () => !!process.env.GEMINI_API_KEY?.trim()

// Gọi Gemini, ép trả về JSON theo schema. contents: các lượt user/model.
export async function goiGeminiJson(
  heThong: string,
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[],
  schema: object,
  temperature = 0.4,
  cho = 25_000,
  moHinh: string[] = [],
): Promise<string> {
  const khoa = process.env.GEMINI_API_KEY?.trim()
  if (!khoa) throw new Error('Chưa cài GEMINI_API_KEY')
  // Thử lần lượt: mô hình được yêu cầu → mô hình mặc định → mô hình dự phòng.
  // Mô hình không có thì bỏ qua; Google báo quá tải (503/429) thì chờ một nhịp, thử lại, rồi chuyển mô hình khác.
  const ds = [...new Set([...moHinh.filter(Boolean), MODEL(), ...DU_PHONG])]
  const het = Date.now() + cho
  let loiCuoi: unknown = null
  for (const m of ds) {
    for (let lan = 0; lan < 2; lan++) {
      const con = het - Date.now()
      if (con < 4000) break
      try {
        return await goiMot(m, khoa, heThong, contents, schema, temperature, con)
      } catch (e) {
        loiCuoi = e
        const tb = e instanceof Error ? e.message : ''
        if (/not found|not supported|404|unknown name|is not available/i.test(tb)) break
        if (!/high demand|overloaded|unavailable|503|429|resource.?exhausted|rate|quota|try again/i.test(tb)) throw e
        await new Promise((xong) => setTimeout(xong, 1500 + lan * 2000))
      }
    }
  }
  const tb = loiCuoi instanceof Error ? loiCuoi.message : ''
  throw new Error(/high demand|overloaded|unavailable|503|429|exhausted|quota/i.test(tb) ? 'Máy chủ Gemini của Google đang quá tải, đã thử lại nhiều lần. Đợi 1-2 phút rồi bấm lại nhé.' : tb || 'Gemini lỗi')
}

// Mô hình dự phòng khi mô hình chính quá tải
const DU_PHONG = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash']

async function goiMot(
  moHinh: string,
  khoa: string,
  heThong: string,
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[],
  schema: object,
  temperature: number,
  cho: number,
): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${moHinh}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: heThong }] },
      contents,
      generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
    }),
    signal: AbortSignal.timeout(cho),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Gemini lỗi: ${json.error?.message ?? res.status}`)
  const chu = ((json.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
  if (!chu) throw new Error(`Gemini không trả lời (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? 'không rõ'})`)
  return chu
}
