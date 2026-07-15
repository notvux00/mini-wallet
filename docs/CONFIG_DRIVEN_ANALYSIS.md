# Đánh giá Mức độ Config-Driven của Hệ thống

**Trạng thái hiện tại:** Hệ thống đang ở mức “config-driven một phần”. Mức độ này rất tốt cho việc cấu hình các biến thể của luồng có sẵn, nhưng chưa thể thêm một loại nghiệp vụ mới hoàn toàn mà không phải can thiệp vào mã nguồn backend/frontend.

## 1. Những phần ĐÃ đạt chuẩn Config-Driven:
- Các thông số cơ bản như **Service, field, fee, PIN/NONE, GL steps** và **validation min/max** đều đã được lưu cấu hình trong Database.
- Quản trị viên (Officer) có thể tạo/chỉnh sửa service, map các trường dữ liệu (field) và thiết lập bút toán kế toán (GL steps) trực tiếp từ CMS mà không cần sửa code.

## 2. Những phần CHƯA đạt chuẩn Config-Driven:
- **Loại luồng (Action/Flow) bị hard-code**: Các action như `billerTrans`, `cashIn`, `bankDeposit`, `bankWithdraw`... đang bị cố định ở Model, ServiceBuilder và transaction engine. Việc thêm một loại luồng mới đòi hỏi phải sửa code ở nhiều nơi.
  - *Tham chiếu:* `Service.js` (line 16), `NeonMessage.js` (line 168), `OfficerServiceController.js` (line 85).
- **Rule validation hard-code**: Các rule validation hiện đang là tên các hàm hard-code trong hệ thống; cấu hình chỉ là việc chọn từ danh sách các hàm có sẵn đó.
  - *Tham chiếu:* `NeonMessage.js` (line 298).
- **Resolver cố định**: Cơ chế giải quyết các trường dữ liệu (ví dụ: “tìm ví theo SĐT/biller/bank link”) đang được thực hiện thông qua Regex và code cố định, chưa phải là một engine dạng plugin động.
  - *Tham chiếu:* `NeonMessage.js` (line 108).
- **Frontend thiếu khả năng sinh động (Dynamic UI)**: Frontend vẫn sử dụng các màn hình riêng biệt với service code cố định cho từng luồng (đặc biệt là P2P, Bill, Bank). Do đó, khi tạo một service mới từ CMS, hệ thống chưa tự động sinh ra được UI/Form tương ứng cho người dùng.

## 3. Tổng kết & Bước tiếp theo
**Tóm lại:** Hệ thống hiện tại có đủ mức độ config-driven để phục vụ cho MVP hoặc CMS nội bộ với 4–5 nghiệp vụ hiện hữu. Tuy nhiên, chưa đủ để đạt được mục tiêu lý tưởng: *“thêm loại giao dịch mới hoàn toàn không cần deploy code”*.

**Hướng đi để đạt mức hoàn toàn Config-Driven:**
1. Thay thế các `action` cố định bằng một cơ chế **registry/plugin handler** động.
2. Chuyển đổi các module như: `field resolver`, `validation`, `adapter ngoài` và đặc biệt là `form UI` sang sử dụng **schema cấu hình** (Schema-driven Development).
