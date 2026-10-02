'use client'

import { useTransition } from 'react'

// Nút / công tắc gọi server action, có hỏi xác nhận nếu cần
export function NutHanhDong({
  chay,
  children,
  xacNhan,
  className,
}: {
  chay: () => Promise<unknown>
  children: React.ReactNode
  xacNhan?: string
  className?: string
}) {
  const [dang, batDau] = useTransition()
  return (
    <button
      type="button"
      disabled={dang}
      onClick={() => {
        if (!xacNhan || confirm(xacNhan)) batDau(async () => void (await chay()))
      }}
      className={`disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function CongTac({ bat, chay, nhan }: { bat: boolean; chay: (bat: boolean) => Promise<unknown>; nhan: string }) {
  const [dang, batDau] = useTransition()
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span>{nhan}</span>
      <button
        type="button"
        role="switch"
        aria-checked={bat}
        aria-label={nhan}
        disabled={dang}
        onClick={() => batDau(async () => void (await chay(!bat)))}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${bat ? 'bg-chinh' : 'bg-slate-300'} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${bat ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
