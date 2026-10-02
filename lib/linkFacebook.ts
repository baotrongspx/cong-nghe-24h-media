// Link tới bài viết Fanpage từ id dạng "<pageId>_<postId>" mà Graph API trả về
export function linkBai(fbPostId: string) {
  const [trang, bai] = fbPostId.split('_')
  return bai ? `https://www.facebook.com/${trang}/posts/${bai}` : `https://www.facebook.com/${fbPostId}`
}

// Hộp thoại Chia sẻ của Facebook: người dùng tự chọn "Chia sẻ lên nhóm" và nhóm muốn chia sẻ
export const linkChiaSe = (fbPostId: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkBai(fbPostId))}`

// Bài đã lên Facebook: đăng ngay, hoặc hẹn giờ và đã tới giờ
export const daLenFacebook = (d: { trang_thai: string; hen_luc: string | null; fb_post_id: string | null }) =>
  !!d.fb_post_id && (d.trang_thai === 'da_dang' || (d.trang_thai === 'da_hen' && !!d.hen_luc && new Date(d.hen_luc).getTime() <= Date.now()))
