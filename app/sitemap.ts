import type { MetadataRoute } from 'next'
import { diaChiWeb } from '@/lib/thongTin'

export default function sitemap(): MetadataRoute.Sitemap {
  const w = diaChiWeb()
  return [
    { url: w, priority: 1 },
    { url: `${w}/dich-vu`, priority: 0.8 },
    { url: `${w}/chinh-sach-bao-mat`, priority: 0.3 },
  ]
}
