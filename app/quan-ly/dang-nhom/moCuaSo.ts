// Mở Facebook trong MỘT cửa sổ phụ cố định ở nửa phải màn hình; nhóm sau mở lại trong chính cửa sổ đó
// (không sinh thêm tab, phần mềm vẫn nằm bên trái để bấm Enter sang nhóm tiếp).
export function moCuaSoFacebook(link: string) {
  const rong = Math.min(960, Math.round(screen.availWidth / 2))
  const cuaSo = window.open(
    link,
    'facebook_24h_page',
    `popup,width=${rong},height=${screen.availHeight},left=${screen.availWidth - rong},top=0`,
  )
  if (!cuaSo) {
    // Trình duyệt chặn cửa sổ phụ: mở tab thường
    window.open(link, '_blank', 'noopener')
    return
  }
  cuaSo.opener = null
  cuaSo.focus()
}
