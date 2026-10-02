'use client'

import { useRouter } from 'next/navigation'

export default function ChonBai({ bai, dangChon }: { bai: { id: string; tieuDe: string }[]; dangChon?: string }) {
  const router = useRouter()
  return (
    <select
      value={dangChon}
      onChange={(e) => router.push(`/quan-ly/dang-nhom?bai=${e.target.value}`)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
    >
      {bai.map((b) => (
        <option key={b.id} value={b.id}>
          {b.tieuDe}
        </option>
      ))}
    </select>
  )
}
