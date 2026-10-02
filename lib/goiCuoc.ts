// Phần mềm quản lý Fanpage bán cho khách. Sửa giá / giới hạn tại đây.
export const TEN_PHAN_MEM = '24H Page'
export const MO_TA_PHAN_MEM =
  'Phần mềm quản lý bán hàng Fanpage: gom tin nhắn và bình luận của mọi Page về một hộp thư, tự ẩn bình luận có số điện thoại, trả lời tự động, mẫu câu, gắn thẻ khách.'

export type MaGoi = 'mien_phi' | 'co_ban' | 'chuyen_nghiep' | 'doanh_nghiep'

export type GoiCuoc = {
  ma: MaGoi
  ten: string
  gia: number | null // đồng / tháng; null = chưa bán (hiện "Sắp ra mắt")
  soTrang: number // số Page được quản lý cùng lúc
  danhCho: string
  tinhNang: string[]
  noiBat?: boolean
}

export const GOI_CUOC: GoiCuoc[] = [
  {
    ma: 'mien_phi',
    ten: 'Miễn phí',
    gia: 0,
    soTrang: 3,
    danhCho: 'Shop nhỏ mới bắt đầu bán trên Facebook',
    tinhNang: ['Tối đa 3 Fanpage', 'Hộp thư chung tin nhắn + bình luận', 'Tự ẩn bình luận có SĐT', 'Mẫu câu, gắn thẻ khách', 'Tự trả lời theo từ khóa'],
  },
  {
    ma: 'co_ban',
    ten: 'Cơ bản',
    gia: null,
    soTrang: 5,
    danhCho: 'Shop đang bán đều, có vài Page',
    tinhNang: ['Tối đa 5 Fanpage', 'Toàn bộ tính năng gói Miễn phí', 'Hỗ trợ qua Zalo trong giờ hành chính'],
  },
  {
    ma: 'chuyen_nghiep',
    ten: 'Chuyên nghiệp',
    gia: null,
    soTrang: 15,
    danhCho: 'Shop chạy quảng cáo nhiều, lượng tin lớn',
    tinhNang: ['Tối đa 15 Fanpage', 'Toàn bộ tính năng gói Cơ bản', 'Hỗ trợ ưu tiên, cài đặt giúp'],
    noiBat: true,
  },
  {
    ma: 'doanh_nghiep',
    ten: 'Doanh nghiệp',
    gia: null,
    soTrang: 100,
    danhCho: 'Hệ thống nhiều chi nhánh, nhiều Page',
    tinhNang: ['Tối đa 100 Fanpage', 'Toàn bộ tính năng gói Chuyên nghiệp', 'Hỗ trợ riêng 1-1'],
  },
]

// Tài khoản mới đăng ký nhận gói này
export const GOI_MAC_DINH: MaGoi = 'mien_phi'

export const timGoi = (ma: string | null | undefined) => GOI_CUOC.find((g) => g.ma === ma) ?? GOI_CUOC[0]

// Gói đã hết hạn thì quay về gói mặc định
export function goiHieuLuc(nd: { goi: string | null; het_han: string | null }) {
  const daHet = nd.het_han ? new Date(nd.het_han).getTime() < Date.now() : false
  return { goi: timGoi(daHet ? GOI_MAC_DINH : nd.goi), daHet }
}

export const giaHienThi = (g: GoiCuoc) =>
  g.gia === null ? 'Sắp ra mắt' : g.gia === 0 ? 'Miễn phí' : `${g.gia.toLocaleString('vi-VN')}đ/tháng`
