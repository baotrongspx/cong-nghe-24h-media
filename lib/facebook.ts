import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Gọi Facebook Graph API chính thức. Cần một Facebook App (developers.facebook.com).
const PHIEN_BAN = process.env.FB_GRAPH_VERSION ?? 'v23.0'
const GOC = `https://graph.facebook.com/${PHIEN_BAN}`

// Quyền xin khi đăng nhập: đọc danh sách page, đọc/trả lời tin nhắn, đọc/ẩn/trả lời bình luận, nhận webhook
export const QUYEN = [
  'pages_show_list',
  'pages_messaging',
  'pages_read_engagement',
  'pages_manage_engagement',
  'pages_manage_metadata',
  'pages_read_user_content',
  'pages_manage_posts',
  'business_management',
]

export function cauHinhApp() {
  // trim(): phòng khi dán giá trị vào Vercel bị dư dấu cách / xuống dòng
  const id = process.env.FACEBOOK_APP_ID?.trim()
  const bi_mat = process.env.FACEBOOK_APP_SECRET?.trim()
  if (!id || !bi_mat) throw new Error('Thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET')
  return { id, bi_mat }
}

export class LoiFacebook extends Error {
  constructor(message: string, public ma?: number) {
    super(message)
  }
}

type ThamSo = Record<string, string | number | boolean | undefined>

export async function graph<T = unknown>(
  duong: string,
  { method = 'GET', ...thamSo }: ThamSo & { method?: 'GET' | 'POST' | 'DELETE' } = {},
): Promise<T> {
  const url = new URL(`${GOC}/${duong.replace(/^\//, '')}`)
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(thamSo)) {
    if (v === undefined) continue
    if (method === 'GET') url.searchParams.set(k, String(v))
    else body.set(k, String(v))
  }
  const res = await fetch(url, {
    method,
    body: method === 'GET' ? undefined : body,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    throw new LoiFacebook(json.error?.message ?? `Facebook trả lỗi ${res.status}`, json.error?.code)
  }
  return json as T
}

// ---- Đăng nhập ----
// Đường dẫn được phép quay về sau khi đăng nhập (trang nhận lời mời nhân viên), chống chuyển hướng tùy ý
export const laDuongMoi = (s: string | null | undefined): s is string => !!s && /^\/moi\/[\w-]+$/.test(s)

export function urlDangNhap(chuyenVe: string, state: string) {
  const { id } = cauHinhApp()
  const u = new URL(`https://www.facebook.com/${PHIEN_BAN}/dialog/oauth`)
  u.searchParams.set('client_id', id)
  u.searchParams.set('redirect_uri', chuyenVe)
  u.searchParams.set('state', state)
  u.searchParams.set('scope', QUYEN.join(','))
  u.searchParams.set('response_type', 'code')
  return u.toString()
}

// Đổi code lấy user token, rồi đổi sang token dài hạn (~60 ngày) để page token lấy ra không hết hạn
export async function doiCodeLayToken(code: string, chuyenVe: string) {
  const { id, bi_mat } = cauHinhApp()
  const ngan = await graph<{ access_token: string }>('oauth/access_token', {
    client_id: id,
    client_secret: bi_mat,
    redirect_uri: chuyenVe,
    code,
  })
  const dai = await graph<{ access_token: string }>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: id,
    client_secret: bi_mat,
    fb_exchange_token: ngan.access_token,
  })
  return dai.access_token
}

export type TrangFB = { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }

export async function layDanhSachTrang(userToken: string) {
  const ds: TrangFB[] = []
  let sau: string | undefined
  do {
    const r = await graph<{ data: TrangFB[]; paging?: { cursors?: { after?: string }; next?: string } }>('me/accounts', {
      access_token: userToken,
      fields: 'id,name,access_token,picture{url}',
      limit: 100,
      after: sau,
    })
    ds.push(...r.data)
    sau = r.paging?.next ? r.paging.cursors?.after : undefined
  } while (sau)
  return ds
}

// Đăng ký page nhận webhook tin nhắn + bình luận về app
export function dangKyWebhook(trangId: string, pageToken: string) {
  return graph(`${trangId}/subscribed_apps`, {
    method: 'POST',
    access_token: pageToken,
    subscribed_fields: 'messages,messaging_postbacks,feed',
  })
}

// ---- Thao tác trên page ----
export function guiTinNhan(pageToken: string, psid: string, noiDung: string) {
  return graph<{ message_id: string }>('me/messages', {
    method: 'POST',
    access_token: pageToken,
    messaging_type: 'RESPONSE',
    recipient: JSON.stringify({ id: psid }),
    message: JSON.stringify({ text: noiDung }),
  })
}

export function traLoiBinhLuan(pageToken: string, binhLuanId: string, noiDung: string) {
  return graph<{ id: string }>(`${binhLuanId}/comments`, { method: 'POST', access_token: pageToken, message: noiDung })
}

// Nhắn riêng (inbox) cho người bình luận — Facebook chỉ cho 1 lần mỗi bình luận, trong 7 ngày
export function nhanRiengBinhLuan(pageToken: string, binhLuanId: string, noiDung: string) {
  return graph<{ message_id: string }>('me/messages', {
    method: 'POST',
    access_token: pageToken,
    recipient: JSON.stringify({ comment_id: binhLuanId }),
    message: JSON.stringify({ text: noiDung }),
  })
}

export function anBinhLuan(pageToken: string, binhLuanId: string, an: boolean) {
  return graph(binhLuanId, { method: 'POST', access_token: pageToken, is_hidden: an })
}

export async function tenKhach(pageToken: string, psid: string) {
  try {
    const r = await graph<{ name?: string; first_name?: string; last_name?: string }>(psid, {
      access_token: pageToken,
      fields: 'name,first_name,last_name',
    })
    return r.name || [r.last_name, r.first_name].filter(Boolean).join(' ') || null
  } catch {
    return null
  }
}

// Kiểm tra chữ ký X-Hub-Signature-256 để chắc webhook đến từ Facebook
export function chuKyHopLe(than: string, chuKy: string | null) {
  if (!chuKy?.startsWith('sha256=')) return false
  const mong = createHmac('sha256', cauHinhApp().bi_mat).update(than).digest('hex')
  const a = Buffer.from(chuKy.slice(7), 'hex')
  const b = Buffer.from(mong, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

// Bắt số điện thoại Việt Nam trong nội dung (cho phép dấu cách, chấm, gạch giữa các số)
export function timSoDienThoai(s: string | null | undefined) {
  if (!s) return null
  const m = s.match(/(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/)
  if (!m) return null
  return m[0].replace(/[^\d]/g, '').replace(/^84/, '0')
}

// ---- Đăng bài lên Fanpage ----
// Tải ảnh (theo URL công khai) lên page ở dạng chưa đăng, trả về id để gắn vào bài viết.
// temporary=true bắt buộc khi bài được hẹn giờ.
export async function taiAnhLenTrang(pageToken: string, trangId: string, url: string, henGio: boolean) {
  const r = await graph<{ id: string }>(`${trangId}/photos`, {
    method: 'POST',
    access_token: pageToken,
    url,
    published: false,
    ...(henGio ? { temporary: true } : {}),
  })
  return r.id
}

// Đăng bài (kèm ảnh đã tải) ngay hoặc hẹn giờ bằng tính năng lên lịch của Facebook (10 phút đến 29 ngày)
export function dangBaiTrang(pageToken: string, trangId: string, p: { noiDung: string; anhIds: string[]; henLuc?: Date }) {
  const thamSo: Record<string, string | number | boolean> = { method: 'POST', access_token: pageToken, message: p.noiDung }
  p.anhIds.forEach((id, i) => (thamSo[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })))
  if (p.henLuc) {
    thamSo.published = false
    thamSo.scheduled_publish_time = Math.floor(p.henLuc.getTime() / 1000)
  }
  return graph<{ id: string }>(`${trangId}/feed`, thamSo as ThamSo & { method: 'POST' })
}

export function xoaBaiTrang(pageToken: string, postId: string) {
  return graph(postId, { method: 'DELETE', access_token: pageToken })
}
