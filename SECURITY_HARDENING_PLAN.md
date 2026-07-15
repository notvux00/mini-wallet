# Kế hoạch hardening luồng ví

## Mục tiêu

Sửa lỗi khóa ví, brute-force, SSRF và checksum mà không đổi API thành công hiện tại hoặc làm hỏng các integration flow đang có.

## Tasks

- [ ] Tạo branch `fix/security-core-hardening`; chụp baseline `npm.cmd test` và thêm test tái hiện từng lỗi trước khi sửa → Verify: baseline 12/12 pass, các test mới ban đầu fail đúng lý do.
- [ ] Sửa khóa ví ở `NeonMessage`: tách rõ `status` (khóa nghiệp vụ của officer) và `state` (lock tạm thời), kiểm tra cả hai trước hạch toán, lưu lock owner và chỉ hoàn nguyên lock mình sở hữu → Verify: P2P success/failure vẫn pass, ví có `status: inactive` bị từ chối và không bị tự mở lại.
- [ ] Thêm primitive Redis dùng một lần cho OTP (`GETDEL` hoặc Lua) và bộ đếm giới hạn thử theo `linkId`; xóa/cấm OTP sau thành công → Verify: OTP đúng chỉ dùng một lần, sai vượt ngưỡng bị chặn, OTP flow cũ vẫn pass.
- [ ] Thêm rate limit/login failure counter cho cả customer và officer, với cửa sổ TTL và reset sau đăng nhập đúng → Verify: sai vượt ngưỡng bị từ chối; lần đăng nhập đúng sau reset vẫn nhận token hợp lệ.
- [ ] Tạo validator URL Biller dùng `URL` parser, chỉ HTTPS và allowlist hostname; chặn localhost, IPv4/IPv6 loopback, private/link-local và hostname resolve vào các dải này → Verify: create/update từ chối URL nguy hiểm; endpoint mock được cho phép riêng trong test environment.
- [ ] Thay `MD5` bằng `HMAC-SHA-256`, đổi tên cấu hình salt thành secret; cập nhật seed/test assertion và kế hoạch migration checksum hiện có → Verify: checksum mới đổi khi balance/user đổi, mọi flow tiền vẫn pass.
- [ ] Chạy full regression, lint và tests cạnh tranh/negative; kiểm tra diff không đổi request/response contract thành công → Verify: `npm.cmd test`, lint, và test security mới đều pass.

## Done when

- [ ] Không còn luồng tự mở lại ví đã bị khóa thủ công.
- [ ] OTP và login có rate limit, lockout và reset hợp lệ.
- [ ] URL Biller không thể truy cập địa chỉ nội bộ/trái phép.
- [ ] Checksum mới dùng HMAC-SHA-256.
- [ ] Toàn bộ integration suite và các test hồi quy bảo mật pass.

## Notes

- Không gộp thay đổi idempotency/outbox Biller vào nhánh này; đó là thay đổi kiến trúc riêng sau khi hardening core được merge.
- Test hiện dùng `localhost` cho mock Biller, nên validator phải có injection/allowlist dành riêng cho `NODE_ENV=test`, không mở ngoại lệ tương tự ở production.
