# Cài đặt công cụ Quản lý Fanpage (đăng nhập Facebook)

Công cụ nằm ở `/quan-ly`: hộp thư chung tin nhắn + bình luận, tự ẩn bình luận có SĐT, trả lời nhanh bằng mẫu câu, gắn thẻ, tự trả lời theo từ khóa.
Dùng Facebook Graph API chính thức — không cần (và không được) đưa mật khẩu Facebook cho ai.

## 1. Tạo bảng trong Supabase
Supabase → SQL Editor → dán toàn bộ `supabase/schema.sql` → Run.

## 2. Tạo Facebook App
1. Vào https://developers.facebook.com/apps → **Tạo ứng dụng** → loại **Doanh nghiệp (Business)**.
2. Thêm sản phẩm **Đăng nhập bằng Facebook cho doanh nghiệp** (hoặc Facebook Login) và **Messenger**, **Webhooks**.
3. **Cài đặt → Cơ bản**: lấy *ID ứng dụng* và *Khóa bí mật*. Điền:
   - URL chính sách quyền riêng tư: `https://<web>/chinh-sach-bao-mat`
   - URL hướng dẫn xóa dữ liệu: `https://<web>/xoa-du-lieu`
   - Miền ứng dụng: `<web>` (ví dụ `cong-nghe-24h-media.vercel.app`)
4. **Facebook Login → Cài đặt**: thêm *URI chuyển hướng OAuth hợp lệ*:
   `https://<web>/api/fb/callback` (chạy thử trên máy thì `http://localhost:3000/api/fb/callback`).
5. **Webhooks** → chọn đối tượng **Page** → *Đăng ký*:
   - URL gọi lại: `https://<web>/api/fb/webhook`
   - Mã xác minh: đúng giá trị `FB_VERIFY_TOKEN`
   - Tích các trường: `messages`, `messaging_postbacks`, `feed`.
   (Webhook bắt buộc là HTTPS công khai — dùng bản trên Vercel, không dùng localhost.)

## 3. Biến môi trường (Vercel → Settings → Environment Variables, và `.env.local`)
```
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FB_VERIFY_TOKEN=<chuỗi tự đặt>
SESSION_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>
```
Deploy lại sau khi thêm.

## 4. Dùng thử
Vào `https://<web>/dang-nhap` → Đăng nhập bằng Facebook → chọn các Page → vào Hộp thư.
Khi app ở **chế độ phát triển**, chỉ người có vai trò trong app (Quản trị viên/Nhà phát triển/Người thử nghiệm) dùng được, và chỉ với Page họ quản lý. Nhắn thử vào Page bằng một nick có vai trò đó.

## 5. Mở cho khách hàng dùng (App Review)
Để Page của người ngoài dùng được, phải gửi Meta duyệt (App Review) các quyền:
`pages_show_list, pages_messaging, pages_read_engagement, pages_manage_engagement, pages_manage_metadata, pages_read_user_content, business_management`
— cần xác minh doanh nghiệp, quay video màn hình minh họa từng quyền được dùng thế nào. Duyệt xong chuyển app sang **Trực tiếp (Live)**.

## Giới hạn của Facebook cần biết
- Chỉ nhắn được cho khách trong **24 giờ** kể từ tin cuối khách gửi.
- **Nhắn riêng** từ bình luận: mỗi bình luận 1 lần, trong 7 ngày.
- Chỉ nhận tin/bình luận phát sinh **sau khi** kết nối (chưa đồng bộ lịch sử cũ).
