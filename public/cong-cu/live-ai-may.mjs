// Chương trình chạy trên máy Windows cho Live AI của phần mềm 24H Page:
//   1. Đọc giọng: chuyển lời MC thành giọng tiếng Việt của Windows (Microsoft An) — miễn phí, không giới hạn.
//      Sân khấu trong OBS tự gọi http://127.0.0.1:5123 khi phiên live chọn "Giọng máy tính".
//   2. Đọc bình luận TikTok Live (nếu nhập link nhận bình luận + tên TikTok) và gửi về phần mềm để MC trả lời.
//
// Cài (một lần): Node.js 20+ (https://nodejs.org), mở PowerShell trong thư mục chứa file này, chạy:
//   npm install tiktok-live-connector
// Chạy:
//   node live-ai-may.mjs                                      (chỉ đọc giọng)
//   node live-ai-may.mjs <link-nhận-bình-luận> <tên-tiktok>   (đọc giọng + bình luận TikTok)
//
// Lưu ý: tiktok-live-connector không phải API chính thức của TikTok, có thể ngừng chạy khi TikTok thay đổi.
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const CONG = 5123
const [linkNhan, tenTikTok] = process.argv.slice(2)

// ---------- 1. Đọc giọng bằng Windows (Windows.Media.SpeechSynthesis) ----------
const PS1 = `param([string]$Vao, [string]$Ra)
$chu = [IO.File]::ReadAllText($Vao, [Text.Encoding]::UTF8)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -like 'vi*' } | Select-Object -First 1
if (-not $v) { Write-Error 'KHONG_CO_GIONG_VIET'; exit 2 }
$s.Voice = $v
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' } | Select-Object -First 1
$t = $asTask.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream]).Invoke($null, @($s.SynthesizeTextToStreamAsync($chu)))
$t.Wait()
$doc = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($t.Result)
$ms = New-Object IO.MemoryStream
$doc.CopyTo($ms)
[IO.File]::WriteAllBytes($Ra, $ms.ToArray())
`
const tep = (duoi) => path.join(os.tmpdir(), `live-ai-${randomUUID()}.${duoi}`)
const ps1 = path.join(os.tmpdir(), 'live-ai-doc-giong.ps1')
fs.writeFileSync(ps1, PS1)

function docGiong(chu) {
  return new Promise((ok, loi) => {
    const vao = tep('txt')
    const ra = tep('wav')
    fs.writeFileSync(vao, chu, 'utf8')
    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Vao', vao, '-Ra', ra], { timeout: 30_000, windowsHide: true }, (e, _out, err) => {
      fs.rm(vao, () => {})
      if (e) return loi(new Error(/KHONG_CO_GIONG_VIET/.test(err) ? 'Máy chưa có giọng tiếng Việt: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → Tiếng Việt' : err || e.message))
      try {
        ok(fs.readFileSync(ra))
      } catch (x) {
        loi(x)
      } finally {
        fs.rm(ra, () => {})
      }
    })
  })
}

// Cho phép sân khấu (trang web của phần mềm, mở trong OBS) gọi vào máy này
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-private-network': 'true',
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end()
    if (req.method === 'GET' && req.url === '/trang-thai') return res.writeHead(200, { ...CORS, 'content-type': 'application/json' }).end('{"ok":true}')
    if (req.method === 'POST' && req.url === '/doc') {
      const manh = []
      req.on('data', (c) => manh.push(c))
      req.on('end', async () => {
        try {
          // Ghép đủ các mảnh rồi mới giải mã UTF-8 (tránh cắt đôi chữ có dấu)
          const chu = String(JSON.parse(Buffer.concat(manh).toString('utf8')).chu ?? '').slice(0, 1500).trim()
          if (!chu) return res.writeHead(400, CORS).end()
          const wav = await docGiong(chu)
          res.writeHead(200, { ...CORS, 'content-type': 'audio/wav' }).end(wav)
          console.log(`🔊 Đã đọc: ${chu.slice(0, 70)}${chu.length > 70 ? '…' : ''}`)
        } catch (e) {
          console.log('Đọc giọng lỗi:', e.message)
          res.writeHead(500, { ...CORS, 'content-type': 'text/plain; charset=utf-8' }).end(e.message)
        }
      })
      return
    }
    res.writeHead(404, CORS).end()
  })
  .listen(CONG, '127.0.0.1', () => console.log(`✅ Đọc giọng sẵn sàng (http://127.0.0.1:${CONG}). Để cửa sổ này mở suốt buổi live.`))
  .on('error', (e) => console.log(e.code === 'EADDRINUSE' ? `Chương trình đang chạy ở một cửa sổ khác rồi (cổng ${CONG}).` : `Lỗi: ${e.message}`))

// ---------- 2. Bình luận TikTok Live ----------
if (linkNhan && tenTikTok) {
  // Hỗ trợ cả bản mới (TikTokLiveConnection) lẫn bản cũ (WebcastPushConnection) của thư viện
  const thuVien = await import('tiktok-live-connector').catch(() => {
    console.log('Chưa cài thư viện đọc bình luận. Chạy lệnh:  npm install tiktok-live-connector')
    return null
  })
  if (thuVien) {
    const goi = { ...thuVien.default, ...thuVien }
    const KetNoiLive = goi.TikTokLiveConnection ?? goi.WebcastPushConnection
    let cho = []
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
    setInterval(() => tong && console.log(`— Đã gửi ${tong} bình luận`), 60_000)

    // Hẹn kết nối lại (chỉ một hẹn tại một thời điểm)
    let hen = null
    const thuLai = (giay, lyDo) => {
      if (hen) return
      console.log(`${lyDo} Thử lại sau ${giay} giây...`)
      hen = setTimeout(() => {
        hen = null
        ketNoi()
      }, giay * 1000)
    }

    const ketNoi = async () => {
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
    ketNoi()
  }
} else {
  console.log('(Chưa nhập tên TikTok: chỉ chạy phần đọc giọng.)')
}
