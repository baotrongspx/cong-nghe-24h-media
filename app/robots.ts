import type { MetadataRoute } from 'next'

// Trang công cụ riêng, không cho máy tìm kiếm ghi nhận
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
