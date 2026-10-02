import { GOI_CUOC, giaHienThi, type MaGoi } from '@/lib/goiCuoc'

// Bảng giá dùng chung cho trang chủ và trang Gói cước trong phần quản lý
export default function BangGia({ goiHienTai, nutChinh }: { goiHienTai?: MaGoi; nutChinh: { nhan: string; href: string } }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {GOI_CUOC.map((g) => {
        const dangDung = g.ma === goiHienTai
        return (
          <div
            key={g.ma}
            className={`relative flex flex-col rounded-2xl bg-white p-6 ${
              g.noiBat ? 'border-2 border-chinh shadow-xl shadow-blue-900/10' : 'border border-slate-200'
            }`}
          >
            {(g.noiBat || dangDung) && (
              <span className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white ${dangDung ? 'bg-green-600' : 'bg-chinh'}`}>
                {dangDung ? 'Đang dùng' : 'Phổ biến'}
              </span>
            )}
            <h3 className="text-lg font-bold">{g.ten}</h3>
            <p className="mt-1 min-h-10 text-sm text-phu">{g.danhCho}</p>
            <p className={`mt-4 text-2xl font-extrabold ${g.gia === null ? 'text-phu' : 'text-chinh-dam'}`}>{giaHienThi(g)}</p>
            <ul className="mt-5 grid flex-1 content-start gap-2.5 text-sm">
              {g.tinhNang.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-chinh">✔</span>
                  {x}
                </li>
              ))}
            </ul>
            {g.gia === 0 ? (
              <a
                href={nutChinh.href}
                className={`mt-6 rounded-lg px-4 py-2.5 text-center font-semibold ${dangDung ? 'border border-slate-300 text-phu' : 'bg-nhan text-white hover:brightness-105'}`}
              >
                {dangDung ? 'Gói hiện tại' : nutChinh.nhan}
              </a>
            ) : (
              <span className="mt-6 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-phu">
                {dangDung ? 'Gói hiện tại' : 'Liên hệ để dùng sớm'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
