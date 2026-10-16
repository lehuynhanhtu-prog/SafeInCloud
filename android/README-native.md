# SafeInCloud Android Native 1.1.1

Android 8.0+ (minSdk 26), package `vn.safeincloud.personal`, versionCode 5.
Giao diện Material 3 và xử lý kho viết bằng Java/Android Views; không có WebView, Custom Tabs hay JavaScript bridge. Form dùng nhãn nổi, nút ẩn/hiện tích hợp, thẻ thông tin và điều hướng dưới native. Cài đặt chỉ xuất hiện khi kho đã mở.

## Dữ liệu và bảo mật

AES-256-GCM, IV ngẫu nhiên 12 byte, salt 16 byte, PBKDF2-HMAC-SHA256 600.000 vòng; cùng format `.vault` version 1 với Web. Kho lưu bằng AtomicFile trong thư mục private không sao lưu tự động. Không ghi plaintext ra file/log. Mật khẩu ẩn mặc định, hỗ trợ Unicode, tối thiểu 6 code point cho kho mới. Khóa khi rời app hoặc không thao tác 5 phút. Hộp chọn file/Google và xác minh sinh trắc học là các luồng hệ thống được chờ tối đa theo thời gian tự khóa.

Sinh trắc học dùng AndroidX BiometricPrompt với CryptoObject + khóa AES 256 trong Android Keystore, yêu cầu BIOMETRIC_STRONG cho mỗi lần sử dụng. Chỉ vân tay/khuôn mặt bảo mật mạnh được hệ điều hành chấp nhận. Không có PIN dự phòng trong hộp sinh trắc học; có thể dùng mật khẩu chính của app. Khóa bị vô hiệu khi thay đổi đăng ký sinh trắc học. Cần xác nhận mật khẩu trước khi bật. Chỉ lưu bản mã của khóa kho; không lưu mật khẩu chính. Bản sao kho/Drive không chứa khóa biometric. FLAG_SECURE chặn ảnh chụp màn hình và nội dung gần đây. Clipboard có thời hạn 30 giây, không xóa nếu người dùng đã chép nội dung khác.

Sai mật khẩu lần thứ 6 hỏi tạo database mới. Nếu đồng ý, chọn Google lại, đặt mật khẩu mới và upload snapshot mới thành công trước khi thay bản local. Bản kho trước được giữ riêng để xuất từ Cài đặt. Đây là gợi ý phục hồi, không phải chống dò offline. Không giải mã được dữ liệu cũ nếu mất mật khẩu cũ và không còn biometric hoạt động.

## Cấu hình Google Cloud cho bản native

Dùng cùng Google Cloud project đã bật Drive API. OAuth Web Client ID không thay thế OAuth Android.

Tạo OAuth client loại **Android** trong Google Auth Platform/Clients với:

- Package: `vn.safeincloud.personal`
- SHA-1 release: `64:60:37:A7:A6:CA:84:4E:42:AE:EA:4D:05:04:75:FD:CC:04:50:EE`
- SHA-256 release: `366FE429C1160AB8B1A4BF4E0D987C0DE675422E86AEFD4149C880DDF94AE15E`

Chỉ xin scope `https://www.googleapis.com/auth/drive.appdata`. Dùng Google AccountPicker luôn cho chọn lại tài khoản, sau đó Google Identity AuthorizationClient xin quyền. Không cần nhúng client secret hay Web Client ID. OAuth consent/Test users theo trạng thái dự án hiện có. Nếu đăng nhập báo cấu hình chưa đúng, kiểm tra cặp package/SHA-1 và scope của dự án. Đăng ký Android OAuth và kiểm thử tài khoản thật chưa được thực hiện trong phiên build này.

Tạo kho offline, thêm/sửa/xóa, CSV và xuất/khôi phục file dùng được không cần Google. Tạo kho mới sau quên mật khẩu yêu cầu Google thành công. Đồng bộ tạo snapshot, không hợp nhất dữ liệu; các bản cũ trên Drive được giữ.

## Chuyển từ APK cũ

Trước khi gỡ APK debug cũ, xuất bản sao `.vault` từ Web hoặc lưu lên Drive. Bản native có kho private riêng, không tự đọc localStorage của Chrome. Khôi phục `.vault` rồi dùng mật khẩu cũ, hoặc mở từ Drive sau khi cấu hình OAuth Android. Chữ ký release mới khác debug cũ nên có thể cần gỡ bản cũ trước khi cài. Các bản native tiếp theo dùng cùng khóa release trong Actions Secrets.

## Build và kiểm chứng

GitHub Actions giải mã keystore từ Secrets vào RUNNER_TEMP, chạy `testDebugUnitTest assembleRelease`, kiểm tra fingerprint APK rồi xóa keystore tạm. Không fallback về debug/unsigned nếu thiếu Secrets. Các secret: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.

Kiểm thử: mở fixture do Web tạo bằng mật khẩu Unicode, round trip AES-GCM, chống sửa bản mã/sai mật khẩu, IV ngẫu nhiên, xóa byte khóa session, CSV dấu ngoặc kép/newline/OTP. Build thành công không thay cho kiểm thử thiết bị: chưa xác nhận biometric, SAF hoặc Google OAuth trên điện thoại thật. Chưa kiểm toán bảo mật độc lập.
