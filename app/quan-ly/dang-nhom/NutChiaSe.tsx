'use client'

import { moCuaSoFacebook } from './moCuaSo'

// Nút mở hộp thoại Chia sẻ của Facebook trong cửa sổ phụ cố định
export default function NutChiaSe({ link, children, className }: { link: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => moCuaSoFacebook(link)} className={className}>
      {children}
    </button>
  )
}
