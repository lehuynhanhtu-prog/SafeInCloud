# SafeInCloud cá nhân · 0.5.4
Ứng dụng độc lập, không liên kết với nhà phát hành SafeInCloud thương mại.

Repository: https://github.com/lehuynhanhtu-prog/SafeInCloud

## Chức năng
Kho mật khẩu APP, WEB, Email, Bank, thẻ tín dụng và khóa cửa; thêm/sửa/xóa, tìm kiếm, trường tùy chỉnh dạng văn bản hoặc mật khẩu, tạo mật khẩu, nhập CSV SafeInCloud với các cột chính xác `Title,Login,Password,URL,Notes,OTP`, sao lưu/khôi phục mã hóa, Google Drive.

Web/PWA là ứng dụng chính. Android Native 1.3.1 dùng Android Views, Android Keystore và BiometricPrompt, không dùng WebView/Custom Tabs. Windows Portable mở đúng bản Web qua Edge app mode. Cả ba bản dùng cùng một kho mã hóa trên một tài khoản Google. Hướng dẫn Android: [android/README-native.md](android/README-native.md). Web: https://lehuynhanhtu-prog.github.io/SafeInCloud/

File mẫu đính kèm có sáu cột và 115 dòng trống, không chứa tài khoản/mật khẩu. Bộ nhập bỏ qua các dòng trống.

## Google Cloud
Authorized JavaScript origin: `https://lehuynhanhtu-prog.github.io` (không gồm đường dẫn `/SafeInCloud/`).
Project number: 862228353042. Web Client ID đã điền từ cấu hình Sổ Xe cá nhân; cần xác nhận trong Console nếu ID đã đổi. Bật Drive API, thêm origin chính xác của web SafeInCloud vào Authorized JavaScript origins và email vào Test users. Web xin `openid email` để hiển thị/khóa đúng tài khoản cùng scope `drive.appdata`; Android lấy email từ AccountPicker. Không dùng Client Secret hay Picker API key. Kho nằm trong vùng dữ liệu ứng dụng riêng trên Drive.

Nguyên tắc dữ liệu: **một tài khoản Google = một file kho hiện hành `AT_SafeInCloud.vault`**. Đồng bộ lần đầu nhận diện snapshot mới nhất và đánh dấu nó là file hiện hành; các lần sau cập nhật đúng file đó thay vì tạo snapshot mới. Web, Android và Windows Portable chọn cùng email sẽ đọc/ghi cùng kho. Ứng dụng lưu hash lần đồng bộ gần nhất để xác định bên nào thay đổi; nếu cả thiết bị và Google cùng thay đổi, Google được coi là nguồn chung nhưng người dùng phải xác nhận trước khi thay dữ liệu cục bộ. Không tự hợp nhất hai bản mã khác nhau.

Mật khẩu chính mới tối thiểu 6 ký tự; chấp nhận chữ, số và ký tự đặc biệt. Các kho cũ vẫn mở bằng mật khẩu gốc. Client ID được ẩn khỏi giao diện; đây là định danh OAuth công khai, không phải khóa mã hóa. Import file CSV nằm trong Cài đặt và thanh công cụ sau mở khóa.

## Bảo mật và giới hạn
AES-256-GCM với IV ngẫu nhiên 96-bit mỗi lần lưu; PBKDF2-HMAC-SHA256 600.000 vòng, salt 128-bit. Mật khẩu chính và khóa chỉ ở bộ nhớ phiên. Không lưu bản rõ ở localStorage hoặc Drive. Google token chỉ ở bộ nhớ. Tự khóa 5 phút không hoạt động, khi rời ứng dụng (ngoại trừ popup OAuth trong thời gian ngắn), khi thay đổi kho ở tab khác. Các cửa sổ ghi cùng thiết bị được điều phối bằng Web Locks. Clipboard là do hệ điều hành quản lý, cần xóa thủ công; không hứa tự xóa vì trình duyệt không luôn cho phép.

CSV được xử lý trên thiết bị khi người dùng nhập; file thật và dữ liệu nhập không có trong repository. Không gửi thông tin mật khẩu qua analytics/log. Không lưu thẻ vào thanh toán, không xử lý giao dịch. Thiết bị nhiễm mã độc, extension độc hại hoặc mã nguồn web bị thay thế vẫn có thể đọc kho đang mở. Đây là bản đầu đã kiểm tra chức năng mã hóa, chưa được kiểm toán bảo mật độc lập. Không thể phục hồi kho nếu mất mật khẩu chính. Giữ bản sao mã hóa ở nơi an toàn.

## Chạy và build
Node 22+: `npm ci` rồi `npm test`. Chạy local: `npm start`, mở localhost:8080. OAuth cần localhost origin tương ứng. HTTPS bắt buộc khi xuất bản; localStorage và Web Locks cần trình duyệt hiện đại.

GitHub Actions `build.yml` chạy kiểm tra và tạo Web, APK native release có chữ ký cố định và Windows executable. APK được kiểm tra fingerprint release trước khi tải lên. Bản Windows chưa có Authenticode. Cần chạy workflow sau khi repository được tạo và tải artifact. Chưa kiểm thử trực tiếp trên Android/Windows trong môi trường hiện tại.

Trước khi phát hành chính thức: kiểm tra Google OAuth trên các thiết bị thật, ký bản Android/Windows, kiểm toán bảo mật, kiểm tra khôi phục từ bản sao, quyết định tên thương hiệu để tránh nhầm với sản phẩm SafeInCloud hiện có.

## Triển khai GitHub Pages
Trong Settings → Pages, chọn Source: GitHub Actions. Workflow `pages.yml` kiểm tra rồi xuất bản riêng thư mục `dist/`. Tài khoản hiện tại yêu cầu repository Public hoặc nâng cấp gói để bật Pages.

Khi đổi từ địa chỉ Web cũ sang GitHub Pages, localStorage không tự chuyển vì khác origin. Tại thiết bị chưa có dữ liệu, chọn **Đồng bộ từ tài khoản Google**, chọn đúng email và nhập mật khẩu chính của kho sau khi tải. Có thể dùng sao lưu mã hóa để phục hồi thủ công.

## Đăng nhập và sinh trắc học (0.4)

Màn hình khóa chỉ có mật khẩu (mặc định ẩn) và mở khóa bằng xác minh thiết bị khi đã bật. Thiết bị chưa có kho có nút **Đồng bộ từ tài khoản Google** để lấy kho chung. Trong Cài đặt, mục **Đồng bộ tài khoản Google** hiển thị email đang gắn với kho và chỉ cho dùng lại email đó. Không còn mục “Mở kho từ Google Drive” hoặc “Tải bản mã kho trước”.

Sau khi mở kho bằng mật khẩu, chọn Cài đặt → Bật vân tay / khuôn mặt và xác nhận mật khẩu chính. WebAuthn platform passkey yêu cầu user verification; PRF + HKDF-SHA256 tạo khóa AES-256-GCM để bảo vệ mật khẩu chính. Chỉ lưu bản mã, credential ID, IV và salt; không lưu mật khẩu dạng rõ. Sinh trắc học do hệ điều hành quản lý. Có thể dùng PIN/mã khóa màn hình tùy thiết bị; ứng dụng không ép riêng vân tay hoặc khuôn mặt. Thiết bị/trình duyệt không có PRF sẽ từ chối bật tính năng và tiếp tục dùng mật khẩu. Không đồng bộ thiết lập mở khóa nhanh theo file sao lưu của kho. Passkey có thể được hệ điều hành đồng bộ tùy nhà cung cấp; thay kho sẽ vô hiệu thiết lập của kho cũ trên trình duyệt. Xóa thiết lập trong app không xóa passkey trong hệ điều hành.

Sau lần nhập mật khẩu sai thứ 6, hỏi tạo database mới. Đây là gợi ý phục hồi, không phải cơ chế chống dò mật khẩu offline. Chỉ đếm lỗi xác thực AES-GCM; lỗi định dạng, hủy passkey hoặc lỗi mạng không tính là sai mật khẩu. Bộ đếm lưu trên trình duyệt và xóa khi mở kho thành công. Người dùng có thể hủy và thử tiếp.

Tạo database mới yêu cầu chọn đúng tài khoản Google đang gắn với kho và nhập/xác nhận mật khẩu mới. File hiện hành trên Google được cập nhật thành kho mới trước khi đổi bản cục bộ; nếu lỗi hoặc hủy, kho cục bộ hiện tại không bị thay. Cần sao lưu thủ công trước nếu còn cần dữ liệu cũ. Mất mật khẩu và không có passkey hoạt động không thể giải mã kho. Chưa kiểm thử sinh trắc học trên điện thoại thật.

Tham chiếu PRF: https://www.w3.org/TR/webauthn-3/#prf-extension


## Nhập trực tiếp SafeInCloud .db (Web 0.5.4 / Android 1.3.1)

Mở hoặc tạo kho đích trước. Chọn **Cài đặt → Nhập dữ liệu → Nhập SafeInCloud .db** → chọn file `.db` → nhập **mật khẩu của file nguồn** → Giải mã → kiểm tra số mục → xác nhận nhập. Mật khẩu nguồn có thể khác mật khẩu chính của kho đích. Sai mật khẩu, hủy hoặc khóa kho trước khi xác nhận không làm thay đổi kho hiện tại. Không ghi nhớ mật khẩu nguồn và không gửi file/dữ liệu giải mã lên mạng.

Bộ nhập hỗ trợ định dạng SafeInCloud legacy v1 (magic 0x0505, version 1), PBKDF2-HMAC-SHA1 10.000 vòng, hai lớp AES-256-CBC, zlib và XML. Thuật toán này chỉ dùng để đọc file nguồn; dữ liệu nhập được mã hóa lại trong kho `.vault` bằng AES-256-GCM/PBKDF2-SHA256 600.000 vòng. Không thay định dạng kho hiện có. Đây là ứng dụng độc lập, không phải Safe thương mại.

Web và Android Native chuẩn hóa dữ liệu `.db` thành `Name` (tên mục), `Login`, `Password`, `PIN`, `URL`, `Note`, `Label`; các trường khác được ghép vào `Note` theo dạng `Tên trường: giá trị`. Bỏ qua trường chứa `Lịch sử`/`History` và giá trị history cũ. Login dạng email tự bổ sung `Email` vào `Label`. Nhãn `Bank` tạo loại Bank và trường `Account`; `Web Logins` hoặc mục có URL → WEB; nhãn/tài khoản email → Email; nhãn thẻ tín dụng và khóa cửa → loại tương ứng; còn lại → APP. Web và Android mặc định phục hồi tệp đính kèm đọc được.

Trên Web, Import `.db`/CSV, đồng bộ Drive, sao lưu, khôi phục, tải ứng dụng và **Xóa toàn bộ dữ liệu** đều nằm trong **Cài đặt**. Xóa toàn bộ làm rỗng các mục/tệp đính kèm của kho hiện tại sau xác nhận nhưng giữ mật khẩu kho và bản sao lưu cũ. Giao diện kho dùng hai cột trên màn hình lớn, chuyển sang bố cục gọn trên máy tính bảng và điều hướng đáy với Cài đặt toàn màn hình trên điện thoại. Khi thêm hoặc sửa mục, mỗi trường mới có thể chọn kiểu **Văn bản** hoặc **Mật khẩu**.

Giới hạn: file nguồn 10 MB, XML giải nén 20 MB, tổng kho đích tối đa 20.000 mục. Không hợp nhất hoặc loại trùng: nhập lại sẽ tạo mục mới. Giữ nguyên file nguồn. Có kiểm tra checksum zlib và cấu trúc XML; định dạng CBC nguồn không cung cấp bảo đảm xác thực như kho AES-GCM đích. XML có DOCTYPE/ENTITY bị từ chối.

File sao lưu tải về và file kho chung trên Google đều có tên **AT_SafeInCloud.vault**. Google giữ một file hiện hành được cập nhật tại chỗ; sao lưu tải xuống vẫn là bản độc lập. Đuôi `.vault` là định dạng riêng của app, không phải file `.db` để Safe thương mại mở lại.

Kiểm thử sử dụng hoàn toàn dữ liệu giả: fixture dùng chung Web/Android với mật khẩu Unicode, giữ trường tùy chỉnh/ghi chú/nhãn, sai mật khẩu, file hỏng/thiếu, phiên bản không hỗ trợ, XML độc hại, giới hạn giải nén, kho lớn và luồng hủy/khóa/xác nhận Web. File kho thật và mật khẩu người dùng không được đưa vào repository.

Bộ giải nén pako 2.1.0 được đóng gói cục bộ để PWA hoạt động offline, không cần CDN; giấy phép ở `dist/vendor/PAKO-LICENSE.txt`. Tham khảo định dạng: https://github.com/mxschmitt/golang-safe-in-cloud (MIT). Chưa kiểm thử UI trên thiết bị Android thật.
