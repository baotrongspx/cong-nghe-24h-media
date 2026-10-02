-- Chạy một lần trong Supabase > SQL Editor
create table if not exists khach_dang_ky (
  id uuid primary key default gen_random_uuid(),
  tao_luc timestamptz not null default now(),
  ho_ten text not null,
  so_dien_thoai text not null,
  ten_doanh_nghiep text,
  linh_vuc text,
  goi_quan_tam text,
  loi_nhan text,
  trang_thai text not null default 'moi' -- moi | da_lien_he | chot | bo_qua
);

-- Chỉ máy chủ (khóa service role) được đọc/ghi; khách vãng lai không truy cập trực tiếp được
alter table khach_dang_ky enable row level security;
