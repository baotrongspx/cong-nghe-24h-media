'use client'

// XƯỞNG ĐẠO CỤ: Gemini vẽ đạo cụ 2D bằng nét hình học → xem trước ngay → chọn món đạt → tải tệp .json
// Tệp tải về được nạp vào thư viện máy (E:\phim-blender\lam_phim\nhap_do.py).
import { useEffect, useState } from 'react'
import { agentVeDaoCu, type DaoCuMoi, type NetVe } from './actions'
import { DAO_CU_2D } from './danhMuc2d'

const KHOA = 'xuong-dao-cu-v1'
const GOI_Y = `Nội thất: bình hoa, tủ giày, gương soi, bàn trang điểm, quạt điện, nồi cơm điện, ấm siêu tốc
Công nghệ: máy in, loa, tai nghe, đồng hồ thông minh, máy chiếu, bộ đàm
Văn phòng: kéo, ghim bấm, lịch để bàn, máy tính cầm tay, con dấu
Ăn uống: tô phở, đĩa cơm tấm, ly sinh tố, bánh kem, nồi lẩu, đôi đũa
Lao động: cờ lê, cưa, xẻng, thang, xô sơn, mỏ hàn
Giao thông: xe buýt, xe tải, xích lô, thuyền, máy bay, tàu hỏa
Lịch sử: đèn dầu, quạt mo, nón lá, gánh hàng, trống đồng, kiếm gỗ
Động vật: con mèo, con chó, con gà, con trâu, con cá, con chim
Thực vật: cây chuối, khóm tre, cây xương rồng, bó lúa, hoa sen
Đặc biệt: cây đũa phép, quả cầu pha lê, bản đồ kho báu, chìa khóa vàng, viên ngọc`

// Vẽ một nét thành SVG (trục z hướng lên → lật dọc)
function Net({ n }: { n: NetVe }) {
  const s = n.so
  const nen = { fill: n.mau, stroke: n.vien ? '#141414' : 'none', strokeWidth: 0.05, strokeLinejoin: 'round' as const }
  const diem = () => s.reduce<string[]>((a, v, i) => (i % 2 ? [...a.slice(0, -1), `${a[a.length - 1]},${-v}`] : [...a, `${v}`]), []).join(' ')
  if (n.k === 'r') return <rect x={Math.min(s[0], s[2])} y={-Math.max(s[1], s[3])} width={Math.abs(s[2] - s[0])} height={Math.abs(s[3] - s[1])} {...nen} />
  if (n.k === 'e') return <ellipse cx={s[0]} cy={-s[1]} rx={Math.abs(s[2])} ry={Math.abs(s[3])} {...nen} />
  if (n.k === 'l')
    return (
      <g>
        {n.vien && <line x1={s[0]} y1={-s[1]} x2={s[2]} y2={-s[3]} stroke="#141414" strokeWidth={s[4] * 2 + 0.1} strokeLinecap="round" />}
        <line x1={s[0]} y1={-s[1]} x2={s[2]} y2={-s[3]} stroke={n.mau} strokeWidth={s[4] * 2} strokeLinecap="round" />
      </g>
    )
  return <polygon points={diem()} {...nen} />
}

function XemTruoc({ d }: { d: DaoCuMoi }) {
  const xs: number[] = []
  const zs: number[] = []
  for (const n of d.hinh) {
    const s = n.so
    if (n.k === 'e') {
      xs.push(s[0] - s[2], s[0] + s[2])
      zs.push(s[1] - s[3], s[1] + s[3])
    } else if (n.k === 'l') {
      xs.push(s[0] - s[4], s[2] + s[4], s[0] + s[4], s[2] - s[4])
      zs.push(s[1] - s[4], s[3] + s[4], s[1] + s[4], s[3] - s[4])
    } else s.forEach((v, i) => (i % 2 ? zs : xs).push(v))
  }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs)
  const le = Math.max(x1 - x0, z1 - z0) * 0.08 + 0.1
  return (
    <svg viewBox={`${x0 - le} ${-z1 - le} ${x1 - x0 + 2 * le} ${z1 - z0 + 2 * le}`} className="h-28 w-full">
      {d.hinh.map((n, i) => <Net key={i} n={n} />)}
    </svg>
  )
}

export default function XuongDaoCu({ tat }: { tat: boolean }) {
  const [chu, setChu] = useState('')
  const [ds, setDs] = useState<(DaoCuMoi & { chon: boolean })[]>([])
  const [dang, setDang] = useState('')
  const [loi, setLoi] = useState('')

  useEffect(() => {
    try {
      const cu = JSON.parse(localStorage.getItem(KHOA) ?? 'null')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cu?.ds) setDs(cu.ds)
      if (cu?.chu) setChu(cu.chu)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(KHOA, JSON.stringify({ ds, chu }))
    } catch {}
  }, [ds, chu])

  async function ve() {
    const mon = chu.split(/[\n,;]+/).map((x) => x.replace(/^[^:]*:\s*/, '').trim()).filter((x) => x.length > 1)
    const daCo = new Set([...Object.keys(DAO_CU_2D), ...ds.map((d) => d.ma)])
    if (!mon.length) return setLoi('Hãy gõ tên các đạo cụ, cách nhau bằng dấu phẩy hoặc xuống dòng')
    setLoi('')
    let xong = 0
    for (let i = 0; i < mon.length; i += 6) {
      setDang(`Gemini đang vẽ ${Math.min(i + 6, mon.length)}/${mon.length}…`)
      const r = await agentVeDaoCu(mon.slice(i, i + 6))
      if (!r.ok) {
        setLoi(r.thongBao)
        continue
      }
      const moi = r.daoCu.filter((d) => !daCo.has(d.ma))
      moi.forEach((d) => daCo.add(d.ma))
      xong += moi.length
      setDs((x) => [...x, ...moi.map((d) => ({ ...d, chon: true }))])
    }
    setDang(`Đã vẽ xong ${xong} món. Bỏ chọn món xấu rồi bấm Tải bộ đạo cụ.`)
  }

  async function veLai(i: number) {
    const d = ds[i]
    setDang(`Đang vẽ lại ${d.ten}…`)
    const r = await agentVeDaoCu([`${d.ten} (vẽ lại đẹp hơn, rõ hình hơn)`])
    if (r.ok && r.daoCu[0]) setDs((x) => x.map((y, j) => (j === i ? { ...r.daoCu[0], ma: d.ma, chon: true } : y)))
    else if (!r.ok) setLoi(r.thongBao)
    setDang('')
  }

  function tai() {
    const chon = ds.filter((d) => d.chon).map((d) => ({ ma: d.ma, ten: d.ten, nhom: d.nhom, cam: d.cam, thoiDai: d.thoiDai, noi: d.noi, hinh: d.hinh }))
    if (!chon.length) return setLoi('Chưa chọn món nào')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ loai: 'xuong-dao-cu', phien_ban: 1, dao_cu: chon }, null, 1)], { type: 'application/json' }))
    a.download = `xuong-dao-cu-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
    a.click()
    setDang(`Đã tải ${chon.length} món về thư mục Tải xuống. Báo Claude "lấy đạo cụ về" để nạp vào thư viện máy.`)
  }

  const soChon = ds.filter((d) => d.chon).length
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">Xưởng đạo cụ (Gemini vẽ)</h2>
      <p className="mt-1 text-xs text-phu">
        Gõ tên đạo cụ cần thêm (phẩy hoặc xuống dòng). Gemini vẽ theo đúng nét của xưởng phim, xem trước ngay bên dưới. Bỏ chọn món xấu hoặc bấm Vẽ lại, rồi tải bộ đạo cụ về. Thư viện hiện có {Object.keys(DAO_CU_2D).length} món.
      </p>
      <textarea value={chu} onChange={(e) => setChu(e.target.value)} rows={5} placeholder={GOI_Y} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={ve} disabled={tat || !!dang.match(/đang/i)} className="rounded-lg bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
          Gemini vẽ đạo cụ
        </button>
        <button type="button" onClick={() => setChu(GOI_Y)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">
          Dùng danh sách gợi ý ({GOI_Y.split(/[\n,]+/).length} món)
        </button>
        <button type="button" onClick={tai} disabled={!soChon} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          Tải bộ đạo cụ ({soChon} món)
        </button>
        {ds.length > 0 && (
          <button type="button" onClick={() => confirm('Xóa hết các món đã vẽ trên trang?') && setDs([])} className="text-xs text-red-600 hover:underline">
            Xóa hết
          </button>
        )}
      </div>
      {dang && <p className="mt-2 text-sm text-green-700">{dang}</p>}
      {loi && <p className="mt-2 text-sm text-red-600">{loi}</p>}
      {ds.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {ds.map((d, i) => (
            <li key={d.ma + i} className={`rounded-lg border p-2 ${d.chon ? 'border-chinh bg-white' : 'border-slate-200 bg-slate-50 opacity-50'}`}>
              <XemTruoc d={d} />
              <label className="mt-1 flex items-center gap-1 text-xs font-semibold">
                <input type="checkbox" checked={d.chon} onChange={(e) => setDs((x) => x.map((y, j) => (j === i ? { ...y, chon: e.target.checked } : y)))} />
                {d.ten}
              </label>
              <div className="flex items-center justify-between text-[11px] text-phu">
                <span>{d.ma}{d.cam ? ' · cầm được' : ''}</span>
                <button type="button" onClick={() => veLai(i)} disabled={tat} className="text-chinh hover:underline disabled:opacity-50">Vẽ lại</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
