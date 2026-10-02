// Thông tin hiển thị trên trang. Số Zalo / email đặt trong biến môi trường (Vercel) để đổi mà không cần sửa code.
export const TEN = 'Công Nghệ 24H Media'
export const MO_TA =
  'Dịch vụ chăm sóc Fanpage, Zalo OA và TikTok cho doanh nghiệp: lên lịch nội dung, đăng bài, trả lời khách và báo cáo hằng tháng.'

export const soZalo = () => (process.env.SO_ZALO ?? '').replace(/\D/g, '')
export const email = () => process.env.EMAIL_LIEN_HE ?? ''
export const diaChiWeb = () => process.env.DIA_CHI_WEB ?? 'http://localhost:3000'

export type Goi = { ma: string; ten: string; danhCho: string; gom: string[]; noiBat?: boolean }

export const GOI: Goi[] = [
  {
    ma: 'page',
    ten: 'Chăm sóc Fanpage',
    danhCho: 'Cửa hàng, doanh nghiệp nhỏ mới bắt đầu bán hàng trên Facebook',
    gom: [
      'Lên kế hoạch nội dung theo tháng',
      'Viết bài, thiết kế ảnh, đăng theo lịch',
      'Trả lời bình luận và tin nhắn trong giờ làm việc',
      'Báo cáo số liệu cuối tháng',
    ],
  },
  {
    ma: 'page_zalo',
    ten: 'Fanpage + Zalo OA',
    danhCho: 'Doanh nghiệp muốn giữ chân khách cũ và nhắc khách quay lại',
    gom: [
      'Toàn bộ gói Chăm sóc Fanpage',
      'Thiết lập và vận hành Zalo OA',
      'Gửi tin chăm sóc, khuyến mãi tới người quan tâm',
      'Gom tin nhắn hai kênh về một đầu mối',
    ],
    noiBat: true,
  },
  {
    ma: 'da_kenh',
    ten: 'Trọn gói đa kênh',
    danhCho: 'Thương hiệu cần có mặt trên Facebook, Zalo và TikTok',
    gom: [
      'Toàn bộ gói Fanpage + Zalo OA',
      'Kịch bản và đăng video TikTok',
      'Cổng khách hàng: xem lịch, duyệt bài, xem báo cáo',
      'Họp đánh giá và điều chỉnh mỗi tháng',
    ],
  },
]
