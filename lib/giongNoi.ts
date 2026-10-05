import 'server-only'

// Chuyển chữ thành giọng nói tiếng Việt bằng Gemini TTS. Trả về WAV (24 kHz, mono, 16-bit) dạng base64.
const MODEL = () => process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.8-flash-lite-tts'

export { GIONG } from '@/lib/giongDoc'

// Tìm chuỗi base64 âm thanh trong kết quả (cấu trúc trả về có thể khác nhau giữa các phiên bản API)
function timAmThanh(x: unknown): string | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const mime = String(o.mime_type ?? o.mimeType ?? '')
  if (typeof o.data === 'string' && o.data.length > 100 && (!mime || mime.startsWith('audio'))) return o.data
  for (const v of Object.values(o)) {
    const kq = Array.isArray(v) ? v.map(timAmThanh).find(Boolean) : timAmThanh(v)
    if (kq) return kq
  }
  return null
}

// PCM 16-bit thô → WAV (để trình duyệt phát được)
function boc(pcm: Buffer) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(24000, 24)
  h.writeUInt32LE(48000, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

export async function docThanhGiong(chu: string, giong = 'Kore'): Promise<string> {
  const khoa = process.env.GEMINI_API_KEY?.trim()
  if (!khoa) throw new Error('Chưa cài GEMINI_API_KEY')
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': khoa },
    body: JSON.stringify({
      model: MODEL(),
      input: [{ type: 'user_input', content: [{ type: 'text', text: chu }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: giong }] },
    }),
    signal: AbortSignal.timeout(40_000),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Gemini TTS lỗi: ${json.error?.message ?? res.status}`)
  const b64 = timAmThanh(json)
  if (!b64) throw new Error('Gemini TTS không trả âm thanh')
  const du = Buffer.from(b64, 'base64')
  return (du.subarray(0, 4).toString() === 'RIFF' ? du : boc(du)).toString('base64')
}
