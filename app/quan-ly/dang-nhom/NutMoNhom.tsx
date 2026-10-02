'use client'

import { useState, useTransition } from 'react'
import { danhDauDaDangNhom } from '../dang-bai/actions'

// Chép nội dung bài + mở nhóm ở tab mới; người dùng tự dán và bấm Đăng trên Facebook, rồi đánh dấu đã đăng
export default function NutMoNhom({ link, noiDung, nhomId, baiId }: { link: string; noiDung: string; nhomId: string; baiId: string }) {
  const [daMo, setDaMo] = useState(false)
  const [dang, chay] = useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(noiDung).catch(() => {})
          window.open(link, '_blank', 'noopener')
          setDaMo(true)
        }}
        className="rounded-md bg-chinh px-3 py-1.5 text-sm font-semibold text-white hover:bg-chinh-dam"
      >
        Chép bài & mở nhóm
      </button>
      {daMo && (
        <button
          type="button"
          disabled={dang}
          onClick={() => chay(() => danhDauDaDangNhom(nhomId, baiId))}
          className="rounded-md border border-green-600 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          ✓ Đã đăng
        </button>
      )}
    </div>
  )
}
