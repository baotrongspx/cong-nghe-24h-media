'use client'

import { useEffect, useRef, useState } from 'react'
import NhanVatAo from './NhanVatAo'

type SanPham = { ten: string; gia: number; anh: string; mo_ta: string }
type Luot = { loiNoi: string; sanPham: number; traLoiCho: string[]; amThanh: string; doanSo: number; canhBao?: string }
type BinhLuan = { id: number; ten: string; noi_dung: string }

const tien = (n: number) => `${n.toLocaleString('vi-VN')}đ`
const ngu = (ms: number) => new Promise((r) => setTimeout(r, ms))
const giaiMa = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

// Tách lời thành từng câu (phụ đề hiện câu đang nói)
const tachCau = (chu: string) => chu.split(/(?<=[.!?…])\s+/).filter((x) => x.trim())

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
async function docBangMay(chu: string, giong: SpeechSynthesisVoice | null, dung: () => boolean, khiDocCau: (c: string) => void) {
  for (const c of tachCau(chu)) {
    if (dung()) return
    khiDocCau(c)
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
    let lanCuoiCoTieng = 0
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
      // Có tiếng trong 0,6 giây gần nhất: đang nói (tay MC làm cử chỉ)
      if (m > 0.08) lanCuoiCoTieng = performance.now()
      goc.current?.classList.toggle('dang-noi', performance.now() - lanCuoiCoTieng < 600)
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
        setCau(tachCau(luot.loiNoi)[0] ?? luot.loiNoi)
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
          await docBangMay(luot.loiNoi, await giongMay, () => dung, setCau)
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
          // Phụ đề: đổi câu theo tiến độ phát (ước lượng theo độ dài từng câu)
          const cauList = tachCau(luot.loiNoi)
          const tongChu = cauList.reduce((t, c) => t + c.length, 0) || 1
          const batDau = ctx.currentTime
          const theoDoi = setInterval(() => {
            const daQua = ((ctx.currentTime - batDau) / buf.duration) * tongChu
            let cong = 0
            const c = cauList.find((x) => (cong += x.length) >= daQua) ?? cauList.at(-1)
            if (c) setCau(c)
          }, 200)
          await new Promise<void>((xong) => {
            nguon.onended = () => xong()
            nguon.start()
          })
          clearInterval(theoDoi)
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
  // Bình luận của khách đang được trả lời (hiện trong bong bóng cạnh MC)
  const dangDoc = binhLuan.filter((b) => dangTraLoi.includes(b.ten)).slice(-2)
  const chayChu = sanPham.filter((x) => x.ten.trim()).map((x) => `${x.ten}${x.gia ? ` — ${tien(x.gia)}` : ''}`)

  // Bố cục 9:16 tránh vùng TikTok tự phủ giao diện: thanh trên cùng (~10%), cột nút bên phải, khung bình luận dưới cùng (~22%)
  return (
    <div className="grid h-dvh place-items-center bg-black">
      <div
        ref={goc}
        className="relative h-dvh overflow-hidden bg-[linear-gradient(180deg,#0b1026_0%,#1b1550_45%,#2a1660_70%,#0b1026_100%)] text-white"
        style={{ aspectRatio: '9 / 16', containerType: 'size' }}
      >
        {/* Phông studio: đèn rọi + ánh đèn mờ */}
        <div className="absolute left-1/2 top-[8cqh] h-[58cqh] w-[58cqh] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(129,140,248,0.55),rgba(129,140,248,0.12)_60%,transparent)]" />
        <div className="absolute left-[4cqh] top-[18cqh] h-[9cqh] w-[9cqh] rounded-full bg-fuchsia-400/30 blur-2xl" />
        <div className="absolute right-[3cqh] top-[30cqh] h-[11cqh] w-[11cqh] rounded-full bg-sky-400/25 blur-2xl" />
        <div className="absolute left-[10cqh] top-[40cqh] h-[6cqh] w-[6cqh] rounded-full bg-amber-300/25 blur-xl" />
        <div className="sk-den absolute inset-x-0 top-0 h-[60cqh] bg-[repeating-linear-gradient(100deg,transparent_0_6cqh,rgba(255,255,255,0.035)_6cqh_7cqh)]" />

        {/* Dải chữ chạy: sản phẩm và giá */}
        {chayChu.length > 0 && (
          <div className="absolute inset-x-0 top-[10.5cqh] flex h-[3.6cqh] items-center overflow-hidden bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 shadow-lg">
            <span className="z-10 flex h-full shrink-0 items-center bg-amber-400 px-[1.4cqh] text-[1.6cqh] font-extrabold uppercase text-rose-700">Giá live</span>
            <div className="sk-chay flex shrink-0 gap-[4cqh] whitespace-nowrap pl-[4cqh] text-[1.7cqh] font-semibold">
              {[...chayChu, ...chayChu].map((x, i) => (
                <span key={i}>★ {x}</span>
              ))}
            </div>
          </div>
        )}

        {/* MC ảo đứng sau quầy */}
        <div className="absolute left-1/2 top-[14.5cqh] h-[42cqh] w-[28cqh] -translate-x-1/2">
          <NhanVatAo />
        </div>

        {/* Quầy có tên shop */}
        <div className="absolute inset-x-[3cqh] top-[49cqh] h-[7.5cqh] rounded-t-[2cqh] bg-gradient-to-b from-[#312e81] to-[#1e1b4b] shadow-[0_-1cqh_3cqh_rgba(0,0,0,0.4)] ring-1 ring-white/10">
          <div className="absolute inset-x-0 top-0 h-[0.5cqh] rounded-t-[2cqh] bg-gradient-to-r from-fuchsia-400 via-sky-300 to-fuchsia-400" />
          <p className="mt-[1.6cqh] text-center text-[2.6cqh] font-black uppercase tracking-[0.3cqh] text-white [text-shadow:0_0_1.5cqh_rgba(167,139,250,0.9)]">{ten}</p>
        </div>

        {/* Bong bóng: bình luận đang được trả lời */}
        {dangDoc.length > 0 && (
          <div className="sk-hien absolute left-[2.5cqh] top-[16cqh] flex max-w-[20cqh] flex-col gap-[0.8cqh]">
            {dangDoc.map((b) => (
              <div key={b.id} className="rounded-[1.6cqh] rounded-bl-none bg-white px-[1.3cqh] py-[0.9cqh] text-[1.5cqh] leading-snug text-slate-900 shadow-xl">
                <b className="text-fuchsia-600">{b.ten}</b>
                <p className="line-clamp-3">{b.noi_dung}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sản phẩm đang giới thiệu: trượt vào mỗi khi đổi */}
        {dangBan && (
          <div key={sp} className="sk-truot absolute inset-x-[3cqh] top-[56.5cqh] rounded-[2.4cqh] bg-white p-[1.2cqh] text-slate-900 shadow-[0_1.5cqh_4cqh_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-[1.6cqh]">
              {dangBan.anh ? (
                <img src={dangBan.anh} alt="" className="h-[10cqh] w-[10cqh] shrink-0 rounded-[1.6cqh] object-cover" />
              ) : (
                <span className="grid h-[10cqh] w-[10cqh] shrink-0 place-items-center rounded-[1.6cqh] bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-[4.5cqh]">📱</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[1cqh]">
                  <p className="text-[1.45cqh] font-bold uppercase tracking-wider text-fuchsia-600">
                    Đang giới thiệu · {sp}/{sanPham.length}
                  </p>
                  {sanPham.length > 1 && (
                    <div className="flex gap-[0.5cqh]">
                      {sanPham.map((_, i) => (
                        <span key={i} className={`h-[0.6cqh] rounded-full ${i + 1 === sp ? 'w-[2.2cqh] bg-fuchsia-600' : 'w-[0.6cqh] bg-slate-300'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-[2.35cqh] font-extrabold leading-tight">{dangBan.ten}</p>
                {dangBan.gia > 0 && (
                  <p className="sk-gia mt-[0.6cqh] inline-block rounded-[1cqh] bg-gradient-to-r from-rose-600 to-orange-500 px-[1.2cqh] py-[0.3cqh] text-[2.7cqh] font-black text-white">
                    {tien(dangBan.gia)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phụ đề: câu MC đang nói */}
        {cau && (
          <p
            key={cau}
            className="sk-hien absolute inset-x-[3cqh] top-[72.5cqh] rounded-[1.6cqh] bg-black/55 px-[1.8cqh] py-[1.2cqh] text-center text-[2.15cqh] font-semibold leading-snug [text-shadow:0_0.2cqh_0.6cqh_rgba(0,0,0,0.6)]"
          >
            {cau}
          </p>
        )}

        {loi && <p className="absolute inset-x-[3cqh] top-[81cqh] rounded-[1cqh] bg-red-600/90 px-[1.2cqh] py-[0.6cqh] text-[1.4cqh]">Đang kết nối lại… ({loi})</p>}

        {canBam && (
          <button
            onClick={() => ctxRef.current?.resume().then(() => setCanBam(false))}
            className="absolute inset-0 grid place-items-center bg-black/60 text-[3cqh] font-bold"
          >
            ▶ Bấm để bắt đầu (OBS sẽ tự chạy)
          </button>
        )}

        <style>{`
          .sk-chay { animation: sk-chay 28s linear infinite; }
          @keyframes sk-chay { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .sk-truot { animation: sk-truot 600ms cubic-bezier(.2,1.2,.4,1); }
          @keyframes sk-truot { from { opacity: 0; transform: translateY(4cqh) scale(0.96); } to { opacity: 1; transform: none; } }
          .sk-hien { animation: sk-hien 350ms ease-out; }
          @keyframes sk-hien { from { opacity: 0; transform: translateY(1cqh); } to { opacity: 1; transform: none; } }
          .sk-gia { animation: sk-gia 2.2s ease-in-out infinite; }
          @keyframes sk-gia { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
          .sk-den { animation: sk-den 12s ease-in-out infinite alternate; }
          @keyframes sk-den { from { transform: translateX(-3cqh); } to { transform: translateX(3cqh); } }
        `}</style>
      </div>
    </div>
  )
}
