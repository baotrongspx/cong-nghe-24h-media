// Khung xương hiện ngay khi chuyển mục, trong lúc máy chủ đang lấy dữ liệu
export default function KhungCho() {
  return (
    <div className="h-full overflow-y-auto" aria-busy="true" aria-label="Đang tải">
      <div className="mx-auto max-w-5xl animate-pulse space-y-4 px-4 py-8">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  )
}
