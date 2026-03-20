# Cloudinary Setup Guide - Hướng dẫn cấu hình Cloudinary

## Bước 1: Tạo tài khoản Cloudinary
1. Vào https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí (Free tier có 25GB storage)
3. Xác nhận email

## Bước 2: Lấy Cloud Name
1. Đăng nhập vào https://console.cloudinary.com
2. Vào phần **"Dashboard"** hoặc **"Settings"** → **"Account"** → **"Basic Settings"**
3. Tìm mục **"Cloud Name"** (gọi là Cloud ID trên một số version)
4. Copy giá trị này

## Bước 3: Tạo Upload Preset (Unsigned)
1. Vào **"Settings"** → **"Upload"** (hoặc **"Uploads"**)
2. Scroll xuống mục **"Upload presets"**
3. Bấm nút **"Add upload preset"**
4. Điền tên (ví dụ: `astra-oasis-upload`)
5. Chọn **"Signing Mode"** = **"Unsigned"** (QUAN TRỌNG!)
6. Bấm **"Save"**
7. Copy tên preset vừa tạo

## Bước 4: Cập nhật file .env.local
Mở file `frontend/.env.local` và điền:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name_here
```

**Ví dụ:**
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=d9x8f7k3j
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=astra-oasis-upload
```

## Bước 5: Restart development server
```bash
# Dừng server (Ctrl+C) nếu đang chạy
# Sau đó chạy lại:
npm run dev
```

## Bước 6: Test đăng tải (upload) ảnh
1. Vào trang "Create Coin"
2. Kéo thả ảnh vào khu vực upload hoặc bấm để chọn file
3. Ảnh sẽ upload trực tiếp lên Cloudinary
4. Sẽ thấy preview ngay lập tức
5. Khi tạo coin, ảnh sẽ được lưu vào database

## Troubleshooting

### "Configuration missing" error
- Kiểm tra `.env.local` có giá trị đúng không
- Không được để `your_cloudinary_cloud_name` - phải là giá trị thật
- Restart server sau khi sửa `.env.local`

### Upload không thành công
- Kiểm tra "Signing Mode" phải là "Unsigned"
- Kiểm tra preset name chính xác
- Kiểm tra CORS settings trong Cloudinary (File > Security)

### Hình không hiển thị trên coin card
- Kiểm tra database có `image_url` column không
- Verify endpoint `/api/upload` trả về URL đúng
- Check browser console (F12 → Network tab)

## Tính năng Upload
✅ Drag & drop hình  
✅ Click để chọn file  
✅ Preview trước khi tạo coin  
✅ Hình tự động upload lên Cloudinary CDN  
✅ Link hình lưu vào database  
✅ Hình hiển thị trên coin cards  

## Security Notes
- Sử dụng "Unsigned" upload vì không cần backend authentication
- NEXT_PUBLIC_* biến có thể truy cập từ client (không bảo mật)
- Upload preset "Unsigned" giới hạn bằng Cloudinary settings
- Không expose API secret trong client code

## Links
- Cloudinary Console: https://console.cloudinary.com
- Account Settings: https://console.cloudinary.com/settings
- Upload Settings: https://console.cloudinary.com/settings/upload
- Documentation: https://cloudinary.com/documentation
