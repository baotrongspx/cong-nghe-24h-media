// Tự động trả lời: dùng được cả phía máy chủ lẫn trình duyệt (không chứa bí mật).

export type ApDung = 'ca_hai' | 'tin_nhan' | 'binh_luan'

export type KichBan = {
  id: string
  trang_id: string
  tu_khoa: string[] // rỗng = trả lời mọi tin / bình luận không khớp từ khóa nào
  tra_loi: string // trả lời tin nhắn + trả lời công khai dưới bình luận
  nhan_rieng?: string // bình luận: nhắn riêng vào inbox người bình luận
  ap_dung: ApDung
  bat: boolean
  tao_luc?: string
}

export const AP_DUNG: Record<ApDung, string> = { ca_hai: 'Tin nhắn + bình luận', tin_nhan: 'Chỉ tin nhắn', binh_luan: 'Chỉ bình luận' }

// Kịch bản "trả lời mọi tin" chỉ gửi khi shop chưa nhắn gì cho khách trong khoảng này (tránh làm phiền)
export const GIO_CHO_TRA_LOI_MOI_TIN = 2

const thuong = (s: string) => s.normalize('NFC').toLocaleLowerCase('vi')
const thoat = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').normalize('NFC')

// Khớp nguyên từ / cụm từ: "ck" không khớp "check", "giá" không khớp "giáo".
// Khách gõ không dấu ("dat hang") thì so với từ khóa đã bỏ dấu; khách gõ có dấu thì so đúng dấu ("gia đình" không khớp "giá").
export function khopTuKhoa(noiDung: string, tuKhoa: string[]) {
  const nd = thuong(noiDung)
  const khongDau = boDau(nd) === nd
  return tuKhoa.some((tk) => {
    let t = thuong(tk.trim())
    if (khongDau) t = boDau(t)
    return !!t && new RegExp(`(^|[^\\p{L}\\p{N}])${thoat(t)}($|[^\\p{L}\\p{N}])`, 'u').test(nd)
  })
}

// {ten} → tên khách (hoặc "bạn" nếu chưa biết tên)
export const thayTen = (mau: string, ten: string | null | undefined) => mau.replace(/\{ten\}/gi, ten?.trim() || 'bạn')

// Chọn kịch bản cho một tin: ưu tiên kịch bản từ khóa (cũ trước), không khớp thì dùng kịch bản "mọi tin"
export function chonKichBan<T extends Pick<KichBan, 'tu_khoa' | 'ap_dung' | 'bat'>>(ds: T[], loai: 'tin_nhan' | 'binh_luan', noiDung: string | null) {
  const hop = ds.filter((k) => k.bat && (k.ap_dung === loai || k.ap_dung === 'ca_hai'))
  const tuKhoa = noiDung ? hop.find((k) => k.tu_khoa.length && khopTuKhoa(noiDung, k.tu_khoa)) : undefined
  if (tuKhoa) return { kb: tuKhoa, moiTin: false }
  const moiTin = hop.find((k) => !k.tu_khoa.length)
  return moiTin ? { kb: moiTin, moiTin: true } : null
}

// Kịch bản soạn sẵn: bấm "Dùng mẫu" để điền vào form rồi sửa lại cho shop mình. [ ] là chỗ cần điền.
export type MauKichBan = { ten: string; moTa: string; tu_khoa: string[]; ap_dung: ApDung; tra_loi: string; nhan_rieng: string }

export const MAU_KICH_BAN: MauKichBan[] = [
  {
    ten: 'Chào khách nhắn tin',
    moTa: 'Mọi tin nhắn mới',
    tu_khoa: [],
    ap_dung: 'tin_nhan',
    tra_loi: 'Chào {ten}! Shop đã nhận được tin nhắn, nhân viên sẽ trả lời bạn ngay trong ít phút ạ. Bạn cần tư vấn sản phẩm nào cứ nhắn shop nhé!',
    nhan_rieng: '',
  },
  {
    ten: 'Bình luận: báo đã inbox',
    moTa: 'Mọi bình luận mới',
    tu_khoa: [],
    ap_dung: 'binh_luan',
    tra_loi: 'Shop đã inbox {ten} rồi ạ, bạn kiểm tra tin nhắn giúp shop nhé!',
    nhan_rieng: 'Chào {ten}, shop thấy bạn vừa bình luận ạ. Bạn cần tư vấn sản phẩm nào, size/màu gì cứ nhắn shop, shop báo giá và giữ hàng cho bạn nhé!',
  },
  {
    ten: 'Hỏi giá',
    moTa: 'giá, bao nhiêu, bn…',
    tu_khoa: ['giá', 'bao nhiêu', 'bn', 'nhiêu tiền', 'báo giá', 'gia bao nhieu'],
    ap_dung: 'ca_hai',
    tra_loi: 'Shop đã gửi giá vào tin nhắn cho {ten} rồi ạ!',
    nhan_rieng: 'Chào {ten}, sản phẩm bạn hỏi đang có giá [điền giá] ạ. Bạn cho shop xin size/màu và số điện thoại để shop lên đơn nhé!',
  },
  {
    ten: 'Phí ship',
    moTa: 'ship, giao hàng, cod…',
    tu_khoa: ['ship', 'phí ship', 'giao hàng', 'cod', 'freeship'],
    ap_dung: 'ca_hai',
    tra_loi: 'Shop giao hàng toàn quốc, nhận hàng kiểm tra rồi mới thanh toán (COD). Phí ship [điền phí] ạ, đơn từ [điền mức] được miễn phí ship.',
    nhan_rieng: '',
  },
  {
    ten: 'Còn hàng không',
    moTa: 'còn hàng, còn không…',
    tu_khoa: ['còn hàng', 'còn không', 'còn ko', 'còn k', 'hết hàng', 'có sẵn'],
    ap_dung: 'ca_hai',
    tra_loi: 'Dạ sản phẩm vẫn còn hàng ạ. {ten} cho shop xin size/màu muốn lấy để shop kiểm tra và giữ hàng nhé!',
    nhan_rieng: '',
  },
  {
    ten: 'Tư vấn size',
    moTa: 'size, cân nặng…',
    tu_khoa: ['size', 'sz', 'cân nặng', 'chiều cao', 'mặc vừa'],
    ap_dung: 'ca_hai',
    tra_loi: '{ten} cho shop xin chiều cao, cân nặng để shop tư vấn size chuẩn nhất nhé!',
    nhan_rieng: '',
  },
  {
    ten: 'Địa chỉ shop',
    moTa: 'địa chỉ, shop ở đâu…',
    tu_khoa: ['địa chỉ', 'shop ở đâu', 'ở đâu', 'cửa hàng', 'xem trực tiếp'],
    ap_dung: 'ca_hai',
    tra_loi: 'Shop ở [điền địa chỉ], mở cửa [điền giờ] ạ. Bạn ghé xem trực tiếp hoặc đặt online shop giao tận nơi nhé!',
    nhan_rieng: '',
  },
  {
    ten: 'Chốt đơn',
    moTa: 'chốt, đặt hàng, mua…',
    tu_khoa: ['chốt', 'chốt đơn', 'đặt hàng', 'lên đơn', 'mua'],
    ap_dung: 'ca_hai',
    tra_loi: 'Dạ shop cảm ơn {ten}! Bạn gửi giúp shop: Họ tên, SĐT, địa chỉ nhận hàng, sản phẩm + size/màu để shop lên đơn ngay nhé.',
    nhan_rieng: '',
  },
  {
    ten: 'Chuyển khoản',
    moTa: 'stk, chuyển khoản…',
    tu_khoa: ['stk', 'số tài khoản', 'chuyển khoản', 'ck'],
    ap_dung: 'tin_nhan',
    tra_loi: 'Thông tin chuyển khoản: [Ngân hàng] - [Số tài khoản] - [Chủ tài khoản]. Nội dung chuyển khoản ghi số điện thoại của bạn giúp shop nhé!',
    nhan_rieng: '',
  },
]
