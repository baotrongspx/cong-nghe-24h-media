// Đồ dùng chung để dựng video ngay trên trình duyệt (canvas + MediaRecorder). Chỉ dùng ở phía trình duyệt.
export type KhoVideo = { rong: number; cao: number; coChu: number; viTriChu: number }

export const giaiMa = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

// Kiểu video trình duyệt quay được, ưu tiên MP4
export const KIEU = ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']

// Cắt chữ thành từng đoạn phụ đề ngắn (tối đa ~8 từ) theo câu / dòng
export function tachPhuDe(chu: string) {
  const doan: string[] = []
  for (const cau of chu.split(/(?<=[.!?…])\s+|\n+/)) {
    const tu = cau.trim().split(/\s+/).filter(Boolean)
    const so = Math.ceil(tu.length / 8)
    for (let i = 0; i < so; i++) doan.push(tu.slice(Math.round((i * tu.length) / so), Math.round(((i + 1) * tu.length) / so)).join(' '))
  }
  return doan.filter(Boolean)
}

// Phụ đề chữ trắng viền đen, tự xuống dòng, canh giữa
export function veChu(g: CanvasRenderingContext2D, k: KhoVideo, chu: string) {
  g.font = `bold ${k.coChu}px system-ui, "Segoe UI", Roboto, sans-serif`
  const rongToiDa = Math.min(k.rong - 100, 1000)
  const dong: string[] = []
  for (const tu of chu.split(' ')) {
    const thu = dong.length ? `${dong[dong.length - 1]} ${tu}` : tu
    if (dong.length && g.measureText(thu).width <= rongToiDa) dong[dong.length - 1] = thu
    else dong.push(tu)
  }
  const cao = Math.round(k.coChu * 1.32)
  const y0 = k.cao * k.viTriChu - (dong.length * cao) / 2
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  dong.forEach((d, i) => {
    const y = y0 + i * cao + cao / 2
    g.lineWidth = 10
    g.strokeStyle = 'rgba(0,0,0,0.85)'
    g.strokeText(d, k.rong / 2, y)
    g.fillStyle = '#fff'
    g.fillText(d, k.rong / 2, y)
  })
}
