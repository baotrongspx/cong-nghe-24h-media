'use client'

import { useEffect, useState } from 'react'
import { KIEU, giaiMa, tachPhuDe, veChu } from '@/lib/dungVideo'
import { GIONG } from '@/lib/giongDoc'
import { docDoanPhim, vietBangCanh } from './actions'

// Xưởng phim hoạt hình kể chuyện: bảng cảnh (lời đọc + mô tả hình) → chép câu lệnh vẽ ảnh → tải ảnh lên → dựng video 16:9.
// Chữ lưu trong trình duyệt (localStorage), ảnh lưu trong IndexedDB: tắt trang mở lại vẫn còn, nhưng chỉ trên máy này.
type NhanVat = { ten: string; moTa: string }
type Canh = { id: string; loi: string; hinh: string }
type Phim = { ten: string; yChinh: string; phongCach: string; nhanVat: NhanVat[]; canh: Canh[] }

const K = { rong: 1280, cao: 720, coChu: 40, viTriChu: 0.86 }
const CHUYEN = 0.25 // giây chuyển mờ giữa hai cảnh
const TOI_DA_DOAN = 1100 // số ký tự tối đa cho một lượt giọng đọc
const KHOA_LUU = 'lam-phim-v1'

const ma = () => crypto.randomUUID()

const MAU: Phim = {
  ten: 'Quỹ đen trong mũ bảo hiểm',
  yChinh: '',
  phongCach:
    'Hoạt hình 2D chibi, đầu to thân nhỏ, nét viền đen dày đều, màu phẳng tươi không đổ bóng, mắt tròn to tròng trắng con ngươi đen nhỏ, biểu cảm phóng đại, nền đơn giản ít chi tiết.',
  nhanVat: [
    { ten: 'Tí', moTa: 'nam 30 tuổi, hơi mũm mĩm, tóc đen ngắn rẽ ngôi lệch, áo thun cam, quần đùi xanh đậm, dép tổ ong vàng' },
    { ten: 'Chị Na', moTa: 'nữ 28 tuổi, tóc nâu buộc đuôi ngựa cao, áo sơ mi xanh ngọc, quần dài trắng' },
    { ten: 'Ông Bảy', moTa: 'nam 60 tuổi, đầu hói hai bên còn tóc bạc, ria mép bạc, áo ba lỗ trắng, quần pijama sọc xanh' },
    { ten: 'Cu Bin', moTa: 'nam 30 tuổi, gầy cao, tóc xoăn xù, đeo kính tròn, áo khoác có mũ màu tím, quần jean' },
  ],
  canh: [
    ['Đàn ông có vợ, ai cũng có một kho báu. Của tôi là hai triệu rưỡi, giấu trong lớp lót cái mũ bảo hiểm cũ.', 'Phòng ngủ ban đêm, Tí rón rén nhét xấp tiền vào trong một cái mũ bảo hiểm cũ, mắt liếc ra cửa.'],
    ['Chỗ đó an toàn tuyệt đối. Vì cái mũ hôi tới mức vợ tôi không bao giờ đụng vào.', 'Trung cảnh: Tí ôm cái mũ bảo hiểm cũ, cười mãn nguyện, quanh mũ có vài làn khói xanh bốc mùi.'],
    ['Hôm đó đi làm về, tôi thấy kệ giày trống trơn. Tôi hỏi: Em ơi, cái mũ cũ của anh đâu rồi?', 'Tí đứng trước một kệ giày trống ở cửa nhà, mặt ngơ ngác, tay gãi đầu.'],
    ['Vợ tôi cười rất tươi: À, em dọn nhà, cho ông Bảy rồi. Ổng xin về úp chậu lan.', 'Phòng khách gọn gàng, Chị Na chống nạnh cười tươi, một tay cầm chổi.'],
    ['Lúc đó, tôi nghe rõ tiếng hai triệu rưỡi gọi tên mình.', 'Cận mặt Tí hóa đá màu xám, có vết nứt chạy ngang mặt, nền tối.'],
    ['Tôi phi sang nhà ông Bảy, nhanh hơn cả lúc chạy đi chấm công.', 'Toàn cảnh con hẻm nhỏ, Tí chạy hết tốc lực, một chiếc dép tổ ong vàng văng lên trời, bụi bay phía sau.'],
    ['Tôi thở hổn hển: Chú Bảy, cho con xin lại cái mũ, kỷ niệm thời sinh viên! Ổng nhìn tôi rồi gật: Kỷ niệm hả? Cầm đi con.', 'Sân nhà có nhiều chậu cây, cái mũ bảo hiểm cũ úp trên một chậu lan, Ông Bảy cầm bình tưới, Tí chắp tay xin.'],
    ['Tôi lật lớp lót ra. Trống trơn. Chỉ còn đúng một tờ giấy gấp tư.', 'Cận hai bàn tay lật bên trong cái mũ bảo hiểm cũ, rơi ra một tờ giấy trắng gấp tư.'],
    ['Trên giấy ghi: Tiền chú gửi lại vợ con rồi. Chú cũng từng có vợ.', 'Ông Bảy đứng sau hàng rào, nháy một mắt, giơ ngón tay cái.'],
    ['Về tới nhà, vợ tôi ôm chầm lấy tôi: Anh chu đáo ghê, còn nhờ chú Bảy đưa quà bất ngờ cho em.', 'Chị Na ngồi trên ghế sofa đếm tiền, mắt lấp lánh, bên cạnh có mấy túi đồ mới mua.'],
    ['Tôi cười: Ừ, bất ngờ thật. Bài học rút ra: đừng giấu tiền trong mũ. Lần sau tôi giấu ở… thôi, không nói được.', 'Cận mặt Tí cười méo xệch, hai hàng nước mắt chảy dài, tay giơ ngón cái run run.'],
  ].map(([loi, hinh], i) => ({ id: `mau-${i + 1}`, loi, hinh })),
}

// Giọng đã đọc rồi thì giữ lại (tới khi tải lại trang): dựng lại vì đổi ảnh, bật tắt phụ đề không tốn thêm lượt
const giongDaDoc = new Map<string, string>()

// ---- Kho ảnh trong trình duyệt (IndexedDB) ----
function moKho() {
  return new Promise<IDBDatabase>((ok, loi) => {
    const r = indexedDB.open('lam-phim', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('anh')
    r.onsuccess = () => ok(r.result)
    r.onerror = () => loi(r.error)
  })
}
async function khoAnh<T>(cheDo: IDBTransactionMode, lam: (k: IDBObjectStore) => IDBRequest<T>) {
  const kho = await moKho()
  try {
    return await new Promise<T>((ok, loi) => {
      const rq = lam(kho.transaction('anh', cheDo).objectStore('anh'))
      rq.onsuccess = () => ok(rq.result)
      rq.onerror = () => loi(rq.error)
    })
  } finally {
    kho.close()
  }
}

function taiAnh(u: string) {
  return new Promise<HTMLImageElement | null>((xong) => {
    const a = new Image()
    a.onload = () => xong(a)
    a.onerror = () => xong(null)
    a.src = u
  })
}

// ---- Câu lệnh dán vào Gemini ----
const coTen = (chu: string, ten: string) => new RegExp(`(?<![\\p{L}\\p{N}])${ten.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(chu)

function cauLenhCanh(p: Phim, c: Canh) {
  const co = p.nhanVat.filter((n) => n.ten.trim() && coTen(c.hinh, n.ten))
  return [
    p.phongCach.trim(),
    co.length ? `Nhân vật trong cảnh (vẽ giống hệt ảnh mẫu tôi đính kèm):\n${co.map((n) => `- ${n.ten.trim()}: ${n.moTa.trim()}`).join('\n')}` : '',
    `Cảnh cần vẽ: ${c.hinh.trim()}`,
    'Ảnh ngang tỉ lệ 16:9. Không có chữ, không có logo trong ảnh.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function cauLenhMau(p: Phim, n: NhanVat) {
  return [
    p.phongCach.trim(),
    'Vẽ tờ mẫu nhân vật trên nền trắng trơn: cùng một nhân vật đứng nhìn thẳng, nhìn nghiêng, nhìn sau lưng, và 4 khuôn mặt: vui, giận, khóc, ngạc nhiên.',
    `Nhân vật: ${n.ten.trim()} — ${n.moTa.trim()}`,
    'Không có chữ trong ảnh.',
  ].join('\n\n')
}

// ---- Vẽ một khung hình ----
function veCanh(g: CanvasRenderingContext2D, a: HTMLImageElement | null, so: number, tienDo: number) {
  g.fillStyle = '#0f172a'
  g.fillRect(0, 0, K.rong, K.cao)
  if (!a) {
    g.fillStyle = '#64748b'
    g.font = 'bold 44px system-ui, "Segoe UI", sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(`Cảnh ${so + 1} (chưa có ảnh)`, K.rong / 2, K.cao * 0.42)
    return
  }
  // Ảnh gần đúng 16:9 thì phủ kín khung; lệch nhiều (ảnh vuông, ảnh dọc) thì thu vừa khung để không cắt mất nhân vật
  const lech = a.width / a.height / (K.rong / K.cao)
  const vua = lech > 0.85 && lech < 1.18 ? Math.max(K.rong / a.width, K.cao / a.height) : Math.min(K.rong / a.width, K.cao / a.height)
  // Phóng nhẹ: cảnh chẵn tiến vào, cảnh lẻ lùi ra
  const tl = vua * (1 + 0.06 * (so % 2 ? 1 - tienDo : tienDo))
  g.drawImage(a, (K.rong - a.width * tl) / 2, (K.cao - a.height * tl) / 2, a.width * tl, a.height * tl)
}

function NutChep({ chu, nhan = 'Chép' }: { chu: string; nhan?: string }) {
  const [da, setDa] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(chu).then(() => {
          setDa(true)
          setTimeout(() => setDa(false), 1500)
        })
      }
      className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:border-chinh hover:text-chinh"
    >
      {da ? 'Đã chép ✓' : nhan}
    </button>
  )
}

const O = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'
const KHUNG = 'mt-6 rounded-xl border border-slate-200 bg-white p-4'

export default function XuongPhim({ coAi }: { coAi: boolean }) {
  const [phim, setPhim] = useState<Phim>(MAU)
  const [anh, setAnh] = useState<Record<string, string>>({})
  const [san, setSan] = useState(false)
  const [soCanh, setSoCanh] = useState(10)
  const [dangViet, setDangViet] = useState(false)
  const [loiViet, setLoiViet] = useState('')
  const [giong, setGiong] = useState('Puck')
  const [phuDe, setPhuDe] = useState(true)
  const [buoc, setBuoc] = useState('')
  const [loi, setLoi] = useState('')
  const [video, setVideo] = useState<{ url: string; duoi: string } | null>(null)

  // Mở trang: lấy lại bài đang làm dở và ảnh đã tải lên
  useEffect(() => {
    let con = true
    ;(async () => {
      let luu: Phim | null = null
      try {
        luu = JSON.parse(localStorage.getItem(KHOA_LUU) ?? 'null')
      } catch {}
      const p = luu?.canh?.length ? luu : MAU
      const url: Record<string, string> = {}
      await Promise.all(
        p.canh.map(async (c) => {
          const tep = await khoAnh<Blob | undefined>('readonly', (k) => k.get(c.id)).catch(() => undefined)
          if (tep) url[c.id] = URL.createObjectURL(tep)
        }),
      )
      if (!con) return
      setPhim(p)
      setAnh(url)
      setSan(true)
    })()
    return () => {
      con = false
    }
  }, [])

  useEffect(() => {
    if (san) localStorage.setItem(KHOA_LUU, JSON.stringify(phim))
  }, [phim, san])

  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video])

  const sua = (p: Partial<Phim>) => setPhim((x) => ({ ...x, ...p }))
  const suaCanh = (id: string, p: Partial<Canh>) => setPhim((x) => ({ ...x, canh: x.canh.map((c) => (c.id === id ? { ...c, ...p } : c)) }))
  const suaNhanVat = (i: number, p: Partial<NhanVat>) => setPhim((x) => ({ ...x, nhanVat: x.nhanVat.map((n, j) => (j === i ? { ...n, ...p } : n)) }))

  function boAnh(ids: string[]) {
    for (const id of ids) {
      if (anh[id]) URL.revokeObjectURL(anh[id])
      khoAnh('readwrite', (k) => k.delete(id)).catch(() => {})
    }
    setAnh((x) => Object.fromEntries(Object.entries(x).filter(([id]) => !ids.includes(id))))
  }

  async function chonAnh(id: string, tep: File | undefined) {
    if (!tep) return
    if (!tep.type.startsWith('image/')) return setLoi('Chỉ nhận tệp ảnh')
    await khoAnh('readwrite', (k) => k.put(tep, id)).catch(() => {})
    setAnh((x) => {
      if (x[id]) URL.revokeObjectURL(x[id])
      return { ...x, [id]: URL.createObjectURL(tep) }
    })
  }

  function xoaCanh(id: string) {
    boAnh([id])
    setPhim((x) => ({ ...x, canh: x.canh.filter((c) => c.id !== id) }))
  }

  function doiCho(i: number, buocNhay: number) {
    setPhim((x) => {
      const ds = [...x.canh]
      const j = i + buocNhay
      if (j < 0 || j >= ds.length) return x
      ;[ds[i], ds[j]] = [ds[j], ds[i]]
      return { ...x, canh: ds }
    })
  }

  async function aiViet() {
    setLoiViet('')
    if (phim.canh.some((c) => c.loi.trim()) && !confirm('AI sẽ viết bảng cảnh mới thay cho bảng cảnh đang có (ảnh đã tải lên cũng bị bỏ). Tiếp tục?')) return
    setDangViet(true)
    try {
      const r = await vietBangCanh(phim.yChinh, soCanh, phim.nhanVat)
      if (!r.ok) return setLoiViet(r.thongBao)
      boAnh(phim.canh.map((c) => c.id))
      setVideo(null)
      setPhim((x) => ({ ...x, ten: r.ten || x.ten, canh: r.canh.map((c) => ({ id: ma(), ...c })) }))
    } catch {
      setLoiViet('Không gọi được AI, hãy thử lại')
    } finally {
      setDangViet(false)
    }
  }

  function mauMoi() {
    if (!confirm('Xóa bảng cảnh và ảnh đang có để làm mẩu chuyện mới? (Nhân vật và phong cách được giữ lại)')) return
    boAnh(phim.canh.map((c) => c.id))
    setVideo(null)
    setPhim((x) => ({ ...x, ten: '', yChinh: '', canh: [{ id: ma(), loi: '', hinh: '' }] }))
  }

  const coLoi = phim.canh.filter((c) => c.loi.trim())
  const sach = (s: string) => s.trim().replace(/\s+/g, ' ')
  // Gom các cảnh liền nhau thành từng đoạn, mỗi đoạn một lượt giọng đọc
  const nhom: Canh[][] = []
  for (const c of coLoi) {
    const cuoi = nhom.at(-1)
    if (cuoi && cuoi.reduce((s, x) => s + sach(x.loi).length + 1, 0) + sach(c.loi).length <= TOI_DA_DOAN) cuoi.push(c)
    else nhom.push([c])
  }
  const tongChu = coLoi.reduce((s, c) => s + sach(c.loi).length, 0)
  const uocGiay = Math.round(tongChu / 14)
  const soAnh = coLoi.filter((c) => anh[c.id]).length
  const luotMoi = nhom.filter((n) => !giongDaDoc.has(`${giong}|${n.map((c) => sach(c.loi)).join('\n')}`)).length

  async function dung() {
    setLoi('')
    setVideo(null)
    if (!coLoi.length) return setLoi('Bảng cảnh chưa có lời đọc nào')
    const qua = coLoi.findIndex((c) => sach(c.loi).length > TOI_DA_DOAN)
    if (qua >= 0) return setLoi(`Lời đọc của cảnh ${phim.canh.indexOf(coLoi[qua]) + 1} quá dài, hãy tách thành hai cảnh`)
    const kieu = KIEU.find((k) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(k))
    if (!kieu) return setLoi('Trình duyệt này không quay được video, hãy dùng Chrome hoặc Edge bản mới')
    const ac = new AudioContext()
    try {
      // 1) Giọng đọc từng đoạn
      const am: AudioBuffer[] = []
      for (let i = 0; i < nhom.length; i++) {
        setBuoc(`Giọng AI đang đọc đoạn ${i + 1}/${nhom.length}…`)
        const chu = nhom[i].map((c) => sach(c.loi)).join('\n')
        const khoa = `${giong}|${chu}`
        let b64 = giongDaDoc.get(khoa)
        if (!b64) {
          const r = await docDoanPhim(chu, giong)
          if (!r.ok) throw new Error(r.thongBao)
          b64 = r.amThanh
          giongDaDoc.set(khoa, b64)
        }
        am.push(await ac.decodeAudioData(giaiMa(b64)))
      }
      const ghep = ac.createBuffer(1, am.reduce((s, b) => s + b.length, 0), ac.sampleRate)
      let viTri = 0
      for (const b of am) {
        ghep.copyToChannel(b.getChannelData(0), 0, viTri)
        viTri += b.length
      }
      const tong = ghep.duration

      // 2) Lịch chiếu: trong mỗi đoạn, cảnh dài theo số chữ; trong mỗi cảnh, phụ đề cũng chia theo số chữ
      setBuoc('Đang nạp ảnh…')
      const lich: { tu: number; den: number; a: HTMLImageElement | null; so: number; pd: { d: string; den: number }[] }[] = []
      let moc = 0
      for (let i = 0; i < nhom.length; i++) {
        const nang = nhom[i].map((c) => sach(c.loi).length + 12)
        const tongNang = nang.reduce((x, y) => x + y, 0)
        for (let j = 0; j < nhom[i].length; j++) {
          const c = nhom[i][j]
          const tu = moc
          const den = (moc += (nang[j] / tongNang) * am[i].duration)
          const doan = tachPhuDe(sach(c.loi))
          const nangPd = doan.map((d) => d.length + 8)
          const tongPd = nangPd.reduce((x, y) => x + y, 0)
          let mocPd = tu
          lich.push({
            tu,
            den,
            a: anh[c.id] ? await taiAnh(anh[c.id]) : null,
            so: phim.canh.indexOf(c),
            pd: doan.map((d, n) => ({ d, den: (mocPd += (nangPd[n] / tongPd) * (den - tu)) })),
          })
        }
      }

      // 3) Vẽ + quay theo thời gian thực
      const c = document.createElement('canvas')
      c.width = K.rong
      c.height = K.cao
      const g = c.getContext('2d')!
      const ve = (t: number) => {
        const tim = lich.findIndex((y) => t < y.den)
        const viTriCanh = tim < 0 ? lich.length - 1 : tim
        const x = lich[viTriCanh]
        const trong = t - x.tu
        if (viTriCanh > 0 && trong < CHUYEN) veCanh(g, lich[viTriCanh - 1].a, lich[viTriCanh - 1].so, 1)
        g.globalAlpha = viTriCanh > 0 ? Math.min(1, trong / CHUYEN) : 1
        veCanh(g, x.a, x.so, Math.min(1, trong / (x.den - x.tu)))
        g.globalAlpha = 1
        if (phuDe) {
          const p = x.pd.find((y) => t < y.den) ?? x.pd.at(-1)
          if (p) veChu(g, K, p.d)
        }
      }

      const dich = ac.createMediaStreamDestination()
      const nguon = ac.createBufferSource()
      nguon.buffer = ghep
      nguon.connect(dich)
      nguon.connect(ac.destination)
      ve(0)
      const rec = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dich.stream.getAudioTracks()]), {
        mimeType: kieu,
        videoBitsPerSecond: 6_000_000,
      })
      const manh: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && manh.push(e.data)
      const daXong = new Promise<void>((xong) => (rec.onstop = () => xong()))

      rec.start(1000)
      const batDau = ac.currentTime
      nguon.start()
      let khung = 0
      const lap = () => {
        const t = ac.currentTime - batDau
        ve(Math.min(t, tong))
        setBuoc(`Đang dựng phim ${Math.min(Math.floor(t), Math.ceil(tong))}/${Math.ceil(tong)} giây — giữ nguyên tab này, đừng chuyển tab hay thu nhỏ cửa sổ…`)
        if (t < tong + 0.3) khung = requestAnimationFrame(lap)
        else rec.stop()
      }
      khung = requestAnimationFrame(lap)
      await daXong
      cancelAnimationFrame(khung)

      setVideo({ url: URL.createObjectURL(new Blob(manh, { type: kieu.split(';')[0] })), duoi: kieu.startsWith('video/mp4') ? 'mp4' : 'webm' })
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Dựng phim lỗi')
    } finally {
      setBuoc('')
      ac.close()
    }
  }

  if (!san) return <p className="mt-6 animate-pulse text-sm text-phu">Đang mở bài làm dở…</p>

  const ban = !!buoc || dangViet
  const tenTep = (phim.ten.trim() || 'phim-hoat-hinh').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

  return (
    <div>
      {/* 1. Câu chuyện */}
      <section className={KHUNG}>
        <h2 className="text-lg font-bold">1. Câu chuyện</h2>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Tên mẩu chuyện
          <input value={phim.ten} maxLength={100} onChange={(e) => sua({ ten: e.target.value })} className={`${O} font-normal`} />
        </label>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Ý chính (kể vài câu như đang kể cho bạn nghe: ai, chuyện gì xảy ra, kết thúc bất ngờ ra sao)
          <textarea
            value={phim.yChinh}
            rows={4}
            maxLength={3000}
            onChange={(e) => sua({ yChinh: e.target.value })}
            placeholder="Ví dụ: Tôi giấu tiền riêng trong cái mũ bảo hiểm cũ. Vợ dọn nhà đem cho ông hàng xóm. Tôi chạy sang xin lại thì ổng đã đưa tiền cho vợ tôi mất rồi…"
            className={`${O} font-normal`}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={soCanh} onChange={(e) => setSoCanh(Number(e.target.value))} disabled={ban} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {[6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} cảnh (khoảng {Math.round((n * 10) / 6) / 10} phút)
              </option>
            ))}
          </select>
          <button type="button" onClick={aiViet} disabled={ban || !coAi} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
            {dangViet ? 'AI đang viết…' : 'AI viết bảng cảnh'}
          </button>
          <button type="button" onClick={mauMoi} disabled={ban} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
            Làm mẩu mới
          </button>
        </div>
        {!coAi && <p className="mt-2 text-xs text-amber-700">Trang chưa cài khóa Gemini nên AI chưa viết được. Bạn vẫn tự gõ bảng cảnh ở mục 3 được.</p>}
        {loiViet && <p className="mt-2 text-sm text-red-600">{loiViet}</p>}
        <p className="mt-2 text-xs text-phu">Trang mở sẵn một mẩu ví dụ để bạn làm thử. Bạn sửa được mọi ô; bài làm dở tự lưu trên máy này.</p>
      </section>

      {/* 2. Nhân vật */}
      <section className={KHUNG}>
        <details>
          <summary className="cursor-pointer text-lg font-bold">2. Nhân vật và phong cách vẽ (làm một lần, dùng cho mọi mẩu)</summary>
          <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-xs text-phu">
            <li>Với mỗi nhân vật, bấm Chép câu lệnh tờ mẫu, dán vào Gemini để vẽ.</li>
            <li>Lưu tờ ảnh mẫu ưng ý về máy. Từ đó mỗi lần vẽ cảnh, đính kèm tờ mẫu của các nhân vật có trong cảnh.</li>
          </ol>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Phong cách chung (tự chèn vào mọi câu lệnh)
            <textarea value={phim.phongCach} rows={3} maxLength={800} onChange={(e) => sua({ phongCach: e.target.value })} className={`${O} font-normal`} />
          </label>
          <ul className="mt-3 space-y-2">
            {phim.nhanVat.map((n, i) => (
              <li key={i} className="grid gap-2 rounded-lg bg-nen p-2 sm:grid-cols-[9rem_1fr_auto]">
                <input value={n.ten} maxLength={40} placeholder="Tên" onChange={(e) => suaNhanVat(i, { ten: e.target.value })} className={O} />
                <input value={n.moTa} maxLength={300} placeholder="Tuổi, dáng người, tóc, quần áo" onChange={(e) => suaNhanVat(i, { moTa: e.target.value })} className={O} />
                <span className="flex items-center gap-2">
                  <NutChep chu={cauLenhMau(phim, n)} nhan="Chép câu lệnh tờ mẫu" />
                  <button type="button" onClick={() => sua({ nhanVat: phim.nhanVat.filter((_, j) => j !== i) })} className="text-xs text-red-600 hover:underline">
                    Xóa
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => sua({ nhanVat: [...phim.nhanVat, { ten: '', moTa: '' }] })} className="mt-2 text-sm font-semibold text-chinh hover:underline">
            + Thêm nhân vật
          </button>
          <p className="mt-2 text-xs text-phu">Nhân vật đầu tiên là người kể chuyện. Đừng dùng tên, hình ảnh của người thật hay nhân vật của kênh khác.</p>
        </details>
      </section>

      {/* 3. Bảng cảnh */}
      <section className={KHUNG}>
        <h2 className="text-lg font-bold">3. Bảng cảnh ({phim.canh.length} cảnh)</h2>
        <p className="mt-1 text-xs text-phu">
          Với từng cảnh: bấm Chép câu lệnh vẽ, dán vào Gemini cùng tờ ảnh mẫu nhân vật, tải ảnh về rồi bấm Chọn ảnh. Cảnh chưa có ảnh vẫn dựng thử được (hiện nền tối).
        </p>
        <ul className="mt-3 space-y-3">
          {phim.canh.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold">Cảnh {i + 1}</span>
                <span className="text-xs text-phu">khoảng {Math.max(1, Math.round(sach(c.loi).length / 14))} giây</span>
                <span className="ml-auto flex items-center gap-3 text-xs">
                  <button type="button" onClick={() => doiCho(i, -1)} disabled={i === 0} className="text-phu hover:text-chinh disabled:opacity-30">
                    ↑ Lên
                  </button>
                  <button type="button" onClick={() => doiCho(i, 1)} disabled={i === phim.canh.length - 1} className="text-phu hover:text-chinh disabled:opacity-30">
                    ↓ Xuống
                  </button>
                  <button type="button" onClick={() => xoaCanh(c.id)} disabled={phim.canh.length === 1} className="text-red-600 hover:underline disabled:opacity-30">
                    Xóa
                  </button>
                </span>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_12rem]">
                <div className="grid gap-2">
                  <label className="grid gap-1 text-xs font-medium">
                    Lời đọc
                    <textarea value={c.loi} rows={2} maxLength={600} onChange={(e) => suaCanh(c.id, { loi: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Hình cần vẽ (gọi nhân vật bằng đúng tên ở mục 2)
                    <textarea value={c.hinh} rows={2} maxLength={600} onChange={(e) => suaCanh(c.id, { hinh: e.target.value })} className={`${O} font-normal`} />
                  </label>
                </div>
                <div className="grid content-start gap-2">
                  {anh[c.id] ? (
                    <img src={anh[c.id]} alt={`Ảnh cảnh ${i + 1}`} className="aspect-video w-full rounded-md bg-slate-900 object-contain" />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-phu">Chưa có ảnh</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <NutChep chu={cauLenhCanh(phim, c)} nhan="Chép câu lệnh vẽ" />
                    <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:border-chinh hover:text-chinh">
                      {anh[c.id] ? 'Đổi ảnh' : 'Chọn ảnh'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          chonAnh(c.id, e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => sua({ canh: [...phim.canh, { id: ma(), loi: '', hinh: '' }] })} className="mt-3 text-sm font-semibold text-chinh hover:underline">
          + Thêm cảnh
        </button>
      </section>

      {/* 4. Dựng phim */}
      <section className={KHUNG}>
        <h2 className="text-lg font-bold">4. Dựng phim</h2>
        <p className="mt-1 text-sm text-phu">
          Dài khoảng {Math.floor(uocGiay / 60)} phút {uocGiay % 60} giây · đã có {soAnh}/{coLoi.length} ảnh · lần dựng này tốn {luotMoi} lượt giọng Gemini
          {luotMoi === 0 && coLoi.length > 0 ? ' (giọng đã đọc sẵn)' : ''}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={giong} onChange={(e) => setGiong(e.target.value)} disabled={ban} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {GIONG.filter(([m]) => m !== 'may').map(([m, ten]) => (
              <option key={m} value={m}>
                {m} — {ten}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={phuDe} onChange={(e) => setPhuDe(e.target.checked)} disabled={ban} />
            Phụ đề
          </label>
          <button type="button" onClick={dung} disabled={ban} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {buoc ? 'Đang dựng…' : video ? 'Dựng lại' : 'Dựng phim'}
          </button>
        </div>
        <p className="mt-2 text-xs text-phu">Phim được quay theo thời gian thật: phim dài bao nhiêu thì chờ bấy nhiêu. Sửa lời đọc hoặc đổi giọng thì đoạn đó phải đọc lại (tốn lượt); đổi ảnh hay phụ đề thì không.</p>
        {buoc && <p className="mt-2 animate-pulse text-sm text-chinh">{buoc}</p>}
        {loi && <p className="mt-2 text-sm text-red-600">{loi}</p>}
        {video && (
          <div className="mt-3 grid gap-3">
            <video src={video.url} controls className="w-full max-w-2xl rounded-lg bg-black" />
            <div className="flex flex-wrap items-center gap-3">
              <a href={video.url} download={`${tenTep}.${video.duoi}`} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam">
                Tải video về
              </a>
              {phim.ten.trim() && <NutChep chu={phim.ten.trim()} nhan="Chép tên làm tiêu đề YouTube" />}
              <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-sm font-semibold text-chinh hover:underline">
                Mở YouTube Studio →
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
