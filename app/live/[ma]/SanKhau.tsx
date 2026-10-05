'use client'

import { useEffect, useRef, useState } from 'react'
import NhanVatAo from './NhanVatAo'

type SanPham = { ten: string; gia: number; anh: string; mo_ta: string }
type Luot = { loiNoi: string; sanPham: number; traLoiCho: string[]; amThanh: string; doanSo: number; canhBao?: string }
type BinhLuan = { id: number; ten: string; noi_dung: string }

const tien = (n: number) => `${n.toLocaleString('vi-VN')}đ`
const ngu = (ms: number) => new Promise((r) => setTimeout(r, ms))
const giaiMa = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

// Giọng tiếng Việt có sẵn trên máy (ưu tiên giọng tự nhiên HoaiMy / NamMinh nếu có)
async function chonGiongMay() {
  let ds = speechSynthesis.getVoices()
  if (!ds.length) {
    await new Promise((r) => {
      speechSynthesis.addEventListener('voiceschanged', r, { once: true })
      setTimeout(r, 1500)
    })
    ds = speechSynthesis.getVoices()
  }
  return ds.find((g) => /HoaiMy|NamMinh/i.test(g.name)) ?? ds.find((g) => g.lang.toLowerCase().startsWith('vi')) ?? null
}

// Giọng tiếng Việt của Windows đọc sai từ tiếng Anh: đổi sang phiên âm khi gửi đi đọc (phụ đề vẫn giữ chữ gốc)
const PHIEN_AM: [RegExp, string][] = [
  [/\biPhone\b/gi, 'Ai-phôn'],
  [/\bSamsung\b/gi, 'Sam-sung'],
  [/\bGalaxy\b/gi, 'Ga-la-xi'],
  [/\bUltra\b/gi, 'Un-tra'],
  [/\bPro\b/gi, 'Pờ-rô'],
  [/\bMax\b/gi, 'Mác'],
  [/\bPlus\b/gi, 'Pờ-lớt'],
  [/\bBuds\b/gi, 'Bớt'],
  [/\bTab\b/gi, 'Táp'],
  [/\bgigabyte\b/gi, 'gi-ga-bai'],
  [/\bGB\b/g, 'gi-ga-bai'],
  [/\bwatt\b/gi, 'oát'],
  [/\blive\b/gi, 'lai'],
  [/\bonline\b/gi, 'on-lai'],
  [/\bship\b/gi, 'síp'],
  [/\bfreeship\b/gi, 'phri-síp'],
  [/\bdeal\b/gi, 'đeo'],
  [/\bsale\b/gi, 'seo'],
  [/\bshop\b/gi, 'sốp'],
]
const phienAm = (chu: string) => PHIEN_AM.reduce((s, [mau, thay]) => s.replace(mau, thay), chu)

// Nhờ chương trình live-ai-may.mjs trên máy đọc thành giọng (WAV). Không chạy thì trả null.
async function giongTrenMay(chu: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch('http://127.0.0.1:5123/doc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chu: phienAm(chu) }),
      signal: AbortSignal.timeout(20_000),
    })
    return r.ok ? await r.arrayBuffer() : null
  } catch {
    return null
  }
}

// Đọc bằng giọng máy, từng câu một (Chrome hay tự dừng khi đọc câu quá dài)
async function docBangMay(chu: string, giong: SpeechSynthesisVoice | null, dung: () => boolean) {
  const cau = chu.split(/(?<=[.!?…])\s+/).filter((x) => x.trim())
  for (const c of cau) {
    if (dung()) return
    await new Promise<void>((xong) => {
      const u = new SpeechSynthesisUtterance(c)
      if (giong) u.voice = giong
      u.lang = giong?.lang ?? 'vi-VN'
      u.rate = 1.05
      let roi = false
      const het = () => !roi && ((roi = true), xong())
      u.onend = het
      u.onerror = het
      // Dự phòng khi trình duyệt không báo đọc xong
      setTimeout(het, c.length * 110 + 2500)
      speechSynthesis.speak(u)
    })
  }
}

// Sân khấu 9:16 (OBS: Browser source 1080 × 1920). Mọi kích thước theo cqh để co giãn đúng tỉ lệ.
export default function SanKhau({ ma, ten, sanPham }: { ma: string; ten: string; sanPham: SanPham[] }) {
  const goc = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const [canBam, setCanBam] = useState(false)
  const [cau, setCau] = useState('')
  const [sp, setSp] = useState(sanPham.length ? 1 : 0)
  const [dangTraLoi, setDangTraLoi] = useState<string[]>([])
  const [binhLuan, setBinhLuan] = useState<BinhLuan[]>([])
  const [loi, setLoi] = useState('')

  // Vòng nói của MC ảo
  useEffect(() => {
    let dung = false
    const ctx = new AudioContext()
    ctxRef.current = ctx
    const phanTich = ctx.createAnalyser()
    phanTich.fftSize = 512
    phanTich.connect(ctx.destination)
    const mau = new Uint8Array(phanTich.fftSize)
    let raf = 0
    let docMay = false // đang đọc bằng giọng máy: không đo được âm lượng, nhép miệng giả lập
    const ve = () => {
      let m: number
      if (docMay) {
        const t = performance.now() / 1000
        m = Math.max(0, 0.15 + 0.45 * Math.abs(Math.sin(t * 9)) * (0.6 + 0.4 * Math.sin(t * 2.3)))
      } else {
        phanTich.getByteTimeDomainData(mau)
        let tong = 0
        for (const v of mau) tong += ((v - 128) / 128) ** 2
        m = Math.min(1, Math.sqrt(tong / mau.length) * 7)
      }
      goc.current?.style.setProperty('--m', m.toFixed(2))
      raf = requestAnimationFrame(ve)
    }
    ve()

    const daNoi: string[] = []
    let spTruoc = 0
    let dauTien = true
    let doanTruoc = 0
    const giongMay = chonGiongMay()
    // Trả null khi sân khấu đã dừng
    const xin = async (): Promise<Luot | null> => {
      for (;;) {
        if (dung) return null
        try {
          const r = await fetch(`/api/live/${ma}/luot`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ spTruoc, daNoi: daNoi.slice(-3), dauTien, doanTruoc }),
          })
          const j = await r.json()
          if (!r.ok) throw new Error(j.loi ?? `Lỗi ${r.status}`)
          return j as Luot
        } catch (e) {
          if (dung) return null
          setLoi(e instanceof Error ? e.message : 'Lỗi kết nối')
          await ngu(4000)
        }
      }
    }

    ;(async () => {
      // Trình duyệt chặn tự phát âm thanh: cần bấm một lần (OBS thì tự chạy)
      ctx.onstatechange = () => setCanBam(ctx.state === 'suspended')
      ctx.resume().catch(() => {})
      setTimeout(() => !dung && setCanBam(ctx.state === 'suspended'), 1500)
      let tiep = xin()
      while (!dung) {
        const luot = await tiep
        if (!luot || dung) break
        dauTien = false
        if (luot.sanPham) spTruoc = luot.sanPham
        if (luot.doanSo) doanTruoc = luot.doanSo
        if (luot.canhBao) console.warn('Giọng Gemini lỗi, dùng giọng máy:', luot.canhBao)
        daNoi.push(luot.loiNoi)
        setLoi('')
        setCau(luot.loiNoi)
        setDangTraLoi(luot.traLoiCho)
        if (luot.sanPham) setSp(luot.sanPham)
        // Không có âm thanh từ máy chủ (chọn giọng máy, hoặc giọng Gemini hết lượt): máy tự đọc
        // Âm thanh: từ máy chủ (giọng Gemini), hoặc nhờ chương trình trên máy đọc (giọng Windows, dùng được trong OBS)
        const duLieu = luot.amThanh ? giaiMa(luot.amThanh) : await giongTrenMay(luot.loiNoi)
        if (!duLieu) {
          // Không có chương trình trên máy: trình duyệt tự đọc (Chrome / Edge; OBS không đọc được kiểu này)
          let daXin = false
          const hen = setTimeout(() => {
            daXin = true
            tiep = xin()
          }, Math.max(0, (luot.loiNoi.length / 14 - 7) * 1000))
          docMay = true
          await docBangMay(luot.loiNoi, await giongMay, () => dung)
          docMay = false
          clearTimeout(hen)
          if (!daXin) tiep = xin()
          await ngu(500)
          continue
        }
        try {
          const buf = await ctx.decodeAudioData(duLieu)
          const nguon = ctx.createBufferSource()
          nguon.buffer = buf
          nguon.connect(phanTich)
          // Xin trước lượt sau khi câu này còn ~7 giây, để không có khoảng lặng
          let daXin = false
          const hen = setTimeout(() => {
            daXin = true
            tiep = xin()
          }, Math.max(0, (buf.duration - 7) * 1000))
          await new Promise<void>((xong) => {
            nguon.onended = () => xong()
            nguon.start()
          })
          clearTimeout(hen)
          if (!daXin) tiep = xin()
        } catch {
          tiep = xin()
        }
        await ngu(500)
      }
    })()

    return () => {
      dung = true
      speechSynthesis.cancel()
      cancelAnimationFrame(raf)
      ctx.close().catch(() => {})
    }
  }, [ma])

  // Bình luận mới hiện trên màn hình
  useEffect(() => {
    let dung = false
    const lay = async () => {
      try {
        const r = await fetch(`/api/live/${ma}/binh-luan`, { cache: 'no-store' })
        if (r.ok && !dung) setBinhLuan((await r.json()).ds ?? [])
      } catch {}
    }
    lay()
    const t = setInterval(lay, 3000)
    return () => {
      dung = true
      clearInterval(t)
    }
  }, [ma])

  const dangBan = sp ? sanPham[sp - 1] : undefined

  return (
    <div className="grid h-dvh place-items-center bg-black">
      <div
        ref={goc}
        className="relative h-dvh overflow-hidden bg-gradient-to-b from-[#1e3a8a] via-[#4338ca] to-[#7c3aed] text-white"
        style={{ aspectRatio: '9 / 16', containerType: 'size' }}
      >
        {/* Nền trang trí */}
        <div className="absolute -left-[20cqh] top-[30cqh] h-[50cqh] w-[50cqh] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-[15cqh] top-[5cqh] h-[40cqh] w-[40cqh] rounded-full bg-fuchsia-400/20 blur-3xl" />

        {/* Đầu trang */}
        <div className="absolute inset-x-[2.5cqh] top-[2.5cqh] flex items-center gap-[1.2cqh]">
          <span className="grid h-[5cqh] w-[5cqh] place-items-center rounded-full bg-white text-[2.4cqh] font-extrabold text-indigo-700">
            {(ten || 'S').trim().charAt(0).toUpperCase()}
          </span>
          <span className="text-[2.4cqh] font-bold drop-shadow">{ten}</span>
          <span className="ml-auto flex items-center gap-[0.6cqh] rounded-full bg-red-600 px-[1.4cqh] py-[0.5cqh] text-[1.8cqh] font-bold">
            <span className="h-[1cqh] w-[1cqh] animate-pulse rounded-full bg-white" /> LIVE
          </span>
        </div>

        {/* MC ảo */}
        <div className="absolute left-1/2 top-[9cqh] h-[50cqh] w-[42cqh] -translate-x-1/2">
          <NhanVatAo />
        </div>

        {/* Bình luận gần đây */}
        <div className="absolute right-[2cqh] top-[12cqh] flex w-[22cqh] flex-col gap-[0.8cqh]">
          {binhLuan.map((b) => (
            <div
              key={b.id}
              className={`rounded-[1.4cqh] px-[1.2cqh] py-[0.8cqh] text-[1.5cqh] leading-snug backdrop-blur ${
                dangTraLoi.includes(b.ten) ? 'bg-amber-400/90 text-black' : 'bg-black/30'
              }`}
            >
              <b>{b.ten}</b> <span className="opacity-90">{b.noi_dung}</span>
            </div>
          ))}
        </div>

        {/* Sản phẩm đang giới thiệu */}
        {dangBan && (
          <div className="absolute inset-x-[2.5cqh] top-[58cqh] flex items-center gap-[1.6cqh] rounded-[2.4cqh] bg-white p-[1.4cqh] text-gray-900 shadow-2xl">
            {dangBan.anh ? (
              <img src={dangBan.anh} alt="" className="h-[12cqh] w-[12cqh] shrink-0 rounded-[1.6cqh] object-cover" />
            ) : (
              <span className="grid h-[12cqh] w-[12cqh] shrink-0 place-items-center rounded-[1.6cqh] bg-indigo-100 text-[5cqh]">🛍️</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[1.6cqh] font-semibold uppercase tracking-wide text-indigo-600">
                Sản phẩm {sp}/{sanPham.length}
              </p>
              <p className="line-clamp-2 text-[2.6cqh] font-bold leading-tight">{dangBan.ten}</p>
              {dangBan.gia > 0 && <p className="mt-[0.4cqh] text-[3.4cqh] font-extrabold text-red-600">{tien(dangBan.gia)}</p>}
            </div>
          </div>
        )}

        {/* Phụ đề lời MC */}
        {cau && (
          <div className="absolute inset-x-[2.5cqh] top-[74cqh] rounded-[2cqh] bg-black/45 px-[2cqh] py-[1.6cqh] text-[2.3cqh] font-medium leading-snug backdrop-blur">
            {cau}
          </div>
        )}

        {loi && <p className="absolute inset-x-[2.5cqh] bottom-[2cqh] rounded-[1cqh] bg-red-600/90 px-[1.2cqh] py-[0.6cqh] text-[1.5cqh]">Đang kết nối lại… ({loi})</p>}

        {canBam && (
          <button
            onClick={() => ctxRef.current?.resume().then(() => setCanBam(false))}
            className="absolute inset-0 grid place-items-center bg-black/60 text-[3cqh] font-bold"
          >
            ▶ Bấm để bắt đầu (OBS sẽ tự chạy)
          </button>
        )}
      </div>
    </div>
  )
}
