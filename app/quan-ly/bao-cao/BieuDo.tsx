// Biểu đồ cột dựng bằng HTML/CSS (không cần thư viện). Rê chuột vào cột để xem số liệu.
// Màu theo bảng màu biểu đồ: xanh = chuỗi 1, cam = chuỗi 2. Chữ luôn dùng màu chữ, không dùng màu dữ liệu.

export const MAU_1 = '#2a78d6'
export const MAU_2 = '#eb6834'

export type Cot = { nhan: string; nhanDai: string; gt: number[]; chuThich?: string }

// Mốc trục tròn số: 0, nửa, đỉnh
function dinhDep(max: number) {
  if (max <= 0) return 4
  const mu = 10 ** Math.floor(Math.log10(max))
  for (const b of [1, 2, 2.5, 4, 5, 10]) if (b * mu >= max) return b * mu
  return 10 * mu
}

const so = (n: number) => n.toLocaleString('vi-VN')

export function ChuGiai({ muc }: { muc: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-phu">
      {muc.map(([mau, ten]) => (
        <span key={ten} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: mau }} />
          {ten}
        </span>
      ))}
    </div>
  )
}

// Cột (chồng nếu nhiều chuỗi). mau[i] là màu chuỗi i, chuỗi đầu nằm sát trục.
export function BieuDoCot({
  cot,
  mau,
  tenChuoi,
  dinhDang = so,
  cao = 180,
  moiNhan = 1,
}: {
  cot: Cot[]
  mau: string[]
  tenChuoi: string[]
  dinhDang?: (n: number) => string
  cao?: number
  moiNhan?: number // hiện nhãn trục ngang mỗi n cột
}) {
  const dinh = dinhDep(Math.max(0, ...cot.map((c) => c.gt.reduce((s, x) => s + x, 0))))
  const moc = [dinh, dinh / 2, 0]
  return (
    <div className="flex gap-2">
      {/* Trục dọc */}
      <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-phu" style={{ height: cao }}>
        {moc.map((m) => (
          <span key={m} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - m / dinh) * 100}%` }}>
            {dinhDang(m)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: cao }}>
          {moc.map((m) => (
            <div key={m} className="absolute inset-x-0 border-t border-slate-200" style={{ top: `${(1 - m / dinh) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {cot.map((c, i) => {
              const tong = c.gt.reduce((s, x) => s + x, 0)
              const cuoi = c.gt.findLastIndex((x) => x > 0)
              return (
                // Cả khoảng cột là vùng rê chuột (lớn hơn cột)
                <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  <div className="flex w-full max-w-6 flex-col-reverse gap-[2px]" style={{ height: `${(tong / dinh) * 100}%` }}>
                    {c.gt.map((x, j) =>
                      x > 0 ? (
                        <div
                          key={j}
                          className={`w-full transition-opacity group-hover:opacity-80 ${j === cuoi ? 'rounded-t' : ''}`}
                          style={{ height: `${(x / tong) * 100}%`, minHeight: 2, background: mau[j] }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block ${
                      i < cot.length / 4 ? 'left-0' : i > (cot.length * 3) / 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    }`}
                  >
                    <p className="font-semibold">{c.nhanDai}</p>
                    {c.gt.map((x, j) => (
                      <p key={j} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm" style={{ background: mau[j] }} />
                        {tenChuoi[j]}: <b className="tabular-nums">{dinhDang(x)}</b>
                      </p>
                    ))}
                    {c.chuThich && <p className="text-slate-300">{c.chuThich}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Trục ngang */}
        <div className="mt-1.5 flex gap-[2px] text-[11px] text-phu">
          {cot.map((c, i) => (
            <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
              {i % moiNhan === 0 ? c.nhan : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
