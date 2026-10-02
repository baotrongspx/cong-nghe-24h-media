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

-- ============ Quản lý Fanpage (giống Vpage) ============
-- Người dùng đăng nhập bằng Facebook
create table if not exists nguoi_dung (
  id text primary key,                -- Facebook user id (theo app)
  ten text not null,
  anh text,
  tao_luc timestamptz not null default now()
);

-- Fanpage đã kết nối. access_token là page token dài hạn, chỉ máy chủ đọc.
create table if not exists fb_trang (
  id text primary key,                -- page id
  ten text not null,
  anh text,
  access_token text not null,
  an_binh_luan_sdt boolean not null default true,   -- tự ẩn bình luận có số điện thoại
  an_tat_ca_binh_luan boolean not null default false,
  ket_noi_luc timestamptz not null default now()
);

-- Ai được quản lý page nào (một page có thể nhiều người quản lý)
create table if not exists trang_quan_tri (
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  trang_id text not null references fb_trang(id) on delete cascade,
  primary key (nguoi_dung_id, trang_id)
);

-- Hội thoại: tin nhắn (theo khách) hoặc bình luận (theo khách + bài viết)
create table if not exists hoi_thoai (
  id uuid primary key default gen_random_uuid(),
  trang_id text not null references fb_trang(id) on delete cascade,
  loai text not null check (loai in ('tin_nhan', 'binh_luan')),
  khach_id text not null,             -- PSID (tin nhắn) hoặc id người bình luận
  khach_ten text,
  bai_viet_id text not null default '',   -- rỗng với tin nhắn
  so_dien_thoai text,
  the text[] not null default '{}',
  tin_cuoi text,
  chua_doc int not null default 0,
  cap_nhat_luc timestamptz not null default now(),
  unique (trang_id, loai, khach_id, bai_viet_id)
);
create index if not exists hoi_thoai_trang_cap_nhat on hoi_thoai (trang_id, cap_nhat_luc desc);

create table if not exists tin (
  id uuid primary key default gen_random_uuid(),
  hoi_thoai_id uuid not null references hoi_thoai(id) on delete cascade,
  fb_id text unique,                  -- mid của tin nhắn hoặc id bình luận
  chieu text not null check (chieu in ('vao', 'ra')),
  noi_dung text,
  dinh_kem jsonb,
  da_an boolean not null default false,
  tao_luc timestamptz not null default now()
);
create index if not exists tin_hoi_thoai on tin (hoi_thoai_id, tao_luc);

-- Thẻ phân loại hội thoại, mẫu câu trả lời nhanh, kịch bản tự trả lời theo từ khóa
create table if not exists the_hoi_thoai (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  ten text not null,
  mau text not null default '#2563eb',
  unique (nguoi_dung_id, ten)
);

create table if not exists mau_cau (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  phim_tat text not null,             -- gõ /phim_tat để chèn nhanh
  noi_dung text not null
);

create table if not exists tu_dong (
  id uuid primary key default gen_random_uuid(),
  trang_id text not null references fb_trang(id) on delete cascade,
  tu_khoa text[] not null,            -- khớp nếu nội dung chứa một trong các từ (không phân biệt hoa thường)
  tra_loi text not null,
  ap_dung text not null default 'ca_hai' check (ap_dung in ('tin_nhan', 'binh_luan', 'ca_hai')),
  bat boolean not null default true
);

alter table nguoi_dung enable row level security;
alter table fb_trang enable row level security;
alter table trang_quan_tri enable row level security;
alter table hoi_thoai enable row level security;
alter table tin enable row level security;
alter table the_hoi_thoai enable row level security;
alter table mau_cau enable row level security;
alter table tu_dong enable row level security;

-- ============ Gói cước & quản trị (chạy lại cả file cũng được) ============
alter table nguoi_dung add column if not exists goi text not null default 'mien_phi';
alter table nguoi_dung add column if not exists het_han timestamptz;          -- null = không hết hạn
alter table nguoi_dung add column if not exists bi_khoa boolean not null default false;
alter table nguoi_dung add column if not exists la_quan_tri boolean not null default false;
alter table nguoi_dung add column if not exists ghi_chu text;
alter table nguoi_dung add column if not exists dang_nhap_luc timestamptz;
-- Page nào đang được quản lý (tính vào giới hạn gói)
alter table trang_quan_tri add column if not exists bat boolean not null default true;
