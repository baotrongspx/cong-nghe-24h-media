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

-- ============ Tự động trả lời nâng cao ============
-- tu_khoa rỗng ('{}') = trả lời mọi tin / bình luận không khớp từ khóa nào (không chào nếu shop vừa nhắn khách trong 2 giờ)
-- tra_loi: trả lời tin nhắn và trả lời công khai dưới bình luận ('' = không trả lời công khai)
-- nhan_rieng: với bình luận, nhắn riêng vào inbox người bình luận ('' = không nhắn)
alter table tu_dong add column if not exists nhan_rieng text not null default '';
alter table tu_dong add column if not exists tao_luc timestamptz not null default now();

-- ============ Báo cáo ============
-- Đánh dấu tin do hệ thống tự trả lời (không tính vào thời gian phản hồi của nhân viên)
alter table tin add column if not exists tu_dong boolean not null default false;

-- Số liệu báo cáo tính sẵn trong cơ sở dữ liệu (Supabase chỉ trả tối đa 1.000 dòng mỗi lần truy vấn).
-- p_trang: các Page được xem; p_chi_cua_minh: Page mà người xem chỉ thấy hội thoại / đơn của mình.
create or replace function bao_cao(p_tu timestamptz, p_den timestamptz, p_trang text[], p_chi_cua_minh text[], p_nguoi text)
returns json
language sql
stable
as $$
with ht as (
  select h.id, h.trang_id, h.loai
  from hoi_thoai h
  where h.trang_id = any(p_trang)
    and (not (h.trang_id = any(p_chi_cua_minh)) or h.nguoi_phu_trach = p_nguoi)
),
t as (
  select x.id, x.hoi_thoai_id, x.chieu, x.tao_luc, x.nguoi_gui_id, x.tu_dong, ht.trang_id, ht.loai
  from tin x join ht on ht.id = x.hoi_thoai_id
  where x.tao_luc >= p_tu - interval '2 days' and x.tao_luc < p_den + interval '2 days'
),
trong as (select * from t where tao_luc >= p_tu and tao_luc < p_den),
-- Lượt khách: tin vào mà tin (không tự động) liền trước không phải tin vào
luot as (
  select t.*, lag(chieu) over (partition by hoi_thoai_id order by tao_luc) as truoc
  from t where not tu_dong
),
bat_dau as (
  select hoi_thoai_id, tao_luc from luot
  where chieu = 'vao' and truoc is distinct from 'vao' and tao_luc >= p_tu and tao_luc < p_den
),
phan_hoi as (
  select b.hoi_thoai_id, extract(epoch from r.tao_luc - b.tao_luc) as giay, r.nguoi_gui_id
  from bat_dau b
  left join lateral (
    select y.tao_luc, y.nguoi_gui_id from t y
    where y.hoi_thoai_id = b.hoi_thoai_id and y.chieu = 'ra' and not y.tu_dong and y.tao_luc > b.tao_luc
    order by y.tao_luc limit 1
  ) r on true
),
dau_tien as (
  select x.hoi_thoai_id, min(x.tao_luc) as luc from tin x join ht on ht.id = x.hoi_thoai_id group by x.hoi_thoai_id
),
cuoi as (
  select distinct on (x.hoi_thoai_id) x.hoi_thoai_id, x.chieu, x.tao_luc
  from tin x join ht on ht.id = x.hoi_thoai_id
  where not x.tu_dong and x.tao_luc > now() - interval '7 days'
  order by x.hoi_thoai_id, x.tao_luc desc
),
don as (
  select d.* from don_hang d
  where d.trang_id = any(p_trang)
    and (not (d.trang_id = any(p_chi_cua_minh)) or d.nguoi_tao_id = p_nguoi)
    and d.tao_luc >= p_tu and d.tao_luc < p_den
)
select json_build_object(
  'tong', json_build_object(
    'tin_nhan', (select count(*) from trong where chieu = 'vao' and loai = 'tin_nhan'),
    'binh_luan', (select count(*) from trong where chieu = 'vao' and loai = 'binh_luan'),
    'tin_ra', (select count(*) from trong where chieu = 'ra' and not tu_dong),
    'tu_dong', (select count(*) from trong where chieu = 'ra' and tu_dong),
    'khach', (select count(distinct hoi_thoai_id) from trong where chieu = 'vao'),
    'khach_moi', (select count(*) from dau_tien where luc >= p_tu and luc < p_den),
    'luot', (select count(*) from phan_hoi),
    'luot_da_tra_loi', (select count(*) from phan_hoi where giay is not null),
    'trung_vi_giay', (select percentile_cont(0.5) within group (order by giay) from phan_hoi where giay is not null),
    'cho_tra_loi', (select count(*) from cuoi where chieu = 'vao')
  ),
  'theo_ngay', coalesce((
    select json_agg(json_build_object('ngay', ngay, 'tin_nhan', tn, 'binh_luan', bl) order by ngay)
    from (
      select (tao_luc at time zone 'Asia/Ho_Chi_Minh')::date as ngay,
        count(*) filter (where loai = 'tin_nhan') as tn,
        count(*) filter (where loai = 'binh_luan') as bl
      from trong where chieu = 'vao' group by 1
    ) z
  ), '[]'),
  'theo_gio', coalesce((
    select json_agg(json_build_object('gio', gio, 'so', so) order by gio)
    from (select extract(hour from tao_luc at time zone 'Asia/Ho_Chi_Minh')::int as gio, count(*) as so from trong where chieu = 'vao' group by 1) z
  ), '[]'),
  'nhan_vien', coalesce((
    select json_agg(z) from (
      select n.id,
        (select count(*) from trong where chieu = 'ra' and nguoi_gui_id = n.id) as so_tin,
        (select count(*) from phan_hoi where nguoi_gui_id = n.id) as so_luot,
        (select percentile_cont(0.5) within group (order by giay) from phan_hoi where nguoi_gui_id = n.id) as trung_vi_giay,
        (select count(*) from don where nguoi_tao_id = n.id and trang_thai not in ('hoan', 'huy')) as so_don,
        (select coalesce(sum(tong), 0) from don where nguoi_tao_id = n.id and trang_thai not in ('hoan', 'huy')) as doanh_thu
      from (
        select nguoi_gui_id as id from trong where chieu = 'ra' and nguoi_gui_id is not null
        union select nguoi_tao_id from don where nguoi_tao_id is not null
      ) n
    ) z
  ), '[]'),
  'don', json_build_object(
    'so_don', (select count(*) from don where trang_thai not in ('hoan', 'huy')),
    'doanh_thu', (select coalesce(sum(tong), 0) from don where trang_thai not in ('hoan', 'huy')),
    'hoan', (select count(*) from don where trang_thai = 'hoan'),
    'huy', (select count(*) from don where trang_thai = 'huy'),
    'theo_ngay', coalesce((
      select json_agg(json_build_object('ngay', ngay, 'so_don', so_don, 'doanh_thu', doanh_thu) order by ngay)
      from (
        select (tao_luc at time zone 'Asia/Ho_Chi_Minh')::date as ngay, count(*) as so_don, sum(tong) as doanh_thu
        from don where trang_thai not in ('hoan', 'huy') group by 1
      ) z
    ), '[]')
  )
);
$$;
-- Chỉ máy chủ (service role) được gọi, khách vãng lai không gọi được qua API công khai
revoke execute on function bao_cao(timestamptz, timestamptz, text[], text[], text) from public, anon, authenticated;

-- ============ Trợ lý AI (Gemini) trả lời tự động ============
-- Mỗi Page một cài đặt. Thứ tự khi khách nhắn: kịch bản từ khóa → trợ lý AI → kịch bản "mọi tin mới".
create table if not exists tro_ly_ai (
  trang_id text primary key references fb_trang(id) on delete cascade,
  bat boolean not null default false,
  ap_dung text not null default 'tin_nhan' check (ap_dung in ('tin_nhan', 'binh_luan', 'ca_hai')),
  thong_tin text not null default '',        -- sản phẩm, giá, ship, đổi trả… AI chỉ trả lời dựa trên đây
  cach_noi text not null default '',         -- xưng hô, giọng điệu, lưu ý thêm
  nghi_gio int not null default 2,           -- AI im lặng nếu nhân viên vừa trả lời khách trong số giờ này
  cap_nhat_luc timestamptz not null default now()
);
alter table tro_ly_ai enable row level security;
-- AI tạm dừng với hội thoại này tới thời điểm này (khách cần người thật, hoặc nhân viên tự tắt)
alter table hoi_thoai add column if not exists ai_tam_dung_den timestamptz;
-- AI trả lời mọi tình huống: đứng trước kịch bản từ khóa (dùng chúng làm câu mẫu), không im lặng khi nhân viên vừa trả lời,
-- không tự dừng khi gặp ca khó (chỉ gắn thẻ "Cần tư vấn"). Nút tạm dừng AI theo từng khách trong Hộp thư vẫn có tác dụng.
alter table tro_ly_ai add column if not exists toan_quyen boolean not null default false;

-- ============ Live AI (nhân vật ảo dẫn livestream) ============
-- Mỗi phiên live: sản phẩm, thông tin, giọng đọc. "ma" là khóa bí mật trong link sân khấu mở bằng OBS.
create table if not exists phien_live (
  id uuid primary key default gen_random_uuid(),
  ma text not null unique,
  nguoi_dung_id text not null references nguoi_dung(id) on delete cascade,
  ten text not null default '',
  tiktok text not null default '',            -- tên TikTok (@...) để chương trình trên máy đọc bình luận
  thong_tin text not null default '',         -- thông tin shop / chính sách cho AI
  cach_noi text not null default '',
  loi_mo_dau text not null default '',
  giong text not null default 'Kore',
  san_pham jsonb not null default '[]',       -- [{ ten, gia, anh, mo_ta }]
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now()
);
create table if not exists live_binh_luan (
  id bigint generated always as identity primary key,
  phien_id uuid not null references phien_live(id) on delete cascade,
  ten text not null default '',
  noi_dung text not null default '',
  da_tra_loi boolean not null default false,
  tao_luc timestamptz not null default now()
);
create index if not exists live_binh_luan_phien on live_binh_luan (phien_id, id desc);
alter table phien_live enable row level security;
alter table live_binh_luan enable row level security;
-- Kịch bản đọc sẵn (các đoạn cách nhau bằng dòng trống): không có bình luận thì MC đọc lần lượt, không tốn lượt AI
alter table phien_live add column if not exists kich_ban text not null default '';
alter table phien_live alter column giong set default 'may';
