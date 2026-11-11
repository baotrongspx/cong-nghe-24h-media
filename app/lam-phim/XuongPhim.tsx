'use client'

import { useEffect, useState } from 'react'
import { type DongMay, type NhanVatMay, agentBoiCanh, agentDanY, agentDaoDien, agentKichBan, agentLamPhimMay, agentNhanVat, agentVideo, type DanhGia, type VideoAi } from './actions'
import XuongDaoCu from './XuongDaoCu'

// Xưởng phim hoạt hình kể chuyện, có đội 4 agent:
// 1) nhân vật  2) kịch bản (phim dài: dàn ý chia hồi)  3) đạo diễn chấm và sửa  4) bối cảnh — rồi tải kịch bản dàn dựng về máy nhà làm phim
// Chữ lưu trong trình duyệt (localStorage), ảnh lưu trong IndexedDB: tắt trang mở lại vẫn còn, nhưng chỉ trên máy này.
type NhanVat = { ten: string; moTa: string; tinhCach?: string; giong?: string }
type BoiCanh = { ten: string; moTa: string }
type Canh = { id: string; loi: string; hinh: string; boiCanh?: string; nhanVat?: string[]; viTri?: string; hanhDong?: string; video?: VideoAi | null; tuKhungCuoi?: boolean }
type Phim = { ten: string; yChinh: string; phongCach: string; giay: 8 | 10; phut?: number; nhanVat: NhanVat[]; boiCanh: BoiCanh[]; canh: Canh[]; danhGia?: DanhGia | null; banSua?: Canh[] | null }

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


// ---- Nhân vật trong cảnh ----
const coTen = (chu: string, ten: string) => new RegExp(`(?<![\\p{L}\\p{N}])${ten.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(chu)

function nhanVatTrongCanh(p: Phim, c: Canh) {
  const chu = `${c.hinh}\n${c.hanhDong ?? ''}\n${c.loi}`
  return p.nhanVat.filter((n) => n.ten.trim() && ((c.nhanVat ?? []).some((t) => t.trim().toLowerCase() === n.ten.trim().toLowerCase()) || coTen(chu, n.ten)))
}


function taiVe(blob: Blob, ten: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = ten
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

// Tải kịch bản .txt cho công cụ LAM_PHIM.bat trên máy (Blender 2D + giọng VieNeu, không tốn tiền)
function OLamPhimMay({ phim, tat }: { phim: Phim; tat: boolean }) {
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  const [xong, setXong] = useState('')
  async function tai() {
    setDang(true)
    setLoi('')
    setXong('')
    try {
      const ds = phim.canh.filter((c) => c.loi.trim())
      const r: { nhanVat: NhanVatMay[]; dong: DongMay[] } = { nhanVat: [], dong: [] }
      for (let i = 0; i < ds.length; i += 8) {
        setXong(`AI đạo diễn đang dàn dựng cảnh ${i + 1}-${Math.min(i + 8, ds.length)} / ${ds.length}…`)
        let k = await agentLamPhimMay({ ten: phim.ten, nhanVat: phim.nhanVat, canh: ds.slice(i, i + 8) })
        if (!k.ok) k = await agentLamPhimMay({ ten: phim.ten, nhanVat: phim.nhanVat, canh: ds.slice(i, i + 8) })
        if (!k.ok) throw new Error(`Cảnh ${i + 1}-${i + 8}: ${k.thongBao}`)
        if (!r.nhanVat.length) r.nhanVat = k.nhanVat
        r.dong.push(...k.dong)
      }
      const loai = new Map(r.nhanVat.map((n) => [n.ten, n.loai]))
      const them = new Map(r.nhanVat.map((n) => [n.ten, [...n.phuKien, ...Object.entries(n.mau).map(([k, v]) => `${k}=${v}`)].join(', ')]))
      const dong: string[] = [
        '# Kịch bản tải từ trang Làm phim. Kéo thả tệp này vào E:\\phim-blender\\LAM_PHIM.bat',
        `TEN: ${phim.ten.replace(/[\r\n]+/g, ' ')}`,
        ...phim.nhanVat.filter((n) => n.ten.trim()).map((n) => `NHAN VAT: ${n.ten.trim()} | ${loai.get(n.ten.trim()) ?? ''} | | ${them.get(n.ten.trim()) ?? ''}`),
        'NGUOI KE: Thiện Minh',
      ]
      let khoa = ''
      for (const d of r.dong) {
        const k = `${d.canh} | ${d.anhSang} | ${d.thoiTiet}`
        if (k !== khoa) {
          khoa = k
          dong.push('', `CANH: ${k}${d.chuyen ? ` | ${d.chuyen}` : ''}`)
        }
        const nguoiDien = d.ai === 'KE' || !d.loi ? `${d.dien} ` : ''
        const hd = d.hanhDong ? `[${nguoiDien}${d.hanhDong}${d.doiTuong ? ` ${d.doiTuong}` : ''}]` : d.ai === 'KE' && d.dien ? `[${d.dien} dung]` : ''
        const them = [hd, d.hieuUng && `{${d.hieuUng}}`, d.mayQuay && `(${d.mayQuay})`, d.loi && d.camXuc && d.camXuc !== 'binh_thuong' && `<${d.camXuc}>`].filter(Boolean).join(' ')
        if (!d.loi) dong.push(them)
        else dong.push(`${d.ai}${them ? ` ${them}` : ''}: ${d.loi}`)
      }
      const ten = (phim.ten.trim() || 'kich-ban').replace(/[\/:*?"<>|]+/g, '') + '.txt'
      taiVe(new Blob(['\ufeff' + dong.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }), ten)
      setXong(`Đã tải "${ten}" về thư mục Tải xuống (${r.dong.length} dòng).`)
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Lỗi, hãy thử lại')
    } finally {
      setDang(false)
    }
  }
  return (
    <section id="xuat-may" className={KHUNG}>
      <h2 className={TD}><span className={SO}>7</span>Làm phim trên máy nhà (miễn phí)</h2>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-phu">
        <li>Bấm nút dưới đây: AI chuyển bảng cảnh thành tệp kịch bản .txt và tải về.</li>
        <li>Mở thư mục Tải xuống, kéo thả tệp đó vào E:\phim-blender\LAM_PHIM.bat.</li>
        <li>Chờ máy lồng tiếng, vẽ và ghép phim. Phim .mp4 nằm cạnh tệp kịch bản.</li>
        <li>Muốn sửa lời hay hành động thì mở tệp .txt bằng Notepad sửa rồi kéo thả lại.</li>
      </ol>
      <button type="button" onClick={tai} disabled={tat || dang} className="mt-3 rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
        {dang ? 'Đang chuyển kịch bản…' : 'Tải kịch bản cho LAM_PHIM'}
      </button>
      {xong && <p className="mt-2 text-sm text-green-700">{xong}</p>}
      {loi && <p className="mt-2 text-sm text-red-600">{loi}</p>}
    </section>
  )
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
const KHUNG = 'mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm first:mt-0 sm:p-6'
const TD = 'flex items-center gap-2.5 text-lg font-bold text-slate-900'
const SO = 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-chinh text-sm font-bold text-white'

type MaAgent = 'nv' | 'kb' | 'dd' | 'bc' | 'vd'
const TEN_AGENT: Record<MaAgent, string> = { nv: 'Agent nhân vật', kb: 'Agent kịch bản', dd: 'Agent đạo diễn & khán giả YouTube', bc: 'Agent bối cảnh', vd: 'Agent câu lệnh video' }
const CA_DOI: MaAgent[] = ['nv', 'kb', 'dd', 'bc']
const moi = (ds: Omit<Canh, 'id'>[]): Canh[] => ds.map((c) => ({ id: ma(), ...c, video: null }))

function NutAgent({ ma, dang, tat, chay, nhan }: { ma: MaAgent; dang: MaAgent | null; tat: boolean; chay: () => void; nhan: string }) {
  return (
    <button type="button" onClick={chay} disabled={tat} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
      {dang === ma ? `${TEN_AGENT[ma]} đang làm…` : nhan}
    </button>
  )
}

function Muc({ so, ten, children }: { so: number; ten: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-sm font-bold">
        {so}. {ten}
      </p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  )
}

const Ds = ({ ds }: { ds: string[] }) => (ds.length ? <ul className="list-disc space-y-0.5 pl-5">{ds.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-phu">Không có.</p>)

function BaoCao({ d }: { d: DanhGia }) {
  return (
    <div className="mt-3 grid gap-3">
      <Muc so={1} ten="Đánh giá tổng thể">{d.tongThe}</Muc>
      <Muc so={2} ten="Điểm mạnh và điểm yếu">
        <p className="font-semibold text-green-700">Điểm mạnh</p>
        <Ds ds={d.diemManh} />
        <p className="mt-2 font-semibold text-red-700">Điểm yếu → biến thành điểm mạnh</p>
        {d.diemYeu.length ? (
          <ul className="space-y-2">
            {d.diemYeu.map((x, i) =>
              typeof x === 'string' ? (
                <li key={i}>{x}</li>
              ) : (
                <li key={i} className="rounded-md bg-nen p-2">
                  <p className="text-red-700">✗ {x.yeu}</p>
                  <p className="text-green-700">✓ {x.manh}</p>
                  {x.canh && <p className="text-xs text-phu">Đã áp dụng ở: {x.canh}</p>}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="text-phu">Không có.</p>
        )}
      </Muc>
      <Muc so={3} ten="Sức hút 30 giây đầu">{d.moDau}</Muc>
      <Muc so={4} ten="Khả năng giữ chân người xem">{d.giuChan}</Muc>
      <Muc so={5} ten="Đạo diễn: hình ảnh, góc máy, diễn xuất, âm thanh">{d.daoDien}</Muc>
      <Muc so={6} ten="Phân đoạn cần cắt hoặc làm lại">
        <Ds ds={d.catBo} />
      </Muc>
      <Muc so={7} ten="Sửa cụ thể theo từng cảnh (kịch bản cũ)">
        {d.suaTungCanh.length ? (
          <ul className="space-y-1">
            {d.suaTungCanh.map((x, i) => (
              <li key={i}>
                <b>Cảnh {x.so}:</b> {x.vanDe} <span className="text-chinh">→ {x.cachSua}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-phu">Không có.</p>
        )}
      </Muc>
      <Muc so={8} ten="Tiêu đề và ảnh thu nhỏ">
        <ul className="space-y-1">
          {d.tieuDe.map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="flex-1">{t}</span>
              <NutChep chu={t} />
            </li>
          ))}
        </ul>
        <p className="mt-2 font-semibold">Ý tưởng ảnh thu nhỏ</p>
        <Ds ds={d.thumbnail} />
        {d.cauMoDau && (
          <p className="mt-2">
            <b>Câu mở đầu mạnh nhất:</b> {d.cauMoDau}
          </p>
        )}
      </Muc>
      <Muc so={9} ten="Tiềm năng tiếp cận khán giả (nhận định của AI)">{d.tiemNang}</Muc>
      <Muc so={10} ten="Kế hoạch nâng cấp trước khi đăng">
        <Ds ds={d.keHoach} />
        {d.videoTiep.length > 0 && (
          <>
            <p className="mt-2 font-semibold">Ý tưởng video tiếp theo</p>
            <Ds ds={d.videoTiep} />
          </>
        )}
      </Muc>
    </div>
  )
}

export default function XuongPhim({ coAi }: { coAi: boolean }) {
  const [phim, setPhim] = useState<Phim>(MAU)
  const [anh, setAnh] = useState<Record<string, string>>({})
  const [san, setSan] = useState(false)
  const [dangAgent, setDangAgent] = useState<MaAgent | null>(null)
  const [tinAgent, setTinAgent] = useState<{ loai: 'ok' | 'loi'; chu: string } | null>(null)

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
      const nv = p.nhanVat.map((n) => ({ ten: n.ten, moTa: n.moTa, tinhCach: n.tinhCach ?? '', giong: n.giong ?? '' }))
      const phut = p.phut ?? 2
      const tongCanh = Math.max(4, Math.round((phut * 60) / 15))
      if (phut <= 2) {
        const r = await agentKichBan(p.yChinh, tongCanh, 15, nv)
        if (!r.ok) throw new Error(r.thongBao)
        boAnh(p.canh.map((c) => c.id))
        return { ...p, ten: r.ten || p.ten, canh: moi(r.canh), danhGia: null, banSua: null }
      }
      setTinAgent({ loai: 'ok', chu: `Đang lập dàn ý phim ${phut} phút…` })
      const dy = await agentDanY(p.yChinh, phut, nv)
      if (!dy.ok) throw new Error(dy.thongBao)
      const danY = dy.hoi.map((h, i) => `Hồi ${i + 1} - ${h.tieuDe}: ${h.noiDung}`).join('\n')
      const moiCanh: Canh[] = []
      const moiHoi = Math.max(3, Math.round(tongCanh / dy.hoi.length))
      for (let i = 0; i < dy.hoi.length; i++) {
        setTinAgent({ loai: 'ok', chu: `Đang viết hồi ${i + 1}/${dy.hoi.length}: ${dy.hoi[i].tieuDe}…` })
        const truoc = moiCanh.slice(-3).map((c) => `[${c.boiCanh}] ${c.hanhDong} | ${c.loi.replace(/\n/g, ' / ')}`).join('\n')
        const nguCanh = `DÀN Ý CẢ PHIM (${phut} phút):\n${danY}\n\nBẠN ĐANG VIẾT HỒI ${i + 1}/${dy.hoi.length}: ${dy.hoi[i].tieuDe} — ${dy.hoi[i].noiDung}${i === dy.hoi.length - 1 ? '\nĐây là HỒI CUỐI: khép lại câu chuyện bằng cú lật và câu chốt.' : ''}${truoc ? `\n\nCÁC CẢNH NGAY TRƯỚC (nối tiếp liền mạch):\n${truoc}` : ''}`
        let r = await agentKichBan(p.yChinh, moiHoi, 15, nv, nguCanh)
        if (!r.ok) r = await agentKichBan(p.yChinh, moiHoi, 15, nv, nguCanh)
        if (!r.ok) throw new Error(`Hồi ${i + 1}: ${r.thongBao}`)
        moiCanh.push(...moi(r.canh))
      }
      boAnh(p.canh.map((c) => c.id))
      return { ...p, ten: dy.ten || p.ten, canh: moiCanh, danhGia: null, banSua: null }
    }
    if (maAgent === 'dd') {
      // Rà từng đợt 12 cảnh cho tới hết phim; đợt nào bản sửa ngắn hụt thì giữ nguyên bản gốc của đợt đó
      const nv = p.nhanVat.map((n) => ({ ten: n.ten, moTa: n.moTa, tinhCach: n.tinhCach ?? '', giong: n.giong ?? '' }))
      const LO = 12
      let danhGia: DanhGia | null = null
      const banSua: Canh[] = []
      for (let i = 0; i < p.canh.length; i += LO) {
        const lo = p.canh.slice(i, i + LO)
        if (p.canh.length > LO) setTinAgent({ loai: 'ok', chu: `Đạo diễn đang rà cảnh ${i + 1}-${i + lo.length} / ${p.canh.length}…` })
        let r = await agentDaoDien(p.giay, p.ten, lo.map((c) => ({ boiCanh: c.boiCanh ?? '', nhanVat: c.nhanVat ?? nhanVatTrongCanh(p, c).map((n) => n.ten), viTri: c.viTri ?? '', hanhDong: c.hanhDong ?? '', loi: c.loi, hinh: c.hinh })), nv)
        if (!r.ok) r = await agentDaoDien(p.giay, p.ten, lo.map((c) => ({ boiCanh: c.boiCanh ?? '', nhanVat: c.nhanVat ?? nhanVatTrongCanh(p, c).map((n) => n.ten), viTri: c.viTri ?? '', hanhDong: c.hanhDong ?? '', loi: c.loi, hinh: c.hinh })), nv)
        if (!r.ok) throw new Error(`Cảnh ${i + 1}-${i + lo.length}: ${r.thongBao}`)
        danhGia = danhGia ?? r.danhGia
        banSua.push(...(r.canh.length >= Math.ceil(lo.length * 0.8) ? moi(r.canh) : lo))
      }
      return { ...p, danhGia, banSua: banSua.length >= p.canh.length * 0.8 ? banSua : null }
    }
    if (maAgent === 'bc') {
      const ten = p.canh.map((c) => c.boiCanh ?? '').filter(Boolean)
      const r = await agentBoiCanh(p.phongCach, ten, p.boiCanh, p.canh.map((c) => c.hanhDong || c.hinh))
      if (!r.ok) throw new Error(r.thongBao)
      return { ...p, boiCanh: r.boiCanh }
    }
    const r = await agentVideo(
      p.giay,
      p.canh.map((c) => ({ boiCanh: c.boiCanh ?? '', nhanVat: c.nhanVat ?? nhanVatTrongCanh(p, c).map((n) => n.ten), viTri: c.viTri ?? '', hanhDong: c.hanhDong ?? '', loi: c.loi, hinh: c.hinh })),
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
        // Chạy cả đội: kịch bản đã sửa của agent đạo diễn được dùng luôn cho các agent sau
        if (m === 'dd' && ds.length > 1 && p.banSua && p.banSua.length >= p.canh.length * 0.8) p = apDung(p)
        setPhim(p)
        xong++
      }
      setTinAgent({ loai: 'ok', chu: ds.length > 1 ? 'Cả đội đã làm xong. Kéo xuống mục 6 và 7 để thêm đạo cụ và tải kịch bản về máy.' : `${TEN_AGENT[ds[0]]} đã làm xong.` })
    } catch (e) {
      const ten = TEN_AGENT[ds[xong]]
      setTinAgent({ loai: 'loi', chu: `${ten} gặp lỗi: ${e instanceof Error ? e.message : 'không gọi được AI'}.${xong ? ' Các agent trước đã làm xong, bấm lại nút của agent này để làm tiếp.' : ''}` })
    } finally {
      setDangAgent(null)
    }
  }

  function apDung(p: Phim): Phim {
    if (!p.banSua?.length) return p
    boAnh(p.canh.map((c) => c.id))
    return { ...p, canh: p.banSua, banSua: null }
  }

  function apDungBanSua() {
    if (phim.canh.some((c) => anh[c.id]) && !confirm('Dùng kịch bản đã sửa thay cho kịch bản hiện tại? Ảnh đã tải lên các cảnh cũ sẽ bị bỏ.')) return
    setPhim((x) => apDung(x))
  }

  function mauMoi() {
    if (!confirm('Xóa bảng cảnh, bối cảnh và ảnh đang có để làm mẩu chuyện mới? (Nhân vật và phong cách được giữ lại)')) return
    boAnh(phim.canh.map((c) => c.id))
    setPhim((x) => ({ ...x, ten: '', yChinh: '', boiCanh: [], danhGia: null, banSua: null, canh: [{ id: ma(), loi: '', hinh: '' }] }))
  }


  if (!san) return <p className="mt-6 animate-pulse text-sm text-phu">Đang mở bài làm dở…</p>

  const ban = !!dangAgent
  const tatAi = ban || !coAi
  const tenBoiCanh = [...new Set([...phim.boiCanh.map((b) => b.ten), ...phim.canh.map((c) => c.boiCanh ?? '')].map((t) => t.trim()).filter(Boolean))]

  return (
    <div>
      {/* 1. Câu chuyện + đội agent */}
      <section id="cau-chuyen" className={KHUNG}>
        <h2 className={TD}><span className={SO}>1</span>Câu chuyện</h2>
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
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Độ dài phim</span>
              <span className="rounded-full bg-chinh px-3 py-0.5 text-sm font-bold text-white">{phim.phut ?? 2} phút</span>
            </div>
            <input type="range" min={1} max={15} step={1} value={phim.phut ?? 2} onChange={(e) => sua({ phut: Number(e.target.value) })} disabled={ban} className="mt-2 w-full accent-[var(--color-chinh)]" />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[1, 2, 3, 5, 8, 10, 15].map((n) => (
                <button key={n} type="button" onClick={() => sua({ phut: n })} disabled={ban} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${(phim.phut ?? 2) === n ? 'border-chinh bg-chinh text-white' : 'border-slate-300 bg-white hover:border-chinh'}`}>
                  {n} phút
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-phu">
              Khoảng {Math.max(4, Math.round(((phim.phut ?? 2) * 60) / 15))} cảnh.{(phim.phut ?? 2) > 2 ? ` Phim dài: AI lập dàn ý ${Math.min(10, Math.max(2, Math.round((phim.phut ?? 2) / 1.5)))} hồi rồi viết từng hồi nối tiếp.` : ''} Máy nhà xuất phim mất khoảng {Math.round((phim.phut ?? 2) * 6)} phút.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-nen p-3">
          <p className="text-sm font-semibold">Đội agent</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-phu">
            <li>Agent nhân vật: thiết kế ngoại hình, tính cách, giọng nói của từng nhân vật.</li>
            <li>Agent kịch bản: phim dài thì lập dàn ý chia hồi trước, rồi viết từng cảnh có lời thoại và hành động.</li>
            <li>Agent đạo diễn & khán giả YouTube: chấm kịch bản theo 10 mục, biến từng điểm yếu thành điểm mạnh và viết lại bản đã sửa.</li>
            <li>Agent bối cảnh: tả từng nơi chốn của câu chuyện.</li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => chayAgent(CA_DOI)}
              disabled={tatAi}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {dangAgent ? `${TEN_AGENT[dangAgent]} đang làm…` : 'Chạy cả đội (4 agent)'}
            </button>
            <button type="button" onClick={mauMoi} disabled={ban} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-white disabled:opacity-50">
              Làm mẩu mới
            </button>
          </div>
          <p className="mt-2 text-xs text-phu">Cả đội chạy khoảng 2-3 phút (phim dài lâu hơn vì viết từng hồi). Khi chạy cả đội, kịch bản đã sửa của agent đạo diễn được dùng luôn. Mỗi agent cũng có nút riêng ở mục của nó để làm lại phần đó.</p>
          {tinAgent && <p className={`mt-2 text-sm ${tinAgent.loai === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{tinAgent.chu}</p>}
        </div>
        {!coAi && <p className="mt-2 text-xs text-amber-700">Trang chưa cài khóa Gemini nên các agent chưa chạy được. Bạn vẫn tự gõ các mục bên dưới được.</p>}
      </section>

      {/* 2. Nhân vật */}
      <section id="nhan-vat" className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={TD}><span className={SO}>2</span>Nhân vật</h2>
          <NutAgent ma="nv" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['nv'])} nhan="Agent nhân vật" />
        </div>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Phong cách chung
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
      <section id="kich-ban" className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={TD}><span className={SO}>3</span>Kịch bản <span className="text-sm font-medium text-phu">({phim.canh.length} cảnh)</span></h2>
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
                    Vị trí trên màn hình (ai bên trái, ai bên phải)
                    <input value={c.viTri ?? ''} maxLength={200} onChange={(e) => suaCanh(c.id, { viTri: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Hành động
                    <textarea value={c.hanhDong ?? ''} rows={2} maxLength={500} onChange={(e) => suaCanh(c.id, { hanhDong: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Lời thoại
                    <textarea value={c.loi} rows={2} maxLength={600} onChange={(e) => suaCanh(c.id, { loi: e.target.value })} className={`${O} font-normal`} />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Hình ảnh cảnh (ai ở đâu, làm gì)
                    <textarea value={c.hinh} rows={2} maxLength={600} onChange={(e) => suaCanh(c.id, { hinh: e.target.value })} className={`${O} font-normal`} />
                  </label>
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

      {/* 4. Đạo diễn & khán giả YouTube */}
      <section id="dao-dien" className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={TD}><span className={SO}>4</span>Đạo diễn & khán giả YouTube</h2>
          <NutAgent ma="dd" dang={dangAgent} tat={tatAi} chay={() => chayAgent(['dd'])} nhan="Agent đạo diễn chấm kịch bản" />
        </div>
        <p className="mt-1 text-xs text-phu">Chấm kịch bản như một đạo diễn và một người xem YouTube khó tính, biến từng điểm yếu thành điểm mạnh, rồi viết lại bản đã sửa để bạn chọn dùng hay không. Dùng bản sửa xong có thể bấm chấm lại để xem còn điểm yếu nào.</p>
        {phim.banSua?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm">
            <span className="font-semibold text-amber-900">Có kịch bản đã sửa ({phim.banSua.length} cảnh).</span>
            <button type="button" onClick={apDungBanSua} disabled={ban} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
              Dùng kịch bản đã sửa
            </button>
            <button type="button" onClick={() => sua({ banSua: null })} disabled={ban} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
              Giữ kịch bản cũ
            </button>
          </div>
        ) : null}
        {phim.danhGia ? <BaoCao d={phim.danhGia} /> : <p className="mt-3 text-sm text-phu">Chưa chấm. Viết xong kịch bản rồi bấm nút ở trên.</p>}
      </section>

      {/* 5. Bối cảnh */}
      <section id="boi-canh" className={KHUNG}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={TD}><span className={SO}>5</span>Bối cảnh <span className="text-sm font-medium text-phu">({phim.boiCanh.length})</span></h2>
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

      <XuongDaoCu tat={tatAi} phim={phim} />
      <OLamPhimMay phim={phim} tat={tatAi} />

    </div>
  )
}
