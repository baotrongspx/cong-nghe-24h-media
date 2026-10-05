// Đọc bình luận TikTok Live và gửi về phần mềm 24H Page để MC ảo trả lời.
//
// Cách chạy trên máy Windows (cần Node.js 20 trở lên: https://nodejs.org):
//   1. Tạo một thư mục, ví dụ C:\live-ai, chép file này vào đó
//   2. Mở PowerShell trong thư mục đó, chạy một lần:  npm install tiktok-live-connector
//   3. Chạy:  node doc-binh-luan-tiktok.mjs <link-nhận-bình-luận> <tên-tiktok>
//      (copy nguyên lệnh ở trang Live AI trong phần mềm)
//
// Lưu ý: thư viện tiktok-live-connector không phải API chính thức của TikTok, có thể ngừng chạy khi TikTok thay đổi.
// Hỗ trợ cả bản mới (TikTokLiveConnection) lẫn bản cũ (WebcastPushConnection) của thư viện
const thuVien = await import('tiktok-live-connector').catch(() => {
  console.log('Chưa cài thư viện. Chạy lệnh:  npm install tiktok-live-connector')
  process.exit(1)
})
const goi = { ...thuVien.default, ...thuVien }
const KetNoiLive = goi.TikTokLiveConnection ?? goi.WebcastPushConnection

const [linkNhan, tenTikTok] = process.argv.slice(2)
if (!linkNhan || !tenTikTok) {
  console.log('Cách dùng: node doc-binh-luan-tiktok.mjs <link-nhận-bình-luận> <tên-tiktok>')
  process.exit(1)
}

let cho = [] // bình luận chờ gửi
let tong = 0

// Gom bình luận, mỗi 1,5 giây gửi một lần
setInterval(async () => {
  if (!cho.length) return
  const ds = cho.splice(0, 50)
  try {
    const r = await fetch(linkNhan, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ds }) })
    if (!r.ok) console.log('Gửi bình luận lỗi:', r.status, await r.text())
    else tong += ds.length
  } catch (e) {
    console.log('Không gửi được bình luận (mất mạng?):', e.message)
    cho = [...ds, ...cho].slice(0, 200)
  }
}, 1500)

// Hẹn kết nối lại (chỉ một hẹn tại một thời điểm)
let hen = null
function thuLai(giay, lyDo) {
  if (hen) return
  console.log(`${lyDo} Thử lại sau ${giay} giây...`)
  hen = setTimeout(() => {
    hen = null
    ketNoi()
  }, giay * 1000)
}

async function ketNoi() {
  const live = new KetNoiLive(tenTikTok.replace(/^@/, ''), {})
  live.on('chat', (d) => {
    const ten = d.user?.nickname || d.user?.uniqueId || d.nickname || d.uniqueId || 'Khách'
    const noiDung = (d.comment || '').trim()
    if (!noiDung) return
    console.log(`💬 ${ten}: ${noiDung}`)
    cho.push({ ten, noiDung })
  })
  live.on('streamEnd', () => thuLai(30, 'Buổi live đã kết thúc.'))
  live.on('disconnected', () => thuLai(15, 'Mất kết nối TikTok.'))
  try {
    const st = await live.connect()
    console.log(`✅ Đã kết nối live của @${tenTikTok} (phòng ${st.roomId}). Đang gửi bình luận về phần mềm...`)
  } catch (e) {
    thuLai(30, `Chưa kết nối được (@${tenTikTok} chưa phát live?): ${e?.message ?? e}.`)
  }
}

setInterval(() => tong && console.log(`— Đã gửi ${tong} bình luận`), 60_000)
ketNoi()
