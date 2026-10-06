'use client'

import { useEffect, useState } from 'react'
import { GIONG } from '@/lib/giongDoc'
import { docBaiThanhGiong } from './actions'

// Video dọc 9:16 cho TikTok: ảnh của bài chạy lần lượt + giọng AI đọc nội dung + phụ đề.
// Dựng ngay trên trình duyệt (canvas + MediaRecorder), quay theo thời gian thực nên video dài bao nhiêu thì chờ bấy nhiêu.
const RONG = 720
const CAO = 1280
const CHUYEN = 0.5 // giây chuyển cảnh mờ dần giữa hai ảnh

const giaiMa = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

// Cắt chữ thành từng đoạn phụ đề ngắn (tối đa ~8 từ) theo câu / dòng
function tachPhuDe(chu: string) {
  const doan: string[] = []
  for (const cau of chu.split(/(?<=[.!?…])\s+|\n+/)) {
    const tu = cau.trim().split(/\s+/).filter(Boolean)
    const so = Math.ceil(tu.length / 8)
    for (let i = 0; i < so; i++) doan.push(tu.slice(Math.round((i * tu.length) / so), Math.round(((i + 1) * tu.length) / so)).join(' '))
  }
  return doan.filter(Boolean)
}

function taiAnh(u: string) {
  return new Promise<HTMLImageElement | null>((xong) => {
    const a = new Image()
    a.crossOrigin = 'anonymous'
    a.onload = () => xong(a)
    a.onerror = () => xong(null)
    a.src = u
  })
}

// Nền mờ phủ kín khung (vẽ sẵn một lần cho mỗi ảnh để khung hình nhẹ)
function nenMo(a: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = RONG
  c.height = CAO
  const g = c.getContext('2d')!
  const tl = Math.max(RONG / a.width, CAO / a.height) * 1.1
  g.filter = 'blur(28px) brightness(0.6)'
  g.drawImage(a, (RONG - a.width * tl) / 2, (CAO - a.height * tl) / 2, a.width * tl, a.height * tl)
  return c
}

function veAnh(g: CanvasRenderingContext2D, a: HTMLImageElement, nen: HTMLCanvasElement, tienDo: number) {
  g.drawImage(nen, 0, 0)
  const tl = Math.min(RONG / a.width, CAO / a.height) * (1 + 0.08 * tienDo)
  g.drawImage(a, (RONG - a.width * tl) / 2, (CAO - a.height * tl) / 2, a.width * tl, a.height * tl)
}

function veChu(g: CanvasRenderingContext2D, chu: string) {
  g.font = 'bold 44px system-ui, "Segoe UI", Roboto, sans-serif'
  const dong: string[] = []
  for (const tu of chu.split(' ')) {
    const thu = dong.length ? `${dong[dong.length - 1]} ${tu}` : tu
    if (dong.length && g.measureText(thu).width <= RONG - 100) dong[dong.length - 1] = thu
    else dong.push(tu)
  }
  const cao = 58
  const y0 = CAO * 0.74 - (dong.length * cao) / 2
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  dong.forEach((d, i) => {
    const y = y0 + i * cao + cao / 2
    g.lineWidth = 10
    g.strokeStyle = 'rgba(0,0,0,0.85)'
    g.strokeText(d, RONG / 2, y)
    g.fillStyle = '#fff'
    g.fillText(d, RONG / 2, y)
  })
}

const KIEU = ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']

export default function VideoTikTok({ noiDung, anh }: { noiDung: string; anh: string[] }) {
  const [giong, setGiong] = useState('Kore')
  const [buoc, setBuoc] = useState('')
  const [loi, setLoi] = useState('')
  const [video, setVideo] = useState<{ url: string; duoi: string } | null>(null)

  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video])

  async function tao() {
    setLoi('')
    setVideo(null)
    if (!noiDung.trim()) return setLoi('Viết nội dung bài trước đã')
    const kieu = KIEU.find((k) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(k))
    if (!kieu) return setLoi('Trình duyệt này không quay được video, hãy dùng Chrome hoặc Edge bản mới')
    let ac: AudioContext | null = null
    try {
      setBuoc('AI đang đọc bài…')
      const ac2 = (ac = new AudioContext())
      const [r, dsAnh] = await Promise.all([docBaiThanhGiong(noiDung, giong), Promise.all(anh.map(taiAnh))])
      if (!r.ok) throw new Error(r.thongBao)
      const amThanh = await ac2.decodeAudioData(giaiMa(r.amThanh))
      const tong = amThanh.duration
      const canh = dsAnh.filter((a): a is HTMLImageElement => !!a).map((a) => ({ a, nen: nenMo(a) }))

      // Mỗi đoạn phụ đề hiện trong khoảng thời gian tỉ lệ với số chữ (cộng chút cho chỗ ngắt)
      const doan = tachPhuDe(r.chu)
      const nang = doan.map((d) => d.length + 8)
      const tongNang = nang.reduce((x, y) => x + y, 0)
      let moc = 0
      const lich = doan.map((d, i) => ({ d, den: (moc += (nang[i] / tongNang) * tong) }))

      const c = document.createElement('canvas')
      c.width = RONG
      c.height = CAO
      const g = c.getContext('2d')!
      const ve = (t: number) => {
        if (!canh.length) {
          const nen = g.createLinearGradient(0, 0, RONG, CAO)
          nen.addColorStop(0, '#1d4ed8')
          nen.addColorStop(1, '#1e3a8a')
          g.fillStyle = nen
          g.fillRect(0, 0, RONG, CAO)
        } else {
          const dai = tong / canh.length
          const i = Math.min(canh.length - 1, Math.floor(t / dai))
          const trongCanh = t - i * dai
          if (i > 0 && trongCanh < CHUYEN) veAnh(g, canh[i - 1].a, canh[i - 1].nen, 1)
          g.globalAlpha = i > 0 ? Math.min(1, trongCanh / CHUYEN) : 1
          veAnh(g, canh[i].a, canh[i].nen, trongCanh / dai)
          g.globalAlpha = 1
        }
        const pd = lich.find((x) => t < x.den) ?? lich[lich.length - 1]
        if (pd) veChu(g, pd.d)
      }

      const dich = ac2.createMediaStreamDestination()
      const nguon = ac2.createBufferSource()
      nguon.buffer = amThanh
      nguon.connect(dich)
      nguon.connect(ac2.destination)
      ve(0)
      const rec = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dich.stream.getAudioTracks()]), {
        mimeType: kieu,
        videoBitsPerSecond: 4_000_000,
      })
      const manh: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && manh.push(e.data)
      const daXong = new Promise<void>((xong) => (rec.onstop = () => xong()))

      setBuoc(`Đang dựng video (${Math.ceil(tong)} giây) — giữ nguyên tab này, đừng chuyển tab…`)
      rec.start(1000)
      const batDau = ac2.currentTime
      nguon.start()
      let khung = 0
      const lap = () => {
        const t = ac2.currentTime - batDau
        ve(Math.min(t, tong))
        if (t < tong + 0.3) khung = requestAnimationFrame(lap)
        else rec.stop()
      }
      khung = requestAnimationFrame(lap)
      await daXong
      cancelAnimationFrame(khung)

      const duoi = kieu.startsWith('video/mp4') ? 'mp4' : 'webm'
      setVideo({ url: URL.createObjectURL(new Blob(manh, { type: kieu.split(';')[0] })), duoi })
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Tạo video lỗi')
    } finally {
      setBuoc('')
      ac?.close()
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-sm font-semibold">Video TikTok lồng tiếng AI</p>
      <p className="text-xs text-phu">
        Ảnh của bài thành video dọc, giọng AI đọc nội dung kèm phụ đề (bỏ qua link, hashtag, emoji). Tải video về rồi đăng lên TikTok. Mỗi lần tạo tốn 1 lượt giọng Gemini.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={giong} onChange={(e) => setGiong(e.target.value)} disabled={!!buoc} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
          {GIONG.filter(([ma]) => ma !== 'may').map(([ma, ten]) => (
            <option key={ma} value={ma}>
              {ma} — {ten}
            </option>
          ))}
        </select>
        <button type="button" onClick={tao} disabled={!!buoc} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {buoc ? 'Đang tạo…' : video ? 'Tạo lại' : 'Tạo video'}
        </button>
      </div>
      {buoc && <p className="animate-pulse text-sm text-chinh">{buoc}</p>}
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {video && (
        <div className="flex flex-wrap items-end gap-3">
          <video src={video.url} controls className="h-72 rounded-lg bg-black" />
          <a href={video.url} download={`video-tiktok.${video.duoi}`} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam">
            Tải video về
          </a>
        </div>
      )}
    </div>
  )
}
