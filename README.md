# SafeInCloud cá nhân · 0.2.0
Ứng dụng độc lập, không liên kết với nhà phát hành SafeInCloud thương mại.

Repository: https://github.com/lehuynhanhtu-prog/SafeInCloud

## Chức năng
Kho mật khẩu APP, WEB, thẻ tín dụng, khóa cửa, email; thêm/sửa/xóa, tìm kiếm, trường tùy chỉnh, tạo mật khẩu, nhập CSV SafeInCloud với các cột chính xác `Title,Login,Password,URL,Notes,OTP`, sao lưu/khôi phục mã hóa, Google Drive.

Web/PWA là ứng dụng chính. Android mở cùng ứng dụng qua Chrome Custom Tabs; Windows mở qua Edge app mode. Hai bản này là trình mở ứng dụng web, chưa phải kho native độc lập. Bản Web dự kiến triển khai trên GitHub Pages: https://lehuynhanhtu-prog.github.io/SafeInCloud/ Cài PWA bằng trình duyệt có hỗ trợ. Không có chức năng tự điền mật khẩu hệ thống, sinh mã OTP hay sinh trắc học trong bản này; trường OTP được giữ nguyên khi nhập.

File mẫu đính kèm có sáu cột và 115 dòng trống, không chứa tài khoản/mật khẩu. Bộ nhập bỏ qua các dòng trống.

## Google Cloud
Authorized JavaScript origin: `https://lehuynhanhtu-prog.github.io` (không gồm đường dẫn `/SafeInCloud/`).
Project number: 862228353042. Web Client ID đã điền từ cấu hình Sổ Xe cá nhân; cần xác nhận trong Console nếu ID đã đổi. Bật Drive API, thêm origin chính xác của web SafeInCloud vào Authorized JavaScript origins, thêm email vào Test users. Không dùng Client Secret hay Picker API key. Chỉ xin quyền drive.appdata, kho nằm trong vùng dữ liệu ứng dụng riêng trên Drive.

Lưu Drive tạo một snapshot mới, không ghi đè bản cũ. Để dùng kho trên thiết bị khác: màn hình khóa → Mở kho từ Google Drive → chọn đúng tài khoản → xác nhận → nhập mật khẩu chính. Khi khôi phục kho khác, bản mã cũ được tải xuống trước. Sau sửa dữ liệu, nhấn Đồng bộ Drive để lưu snapshot. Không tự hợp nhất dữ liệu giữa thiết bị; snapshot cũ được giữ và chưa có giao diện dọn dẹp.

Mật khẩu chính mới tối thiểu 6 ký tự; chấp nhận chữ, số và ký tự đặc biệt. Các kho cũ vẫn mở bằng mật khẩu gốc. Client ID được ẩn khỏi giao diện; đây là định danh OAuth công khai, không phải khóa mã hóa. Import file CSV có ở màn hình đăng nhập và thanh công cụ sau mở khóa.

## Bảo mật và giới hạn
AES-256-GCM với IV ngẫu nhiên 96-bit mỗi lần lưu; PBKDF2-HMAC-SHA256 600.000 vòng, salt 128-bit. Mật khẩu chính và khóa chỉ ở bộ nhớ phiên. Không lưu bản rõ ở localStorage hoặc Drive. Google token chỉ ở bộ nhớ. Tự khóa 5 phút không hoạt động, khi rời ứng dụng (ngoại trừ popup OAuth trong thời gian ngắn), khi thay đổi kho ở tab khác. Các cửa sổ ghi cùng thiết bị được điều phối bằng Web Locks. Clipboard là do hệ điều hành quản lý, cần xóa thủ công; không hứa tự xóa vì trình duyệt không luôn cho phép.

CSV được xử lý trên thiết bị khi người dùng nhập; file thật và dữ liệu nhập không có trong repository. Không gửi thông tin mật khẩu qua analytics/log. Không lưu thẻ vào thanh toán, không xử lý giao dịch. Thiết bị nhiễm mã độc, extension độc hại hoặc mã nguồn web bị thay thế vẫn có thể đọc kho đang mở. Đây là bản đầu đã kiểm tra chức năng mã hóa, chưa được kiểm toán bảo mật độc lập. Không thể phục hồi kho nếu mất mật khẩu chính. Giữ bản sao mã hóa ở nơi an toàn.

## Chạy và build
Node 22+: `npm test`. Chạy local: `npm start`, mở localhost:8080. OAuth cần localhost origin tương ứng. HTTPS bắt buộc khi xuất bản; localStorage và Web Locks cần trình duyệt hiện đại.

GitHub Actions `build.yml` chạy kiểm tra và tạo Web, APK debug và Windows executable. APK debug phục vụ thử nghiệm, không thay thế bản release có chữ ký ổn định. Bản Windows chưa có Authenticode. Cần chạy workflow sau khi repository được tạo và tải artifact. Chưa kiểm thử trực tiếp trên Android/Windows trong môi trường hiện tại.

Trước khi phát hành chính thức: kiểm tra Google OAuth trên các thiết bị thật, ký bản Android/Windows, kiểm toán bảo mật, kiểm tra khôi phục từ bản sao, quyết định tên thương hiệu để tránh nhầm với sản phẩm SafeInCloud hiện có.

## Triển khai GitHub Pages
Trong Settings → Pages, chọn Source: GitHub Actions. Workflow `pages.yml` kiểm tra rồi xuất bản riêng thư mục `dist/`. Tài khoản hiện tại yêu cầu repository Public hoặc nâng cấp gói để bật Pages.

Khi đổi từ địa chỉ web cũ sang GitHub Pages, localStorage không tự chuyển vì khác origin. Tại web cũ hãy tải sao lưu mã hóa, rồi Khôi phục ở web mới; hoặc mở snapshot đã đồng bộ trên Google Drive với cùng tài khoản và mật khẩu chính. Không nhập CSV để thay thế bản sao mã hóa nếu cần giữ đầy đủ kho.
