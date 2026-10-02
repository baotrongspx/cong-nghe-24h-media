// Biểu tượng nét mảnh (kiểu Lucide), dùng chung cho trang Đăng nhóm
type P = { className?: string }

function Svg({ className = 'h-4 w-4', children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {children}
    </svg>
  )
}

export const ICong = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IXuong = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
export const ITim = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)
export const IXoa = (p: P) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </Svg>
)
export const IGui = (p: P) => (
  <Svg {...p}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
  </Svg>
)
export const IChiaSe = (p: P) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </Svg>
)
export const IXong = (p: P) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)
export const IChep = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
)
export const IPhat = (p: P) => (
  <Svg {...p}>
    <path d="M6 4l14 8-14 8V4Z" />
  </Svg>
)
export const INhom = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3" />
  </Svg>
)
export const ICanhBao = (p: P) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01" />
  </Svg>
)
export const IMoNgoai = (p: P) => (
  <Svg {...p}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
)

// Ảnh đại diện chữ cái đầu, màu cố định theo tên nhóm
const MAU = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700']
export function ChuCaiDau({ ten, className = 'h-9 w-9 text-sm' }: { ten: string; className?: string }) {
  const chu = ten.trim().match(/\p{L}|\p{N}/u)?.[0]?.toUpperCase() ?? '#'
  let h = 0
  for (const c of ten) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return <span className={`grid shrink-0 place-items-center rounded-lg font-semibold ${MAU[h % MAU.length]} ${className}`}>{chu}</span>
}

// Thanh tiến độ mảnh
export function ThanhTienDo({ phan, mau = 'bg-chinh' }: { phan: number; mau?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${mau}`} style={{ width: `${Math.min(100, Math.max(0, phan * 100))}%` }} />
    </div>
  )
}
