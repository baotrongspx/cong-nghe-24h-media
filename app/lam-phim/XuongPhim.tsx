'use client'

import { useEffect, useState } from 'react'
import { KIEU, giaiMa, tachPhuDe, veChu } from '@/lib/dungVideo'
import { GIONG } from '@/lib/giongDoc'
import { agentBoiCanh, agentKichBan, agentNhanVat, agentVideo, docDoanPhim, type VideoAi } from './actions'

// Xưởng phim hoạt hình kể chuyện, có đội 4 agent:
// 1) nhân vật (câu lệnh tờ mẫu cho Gemini)  2) kịch bản  3) bối cảnh (câu lệnh vẽ nền trống)  4) câu lệnh video 8/10 giây cho Gemini (Veo).
// Chữ lưu trong trình duyệt (localStorage), ảnh lưu trong IndexedDB: tắt trang mở lại vẫn còn, nhưng chỉ trên máy này.
type NhanVat = { ten: string; moTa: string; tinhCach?: string; giong?: string }
type BoiCanh = { ten: string; moTa: string }
type Canh = { id: string; loi: string; hinh: string; boiCanh?: string; nhanVat?: string[]; hanhDong?: string; video?: VideoAi | null }
type Phim = { ten: string; yChinh: string; phongCach: string; giay: 8 | 10; nhanVat: NhanVat[]; boiCanh: BoiCanh[]; canh: Canh[] }

const K = { rong: 1280, cao: 720, coChu: 40, viTriChu: 0.86 }
const CHUYEN = 0.25 // giây chuyển mờ giữa hai cảnh
const TOI_DA_DOAN = 1100 // số ký tự tối đa cho một lượt giọng đọc
const KHOA_LUU = 'lam-phim-v1'

const ma = () => crypto.randomUUID()

const MAU: Phim = {
  ten: 'Quỹ đen trong mũ bảo hiểm',
  yChinh:
    'Tí giấu hai triệu rưỡi tiền riêng trong cái mũ bảo hiểm cũ vì nghĩ vợ chê hôi không bao giờ đụng vào. Chị Na dọn nhà, đem cái mũ cho ông Bảy hàng xóm úp chậu lan. Tí chạy sang xin lại thì trong mũ chỉ còn tờ giấy: ông Bảy đã đưa tiền cho chị Na vì "chú cũng từng có vợ".',
  phongCach:
    'Hoạt hình 2D chibi, đầu to thân nhỏ, nét viền đen dày đều, màu phẳng tươi không đổ bóng, mắt tròn to tròng trắng con ngươi đen nhỏ, biểu cảm phóng đại, nền đơn giản ít chi tiết.',
  giay: 8,
  nhanVat: [
    { ten: 'Tí', moTa: 'nam 30 tuổi, hơi mũm mĩm, tóc đen ngắn rẽ ngôi lệch, áo thun cam, quần đùi xanh đậm, dép tổ ong vàng', tinhCach: 'người chồng hay tính toán nhưng luôn thua vợ, tự kể chuyện', giong: 'giọng nam trẻ, nói nhanh, hài hước' },
    { ten: 'Chị Na', moTa: 'nữ 28 tuổi, tóc nâu buộc đuôi ngựa cao, áo sơ mi xanh ngọc, quần dài trắng', tinhCach: 'người vợ tỉnh táo, luôn thắng', giong: 'giọng nữ trẻ, trong, tươi tắn' },
    { ten: 'Ông Bảy', moTa: 'nam 60 tuổi, đầu hói hai bên còn tóc bạc, ria mép bạc, áo ba lỗ trắng, quần pijama sọc xanh', tinhCach: 'ông hàng xóm lắm chiêu', giong: 'giọng nam lớn tuổi, trầm, chậm rãi' },
  ],
  boiCanh: [],
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

// Bài cũ (trước khi có đội agent) thiếu vài trường: điền mặc định
function chuanHoa(p: Partial<Phim> | null): Phim | null {
  if (!p?.canh?.length) return null
  return { ...MAU, ...p, giay: p.giay === 10 ? 10 : 8, nhanVat: p.nhanVat ?? [], boiCanh: p.boiCanh ?? [], canh: p.canh } as Phim
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

function nhanVatTrongCanh(p: Phim, c: Canh) {
  const chu = `${c.hinh}\n${c.hanhDong ?? ''}\n${c.loi}`
  return p.nhanVat.filter((n) => n.ten.trim() && ((c.nhanVat ?? []).some((t) => t.trim().toLowerCase() === n.ten.trim().toLowerCase()) || coTen(chu, n.ten)))
}

const timBoiCanh = (p: Phim, c: Canh) => p.boiCanh.find((b) => b.ten.trim().toLowerCase() === (c.boiCanh ?? '').trim().toLowerCase())

function cauLenhMau(p: Phim, n: NhanVat) {
  return [
    p.phongCach.trim(),
    'Vẽ tờ mẫu nhân vật trên nền trắng trơn: cùng một nhân vật đứng nhìn thẳng, nhìn nghiêng, nhìn sau lưng, và 4 khuôn mặt: vui, giận, khóc, ngạc nhiên. Giữ đúng tỉ lệ và màu sắc ở mọi tư thế.',
    `Nhân vật: ${n.ten.trim()} — ${n.moTa.trim()}`,
    'Không có chữ trong ảnh.',
  ].join('\n\n')
}

// Một câu lệnh vẽ cả dàn nhân vật trên cùng một tờ mẫu
function cauLenhTatCaNhanVat(p: Phim) {
  const ds = p.nhanVat.filter((n) => n.ten.trim() && n.moTa.trim())
  return [
    p.phongCach.trim(),
    `Vẽ TỜ MẪU CẢ DÀN NHÂN VẬT trên nền trắng trơn, ảnh ngang 16:9. Có ${ds.length} nhân vật, xếp thành ${ds.length} cột từ trái sang phải theo đúng thứ tự dưới đây, cùng một tỉ lệ chiều cao.`,
    'Mỗi cột vẽ một nhân vật: một dáng đứng nhìn thẳng toàn thân lớn, bên dưới là dáng nhìn nghiêng, và một hàng 3 khuôn mặt nhỏ: vui, giận, ngạc nhiên. Giữ đúng màu sắc và quần áo ở mọi hình. Các nhân vật phải khác nhau rõ ràng.',
    `Danh sách nhân vật (trái sang phải):\n${ds.map((n, i) => `${i + 1}. ${n.ten.trim()}: ${n.moTa.trim()}`).join('\n')}`,
    'Không viết tên hay bất kỳ chữ nào trong ảnh, không logo.',
  ].join('\n\n')
}

function cauLenhBoiCanh(p: Phim, b: BoiCanh) {
  return [
    p.phongCach.trim(),
    `Vẽ bối cảnh TRỐNG, không có người: ${b.ten.trim()} — ${b.moTa.trim()}`,
    'Ảnh ngang tỉ lệ 16:9, góc nhìn ngang tầm mắt, chừa khoảng trống ở giữa và hai bên để sau này đặt nhân vật. Không có chữ, không có logo.',
  ].join('\n\n')
}

function cauLenhCanh(p: Phim, c: Canh) {
  const co = nhanVatTrongCanh(p, c)
  const bc = timBoiCanh(p, c)
  return [
    p.phongCach.trim(),
    co.length ? `Nhân vật trong cảnh (vẽ giống hệt tờ mẫu tôi đính kèm):\n${co.map((n) => `- ${n.ten.trim()}: ${n.moTa.trim()}`).join('\n')}` : '',
    bc ? `Bối cảnh (giữ y hệt ảnh bối cảnh tôi đính kèm): ${bc.ten.trim()} — ${bc.moTa.trim()}` : '',
    `Cảnh cần vẽ: ${c.hinh.trim()}`,
    'Ảnh ngang tỉ lệ 16:9. Không có chữ, không có logo trong ảnh.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function cauLenhVideo(p: Phim, c: Canh) {
  const co = nhanVatTrongCanh(p, c)
  const bc = timBoiCanh(p, c)
  const g = p.giay
  const dinhKem = ['ảnh khung đầu của cảnh này', ...co.map((n) => `tờ mẫu ${n.ten.trim()}`), ...(bc ? [`ảnh bối cảnh "${bc.ten.trim()}"`] : [])]
  const dienBien = c.video?.dienBien?.length
    ? c.video.dienBien.map((d) => `${d.tu}-${d.den} giây: ${d.viec}`).join('\n')
    : `0-${g} giây: ${(c.hanhDong || c.hinh).trim()}`
  const loi = c.loi
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const m = d.match(/^([^:]{1,30}):\s*(.+)$/)
      return m ? `${m[1].trim()}: "${m[2].trim().replace(/^"|"$/g, '')}"` : `Người kể: "${d}"`
    })
  return [
    `Tạo video hoạt hình dài ${g} giây, MỘT cảnh quay liền, không cắt cảnh.`,
    `PHONG CÁCH: ${p.phongCach.trim()} Giữ đúng nét vẽ, nhân vật và bối cảnh như các ảnh tham chiếu.`,
    `ẢNH ĐÍNH KÈM: ${dinhKem.join(', ')}. Khung hình đầu tiên phải giống ảnh khung đầu.`,
    co.length ? `NHÂN VẬT (giữ y hệt tờ mẫu, không đổi mặt, tóc, quần áo):\n${co.map((n) => `- ${n.ten.trim()}: ${n.moTa.trim()}.${n.giong ? ` Giọng: ${n.giong.trim()}.` : ''}`).join('\n')}` : '',
    bc ? `BỐI CẢNH (giữ y hệt ảnh bối cảnh): ${bc.ten.trim()} — ${bc.moTa.trim()}` : '',
    `DIỄN BIẾN:\n${dienBien}`,
    c.video?.mayQuay ? `MÁY QUAY: ${c.video.mayQuay}` : 'MÁY QUAY: đứng yên, giữ nguyên khung hình.',
    loi.length ? `LỜI THOẠI (tiếng Việt, nhép miệng đúng người đang nói):\n${loi.join('\n')}` : 'LỜI THOẠI: không có.',
    c.video?.amThanh ? `ÂM THANH: ${c.video.amThanh}` : '',
    'CẤM: chữ, phụ đề, logo, thêm nhân vật khác, đổi trang phục, đổi bối cảnh, cắt cảnh, chuyển sang 3D hay người thật.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

// Lời để giọng máy đọc: bỏ tên người nói ở đầu dòng ("Tí: ...")
const loiDeDoc = (s: string) =>
  s
    .split('\n')
    .map((d) => d.replace(/^\s*[^:\n]{1,30}:\s*/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')

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
  const lech = a.width / a.height / (K.rong / K.cao)
  const vua = lech > 0.85 && lech < 1.18 ? Math.max(K.rong / a.width, K.cao / a.height) : Math.min(K.rong / a.width, K.cao / a.height)
  const tl = vua * (1 + 0.06 * (so % 2 ? 1 - tienDo : tienDo))
  g.drawImage(a, (K.rong - a.width * tl) / 2, (K.cao - a.height * tl) / 2, a.width * tl, a.height * tl)
}

function NutChep({ chu, nhan = 'Chép', chinh = false }: { chu: string; nhan?: string; chinh?: boolean }) {
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
      className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${chinh ? 'border-chinh bg-chinh text-white hover:bg-chinh-dam' : 'border-slate-300 bg-white hover:border-chinh hover:text-chinh'}`}
    >
      {da ? 'Đã chép ✓' : nhan}
    </button>
  )
}

const O = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'
const KHUNG = 'mt-6 rounded-xl border border-slate-200 bg-white p-4'

type MaAgent = 'nv' | 'kb' | 'bc' | 'vd'
const TEN_AGENT: Record<MaAgent, string> = { nv: 'Agent nhân vật', kb: 'Agent kịch bản', bc: 'Agent bối cảnh', vd: 'Agent câu lệnh video' }

function NutAgent({ ma, dang, tat, chay, nhan }: { ma: MaAgent; dang: MaAgent | null; tat: boolean; chay: () => void; nhan: string }) {
  return (
    <button type="button" onClick={chay} disabled={tat} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
      {dang === ma ? `${TEN_AGENT[ma]} đang làm…` : nhan}
    </button>
  )
}

export default function XuongPhim({ coAi }: { coAi: boolean }) {
  const [phim, setPhim] = useState<Phim>(MAU)
  const [anh, setAnh] = useState<Record<string, string>>({})
  const [san, setSan] = useState(false)
  const [soCanh, setSoCanh] = useState(8)
  const [dangAgent, setDangAgent] = useState<MaAgent | null>(null)
  const [tinAgent, setTinAgent] = useState<{ loai: 'ok' | 'loi'; chu: string } | null>(null)
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
        luu = chuanHoa(JSON.parse(localStorage.getItem(KHOA_LUU) ?? 'null'))
      } catch {}
      const p = luu ?? MAU
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
    if (!san) return
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(phim))
    } catch {}
  }, [phim, san])

  useEffect(() => () => void (video && URL.revokeObjectURL(video.url)), [video])

  const sua = (p: Partial<Phim>) => setPhim((x) => ({ ...x, ...p }))
  const suaCanh = (id: string, p: Partial<Canh>) => setPhim((x) => ({ ...x, canh: x.canh.map((c) => (c.id === id ? { ...c, ...p } : c)) }))
  const suaNhanVat = (i: number, p: Partial<NhanVat>) => setPhim((x) => ({ ...x, nhanVat: x.nhanVat.map((n, j) => (j === i ? { ...n, ...p } : n)) }))
  const suaBoiCanh = (i: number, p: Partial<BoiCanh>) => setPhim((x) => ({ ...x, boiCanh: x.boiCanh.map((b, j) => (j === i ? { ...b, ...p } : b)) }))

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

  // ---- Đội agent ----
  // Mỗi agent nhận bản phim mới nhất và trả về bản đã cập nhật (để "Chạy cả đội" nối tiếp được)
  async function lamAgent(maAgent: MaAgent, p: Phim): Promise<Phim> {
    setDangAgent(maAgent)
    if (maAgent === 'nv') {
      const r = await agentNhanVat(p.yChinh, p.phongCach, p.nhanVat.map((n) => ({ ten: n.ten, moTa: n.moTa, tinhCach: n.tinhCach ?? '', giong: n.giong ?? '' })))
      if (!r.ok) throw new Error(r.thongBao)
      return { ...p, nhanVat: r.nhanVat }
    }
    if (maAgent === 'kb') {
      const r = await agentKichBan(p.yChinh, soCanh, p.giay, p.nhanVat.map((n) => ({ ten: n.ten, moTa: n.moTa, tinhCach: n.tinhCach ?? '', giong: n.giong ?? '' })))
      if (!r.ok) throw new Error(r.thongBao)
      boAnh(p.canh.map((c) => c.id))
      return { ...p, ten: r.ten || p.ten, canh: r.canh.map((c) => ({ id: ma(), ...c, video: null })) }
    }
    if (maAgent === 'bc') {
      const ten = p.canh.map((c) => c.boiCanh ?? '').filter(Boolean)
      const r = await agentBoiCanh(p.phongCach, ten, p.boiCanh, p.canh.map((c) => c.hanhDong || c.hinh))
      if (!r.ok) throw new Error(r.thongBao)
      return { ...p, boiCanh: r.boiCanh }
    }
    const r = await agentVideo(
      p.giay,
      p.canh.map((c) => ({ boiCanh: c.boiCanh ?? '', nhanVat: c.nhanVat ?? nhanVatTrongCanh(p, c).map((n) => n.ten), hanhDong: c.hanhDong ?? '', loi: c.loi, hinh: c.hinh })),
    )
    if (!r.ok) throw new Error(r.thongBao)
    return { ...p, canh: p.canh.map((c, i) => ({ ...c, video: r.video[i] ?? c.video ?? null })) }
  }

  async function chayAgent(ds: MaAgent[]) {
    setTinAgent(null)
    if (ds.includes('kb') && phim.canh.some((c) => c.loi.trim() || anh[c.id]) && !confirm('Agent kịch bản sẽ viết bảng cảnh mới thay cho bảng cảnh đang có (ảnh đã tải lên cũng bị bỏ). Tiếp tục?')) return
    let p = phim
    let xong = 0
    try {
      for (const m of ds) {
        p = await lamAgent(m, p)
        setPhim(p)
        xong++
      }
      setVideo(null)
      setTinAgent({ loai: 'ok', chu: ds.length > 1 ? 'Cả đội đã làm xong. Kéo xuống để chép câu lệnh.' : `${TEN_AGENT[ds[0]]} đã làm xong.` })
    } catch (e) {
      const ten = TEN_AGENT[ds[xong]]
      setTinAgent({ loai: 'loi', chu: `${ten} gặp lỗi: ${e instanceof Error ? e.message : 'không gọi được AI'}.${xong ? ' Các agent trước đã làm xong, bấm lại nút của agent này để làm tiếp.' : ''}` })
    } finally {
      setDangAgent(null)
    }
  }

  function mauMoi() {
    if (!confirm('Xóa bảng cảnh, bối cảnh và ảnh đang có để làm mẩu chuyện mới? (Nhân vật và phong cách được giữ lại)')) return
    boAnh(phim.canh.map((c) => c.id))
    setVideo(null)
    setPhim((x) => ({ ...x, ten: '', yChinh: '', boiCanh: [], canh: [{ id: ma(), loi: '', hinh: '' }] }))
  }

  const coLoi = phim.canh.filter((c) => loiDeDoc(c.loi))
  // Gom các cảnh liền nhau thành từng đoạn, mỗi đoạn một lượt giọng đọc
  const nhom: Canh[][] = []
  for (const c of coLoi) {
    const cuoi = nhom.at(-1)
    if (cuoi && cuoi.reduce((s, x) => s + loiDeDoc(x.loi).length + 1, 0) + loiDeDoc(c.loi).length <= TOI_DA_DOAN) cuoi.push(c)
    else nhom.push([c])
  }
  const tongChu = coLoi.reduce((s, c) => s + loiDeDoc(c.loi).length, 0)
  const uocGiay = Math.round(tongChu / 14)
  const soAnh = coLoi.filter((c) => anh[c.id]).length
  const luotMoi = nhom.filter((n) => !giongDaDoc.has(`${giong}|${n.map((c) => loiDeDoc(c.loi)).join('\n')}`)).length

  async function dung() {
    setLoi('')
    setVideo(null)
    if (!coLoi.length) return setLoi('Bảng cảnh chưa có lời đọc nào')
    const qua = coLoi.findIndex((c) => loiDeDoc(c.loi).length > TOI_DA_DOAN)
    if (qua >= 0) return setLoi(`Lời đọc của cảnh ${phim.canh.indexOf(coLoi[qua]) + 1} quá dài, hãy tách thành hai cảnh`)
    const kieu = KIEU.find((k) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(k))
    if (!kieu) return setLoi('Trình duyệt này không quay được video, hãy dùng Chrome hoặc Edge bản mới')
    const ac = new AudioContext()
    try {
      const am: AudioBuffer[] = []
      for (let i = 0; i < nhom.length; i++) {
        setBuoc(`Giọng AI đang đọc đoạn ${i + 1}/${nhom.length}…`)
        const chu = nhom[i].map((c) => loiDeDoc(c.loi)).join('\n')
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

      setBuoc('Đang nạp ảnh…')
      const lich: { tu: number; den: number; a: HTMLImageElement | null; so: number; pd: { d: string; den: number }[] }[] = []
      let moc = 0
      for (let i = 0; i < nhom.length; i++) {
        const nang = nhom[i].map((c) => loiDeDoc(c.loi).length + 12)
        const tongNang = nang.reduce((x, y) => x + y, 0)
        for (let j = 0; j < nhom[i].length; j++) {
          const c = nhom[i][j]
          const tu = moc
          const den = (moc += (nang[j] / tongNang) * am[i].duration)
          const doan = tachPhuDe(loiDeDoc(c.loi))
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

  const ban = !!buoc || !!dangAgent
  const tatAi = ban || !coAi
  const tenTep = (phim.ten.trim() || 'phim-hoat-hinh').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const tenBoiCanh = [...new Set([...phim.boiCanh.map((b) => b.ten), ...phim.canh.map((c) => c.boiCanh ?? '')].map((t) => t.trim()).filter(Boolean))]

  return (
    <div>
      {/* 1. Câu chuyện + đội agent */}
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
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Mỗi đoạn video dài
            <select value={phim.giay} onChange={(e) => sua({ giay: Number(e.target.value) === 10 ? 10 : 8 })} disabled={ban} className="rounded-md border border-slate-300 px-2 py-1.5">
              <option value={8}>8 giây</option>
              <option value={10}>10 giây</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Số cảnh
            <select value={soCanh} onChange={(e) => setSoCanh(Number(e.target.value))} disabled={ban} className="rounded-md border border-slate-300 px-2 py-1.5">
              {[4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} cảnh (khoảng {Math.round((n * phim.giay) / 6) / 10} phút)
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-lg bg-nen p-3">
          <p className="text-sm font-semibold">Đội agent</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-phu">
            <li>Agent nhân vật: thiết kế nhân vật và viết câu lệnh vẽ tờ mẫu cho Gemini.</li>
            <li>Agent kịch bản: chia câu chuyện thành từng cảnh {phim.giay} giây, có lời thoại và hành động.</li>
            <li>Agent bối cảnh: tả từng nơi chốn và viết câu lệnh vẽ ảnh nền trống cho Gemini.</li>
            <li>Agent câu lệnh video: viết câu lệnh {phim.giay} giây cho từng cảnh để dán vào Gemini làm video.</li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => chayAgent(['nv', 'kb', 'bc', 'vd'])}
              disabled={tatAi}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {dangAgent ? `${TEN_AGENT[dangAgent]} đang làm…` : 'Chạy cả đội (4 agent)'}
            </button>
            <button type="button" onClick={mauMoi} disabled={ban} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-white disabled:opacity-50">
              Làm mẩu mới
            </button>
          </div>
          <p className="mt-2 text-xs text-phu">Cả đội tốn 4 lượt AI viết chữ, chạy khoảng 1-2 phút. Mỗi agent cũng có nút riêng ở mục của nó để làm lại phần đó.</p>
          {tinAgent && <p className={`mt-2 text-sm ${tinAgent.loai === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{tinAgent.chu}</p>}
        </div>
        {!coAi && <p className="mt-2 text-xs text-amber-700">Trang chưa cài khóa Gemini nên các agent chưa chạy được. Bạn vẫn tự gõ các mục bên dưới được.</p>}
      </section>

      {/* 2. Nhân vật */}
      <section className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">2. Nhân vật</h2>
          <NutAgent ma="nv" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['nv'])} nhan="Agent nhân vật" />
          {phim.nhanVat.some((n) => n.ten.trim() && n.moTa.trim()) && <NutChep chu={cauLenhTatCaNhanVat(phim)} nhan="Chép 1 câu lệnh vẽ tất cả nhân vật" chinh />}
        </div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-phu">
          <li>Bấm Chép 1 câu lệnh vẽ tất cả nhân vật, dán vào Gemini: ra một tờ mẫu có cả dàn nhân vật. Nhân vật nào vẽ chưa đẹp thì chép câu lệnh riêng của người đó để vẽ lại.</li>
          <li>Lưu tờ mẫu ưng ý về máy. Từ đó mỗi lần làm ảnh hay video, đính kèm tờ mẫu này.</li>
        </ol>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Phong cách chung (tự chèn vào mọi câu lệnh)
          <textarea value={phim.phongCach} rows={2} maxLength={800} onChange={(e) => sua({ phongCach: e.target.value })} className={`${O} font-normal`} />
        </label>
        <ul className="mt-3 space-y-2">
          {phim.nhanVat.map((n, i) => (
            <li key={i} className="grid gap-2 rounded-lg bg-nen p-2">
              <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                <input value={n.ten} maxLength={40} placeholder="Tên" onChange={(e) => suaNhanVat(i, { ten: e.target.value })} className={O} />
                <textarea value={n.moTa} rows={2} maxLength={400} placeholder="Ngoại hình cố định: tuổi, dáng, tóc, quần áo, màu sắc" onChange={(e) => suaNhanVat(i, { moTa: e.target.value })} className={O} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={n.tinhCach ?? ''} maxLength={200} placeholder="Tính cách, vai trò" onChange={(e) => suaNhanVat(i, { tinhCach: e.target.value })} className={O} />
                <input value={n.giong ?? ''} maxLength={150} placeholder="Giọng nói (cho video)" onChange={(e) => suaNhanVat(i, { giong: e.target.value })} className={O} />
              </div>
              <span className="flex items-center gap-2">
                <NutChep chu={cauLenhMau(phim, n)} nhan="Chép câu lệnh tờ mẫu" chinh />
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
        <p className="mt-2 text-xs text-phu">Đừng dùng tên, hình ảnh của người thật hay nhân vật của kênh khác.</p>
      </section>

      {/* 3. Kịch bản */}
      <section className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">3. Kịch bản ({phim.canh.length} cảnh)</h2>
          <NutAgent ma="kb" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['kb'])} nhan="Agent kịch bản" />
        </div>
        <p className="mt-1 text-xs text-phu">Mỗi cảnh là một đoạn video {phim.giay} giây. Lời thoại viết mỗi câu một dòng dạng &quot;Tên: câu nói&quot;.</p>
        <ul className="mt-3 space-y-3">
          {phim.canh.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold">Cảnh {i + 1}</span>
                {c.boiCanh && <span className="rounded bg-nen px-1.5 text-xs text-phu">{c.boiCanh}</span>}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-medium">
                      Bối cảnh
                      <input value={c.boiCanh ?? ''} list="ds-boi-canh" maxLength={80} onChange={(e) => suaCanh(c.id, { boiCanh: e.target.value })} className={`${O} font-normal`} />
                    </label>
                    <label className="grid gap-1 text-xs font-medium">
                      Nhân vật có mặt (cách nhau dấu phẩy)
                      <input
                        value={(c.nhanVat ?? []).join(', ')}
                        maxLength={160}
                        onChange={(e) => suaCanh(c.id, { nhanVat: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
                        className={`${O} font-normal`}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs font-medium">
                    Hành động
                    <textarea value={c.hanhDong ?? ''} rows={2} maxLength={500} onChange={(e) => suaCanh(c.id, { hanhDong: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Lời thoại
                    <textarea value={c.loi} rows={2} maxLength={600} onChange={(e) => suaCanh(c.id, { loi: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Khung hình đầu (để vẽ ảnh tĩnh)
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
                    <NutChep chu={cauLenhCanh(phim, c)} nhan="Chép câu lệnh ảnh đầu" />
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
        <datalist id="ds-boi-canh">
          {tenBoiCanh.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <button type="button" onClick={() => sua({ canh: [...phim.canh, { id: ma(), loi: '', hinh: '' }] })} className="mt-3 text-sm font-semibold text-chinh hover:underline">
          + Thêm cảnh
        </button>
      </section>

      {/* 4. Bối cảnh */}
      <section className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">4. Bối cảnh ({phim.boiCanh.length})</h2>
          <NutAgent ma="bc" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['bc'])} nhan="Agent bối cảnh" />
        </div>
        <p className="mt-1 text-xs text-phu">Vẽ mỗi nơi chốn một lần thành ảnh nền trống, lưu lại, rồi đính kèm vào mọi cảnh ở nơi đó để bối cảnh không bị đổi.</p>
        {!phim.boiCanh.length && <p className="mt-3 text-sm text-phu">Chưa có bối cảnh. Chạy agent kịch bản rồi bấm Agent bối cảnh.</p>}
        <ul className="mt-3 space-y-2">
          {phim.boiCanh.map((b, i) => (
            <li key={i} className="grid gap-2 rounded-lg bg-nen p-2 sm:grid-cols-[12rem_1fr]">
              <input value={b.ten} maxLength={80} onChange={(e) => suaBoiCanh(i, { ten: e.target.value })} className={O} />
              <textarea value={b.moTa} rows={2} maxLength={600} onChange={(e) => suaBoiCanh(i, { moTa: e.target.value })} className={O} />
              <span className="flex items-center gap-2 sm:col-span-2">
                <NutChep chu={cauLenhBoiCanh(phim, b)} nhan="Chép câu lệnh vẽ bối cảnh" chinh />
                <button type="button" onClick={() => sua({ boiCanh: phim.boiCanh.filter((_, j) => j !== i) })} className="text-xs text-red-600 hover:underline">
                  Xóa
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => sua({ boiCanh: [...phim.boiCanh, { ten: '', moTa: '' }] })} className="mt-2 text-sm font-semibold text-chinh hover:underline">
          + Thêm bối cảnh
        </button>
      </section>

      {/* 5. Câu lệnh video */}
      <section className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">5. Câu lệnh video {phim.giay} giây</h2>
          <NutAgent ma="vd" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['vd'])} nhan="Agent câu lệnh video" />
        </div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-phu">
          <li>Mở Gemini, chọn tạo video.</li>
          <li>Đính kèm ảnh khung đầu của cảnh (và tờ mẫu nhân vật, ảnh bối cảnh nếu Gemini cho đính kèm nhiều ảnh).</li>
          <li>Bấm Chép câu lệnh video của cảnh đó, dán vào, tạo video. Chưa ưng thì tạo lại 2-3 lần rồi chọn bản tốt nhất.</li>
          <li>Tải các đoạn về và nối theo thứ tự cảnh trong CapCut.</li>
        </ol>
        <ul className="mt-3 space-y-2">
          {phim.canh.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">Cảnh {i + 1}</span>
                <span className={`rounded px-1.5 text-xs ${c.video ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.video ? 'Agent đã viết diễn biến' : 'Chưa có diễn biến chi tiết'}</span>
                <span className="ml-auto">
                  <NutChep chu={cauLenhVideo(phim, c)} nhan={`Chép câu lệnh video ${phim.giay}s`} chinh />
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-chinh">Xem câu lệnh</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-nen p-2 text-xs">{cauLenhVideo(phim, c)}</pre>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Dựng nhanh bằng ảnh tĩnh */}
      <section className={KHUNG}>
        <details>
          <summary className="cursor-pointer text-lg font-bold">6. Dựng nhanh bằng ảnh tĩnh (không cần làm video)</summary>
          <p className="mt-2 text-sm text-phu">
            Ghép ảnh khung đầu của các cảnh với giọng AI đọc lời thoại và phụ đề thành video 16:9. Dài khoảng {Math.floor(uocGiay / 60)} phút {uocGiay % 60} giây · đã có {soAnh}/{coLoi.length} ảnh · lần dựng này tốn {luotMoi} lượt giọng Gemini.
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
          <p className="mt-2 text-xs text-phu">Phim được quay theo thời gian thật: phim dài bao nhiêu thì chờ bấy nhiêu. Giữ nguyên tab trong lúc dựng.</p>
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
              </div>
            </div>
          )}
        </details>
      </section>
    </div>
  )
}
