// Video MC tạo bằng Gemini (Veo, ~8 giây/clip): soạn lời thoại từng clip và câu lệnh để dán vào ứng dụng Gemini.
// Dùng được cả phía máy chủ lẫn trình duyệt.

export type ClipMc = { chu: string; san_pham: number; url: string } // san_pham: số thứ tự sản phẩm (0 = không gắn)

const SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

// 0–999 thành chữ (đọc tự nhiên: "hai mươi mốt", "một trăm linh năm")
function baSo(n: number, coTruoc: boolean) {
  const tram = Math.floor(n / 100)
  const chuc = Math.floor((n % 100) / 10)
  const dv = n % 10
  const ra: string[] = []
  if (tram || coTruoc) ra.push(`${SO[tram]} trăm`)
  if (chuc === 0) {
    if (dv && (tram || coTruoc)) ra.push('linh')
  } else ra.push(chuc === 1 ? 'mười' : `${SO[chuc]} mươi`)
  if (dv) ra.push(dv === 1 && chuc > 1 ? 'mốt' : dv === 5 && chuc > 0 ? 'lăm' : dv === 4 && chuc > 1 ? 'tư' : SO[dv])
  return ra.join(' ')
}

// 28990000 → "hai mươi tám triệu chín trăm chín mươi nghìn"
export function soThanhChu(n: number) {
  n = Math.round(n)
  if (n <= 0) return 'không'
  const nhom: [number, string][] = [
    [Math.floor(n / 1e9) % 1000, 'tỷ'],
    [Math.floor(n / 1e6) % 1000, 'triệu'],
    [Math.floor(n / 1e3) % 1000, 'nghìn'],
    [n % 1000, ''],
  ]
  const ra: string[] = []
  for (const [g, ten] of nhom) {
    if (!g) continue
    ra.push(`${baSo(g, ra.length > 0)}${ten ? ` ${ten}` : ''}`)
  }
  return ra.join(' ')
}

// Tên gọn để đọc trong 8 giây: bỏ phần dung lượng "12GB/256GB", "256GB"
const tenGon = (ten: string) => ten.replace(/\s*\d+\s*GB(\s*\/\s*\d+\s*GB)?/gi, '').replace(/\s+/g, ' ').trim()

// Bộ clip gọn: chào + mỗi sản phẩm 1 clip + 2 clip kêu gọi (mỗi câu ~8 giây nói)
export function taoDanhSachClip(tenShop: string, sanPham: { ten: string; gia: number }[]): ClipMc[] {
  const ds: ClipMc[] = [{ chu: `Chào cả nhà đã ghé live ${tenShop}! Hôm nay nhiều siêu phẩm giá cực tốt, thả tim cho em nha!`, san_pham: 0, url: '' }]
  sanPham.forEach((x, i) => {
    if (!x.ten.trim()) return
    ds.push({
      chu: x.gia > 0 ? `${tenGon(x.ten)}, giá chỉ ${soThanhChu(x.gia)} đồng, chốt liền nha cả nhà!` : `${tenGon(x.ten)}, hàng chính hãng, cả nhà nhắn shop để được tư vấn nha!`,
      san_pham: i + 1,
      url: '',
    })
  })
  ds.push({ chu: 'Cả nhà cần tư vấn máy nào cứ bình luận tên sản phẩm, em trả lời ngay nha!', san_pham: 0, url: '' })
  ds.push({ chu: 'Nhớ bấm theo dõi kênh và thả tim thật nhiều để nhận ưu đãi mỗi ngày nha cả nhà!', san_pham: 0, url: '' })
  return ds
}

// Câu lệnh dán vào ứng dụng Gemini (kèm ảnh nhân vật) để tạo video Veo
export const loiNhacVeo = (chu: string) =>
  `Dùng ảnh tôi gửi làm nhân vật. Tạo video dọc 9:16 dài 8 giây: cô gái ngồi trước micro, nhìn thẳng vào camera, tươi cười và nói tiếng Việt rõ ràng, khẩu hình khớp lời, cử chỉ tay nhẹ nhàng như người dẫn livestream bán hàng. Cô ấy nói đúng câu: "${chu}". Camera đứng yên, ánh sáng studio dịu, không nhạc nền, không phụ đề, không chữ trên màn hình.`
