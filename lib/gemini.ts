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
): Promise<string> {
  const khoa = process.env.GEMINI_API_KEY?.trim()
  if (!khoa) throw new Error('Chưa cài GEMINI_API_KEY')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: heThong }] },
      contents,
      generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
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
  return chu
}
