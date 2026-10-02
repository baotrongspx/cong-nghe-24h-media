import BangGia from '@/app/BangGia'
import { batBuocDangNhap } from '@/lib/phien'
import { soZalo } from '@/lib/thongTin'

const ngay = (s: string) => new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

export default async function GoiCuocCuaToi() {
  const { nguoiDung, goi, daHet, trangIds } = await batBuocDangNhap()
  const zalo = soZalo()
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Gói cước</h1>
        <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <div>
            <p className="text-sm text-phu">Gói đang dùng</p>
            <p className="text-xl font-bold">{goi.ten}</p>
          </div>
          <div>
            <p className="text-sm text-phu">Hạn sử dụng</p>
            <p className={`text-xl font-bold ${daHet ? 'text-red-600' : ''}`}>
              {nguoiDung.het_han ? `${daHet ? 'Đã hết hạn ' : ''}${ngay(nguoiDung.het_han)}` : 'Không giới hạn'}
            </p>
          </div>
          <div>
            <p className="text-sm text-phu">Fanpage đang quản lý</p>
            <p className="text-xl font-bold">
              {trangIds.length}/{goi.soTrang}
            </p>
          </div>
        </div>
        {daHet && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Gói trả phí đã hết hạn nên tài khoản tạm về gói Miễn phí. Liên hệ để gia hạn.
          </p>
        )}
        <p className="mt-6 text-phu">
          Trong giai đoạn ra mắt, các gói trả phí chưa mở bán. Cần quản lý nhiều Page hơn?{' '}
          {zalo ? (
            <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener" className="font-semibold text-chinh hover:underline">
              Nhắn Zalo cho chúng tôi
            </a>
          ) : (
            'Liên hệ chúng tôi'
          )}{' '}
          để được nâng gói.
        </p>
        <div className="mt-8">
          <BangGia goiHienTai={goi.ma} nutChinh={{ nhan: 'Dùng gói này', href: '/quan-ly' }} />
        </div>
      </div>
    </div>
  )
}
