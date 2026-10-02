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

-- ============ Nhân viên & chia hội thoại ============
-- vai_tro: chu (quản trị Page trên Facebook) | nhan_vien (được mời)
alter table trang_quan_tri add column if not exists vai_tro text not null default 'chu';
alter table trang_quan_tri add column if not exists moi_boi text references nguoi_dung(id) on delete cascade;
alter table trang_quan_tri add column if not exists nhan_chia boolean not null default true;        -- nhận hội thoại khi chia xoay vòng
alter table trang_quan_tri add column if not exists chi_xem_cua_minh boolean not null default false; -- nhân viên chỉ thấy hội thoại giao cho mình
alter table trang_quan_tri add column if not exists chia_luc timestamptz;                           -- lần cuối được chia (xoay vòng)
alter table fb_trang add column if not exists che_do_chia text not null default 'thu_cong';         -- thu_cong | xoay_vong
alter table hoi_thoai add column if not exists nguoi_phu_trach text references nguoi_dung(id) on delete set null;
alter table tin add column if not exists nguoi_gui_id text references nguoi_dung(id) on delete set null;

create table if not exists loi_moi (
  ma text primary key,
  chu_id text not null references nguoi_dung(id) on delete cascade,
  trang_ids text[] not null,
  chi_xem_cua_minh boolean not null default false,
  tao_luc timestamptz not null default now(),
  het_han timestamptz not null,
  da_dung_boi text references nguoi_dung(id) on delete set null
);
alter table loi_moi enable row level security;

-- ============ Đăng bài Fanpage & trợ lý đăng nhóm ============
create table if not exists bai_viet (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  noi_dung text not null default '',
  anh text[] not null default '{}',          -- URL ảnh công khai (Supabase Storage)
  tao_luc timestamptz not null default now()
);
-- Mỗi lần đăng / hẹn giờ lên một Fanpage
create table if not exists dang_trang (
  id uuid primary key default gen_random_uuid(),
  bai_viet_id uuid not null references bai_viet(id) on delete cascade,
  trang_id text not null references fb_trang(id) on delete cascade,
  hen_luc timestamptz,                         -- null = đăng ngay
  fb_post_id text,
  trang_thai text not null check (trang_thai in ('da_dang', 'da_hen', 'loi', 'da_huy')),
  loi text,
  tao_luc timestamptz not null default now()
);
-- Nhóm Facebook người dùng đã tham gia (tự nhập), và lịch sử đã đăng tay vào nhóm
create table if not exists nhom_fb (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  ten text not null,
  link text not null,
  ghi_chu text,
  tao_luc timestamptz not null default now()
);
create table if not exists dang_nhom (
  id uuid primary key default gen_random_uuid(),
  nhom_id uuid not null references nhom_fb(id) on delete cascade,
  bai_viet_id uuid not null references bai_viet(id) on delete cascade,
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  dang_luc timestamptz not null default now()
);
alter table bai_viet enable row level security;
alter table dang_trang enable row level security;
alter table nhom_fb enable row level security;
alter table dang_nhom enable row level security;

-- Các phiên bản nội dung khác của bài (trợ lý đăng nhóm xoay vòng để đỡ bị coi là spam)
alter table bai_viet add column if not exists bien_the text[] not null default '{}';

-- ============ Đơn hàng (tạo ngay trong khung chat) ============
create table if not exists don_hang (
  id uuid primary key default gen_random_uuid(),
  ma bigint generated always as identity (start with 1001), -- số đơn hiển thị: #1001…
  trang_id text not null references fb_trang(id) on delete cascade,
  hoi_thoai_id uuid references hoi_thoai(id) on delete set null,
  nguoi_tao_id text references nguoi_dung(id) on delete set null,
  khach_ten text not null default '',
  so_dien_thoai text not null default '',
  dia_chi text not null default '',
  san_pham jsonb not null default '[]',          -- [{ ten, sl, gia }]
  phi_ship bigint not null default 0,
  giam_gia bigint not null default 0,
  tong bigint not null default 0,                   -- tiền hàng + ship − giảm giá
  ghi_chu text not null default '',
  trang_thai text not null default 'moi' check (trang_thai in ('moi', 'xac_nhan', 'dang_giao', 'da_giao', 'hoan', 'huy')),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now()
);
create index if not exists don_hang_trang_tao on don_hang (trang_id, tao_luc desc);
create index if not exists don_hang_hoi_thoai on don_hang (hoi_thoai_id);
alter table don_hang enable row level security;
