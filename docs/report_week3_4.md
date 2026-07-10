# BÁO CÁO THỰC TẬP - CẬP NHẬT GIAI ĐOẠN 2 (TUẦN 3 & 4)

**NGÀNH:** KHOA HỌC MÁY TÍNH  
**ĐỀ TÀI:** HỆ THỐNG VÍ ĐIỆN TỬ MINI WALLET  

---

## MỤC LỤC
I. Giới thiệu chung  
II. Yêu cầu bài toán  
III. Cơ sở lý thuyết và Giải pháp kĩ thuật (Cập nhật Giải pháp lập trình)  
IV. Mô tả phần mềm cài đặt  
V. Kết quả đạt được, hướng phát triển  

---

## I. Giới thiệu chung

### 1. Giới thiệu về công ty
*(Giữ nguyên như báo cáo trước: Giới thiệu JITS Innovation Labs, định hướng Fintech...)*

### 2. Giới thiệu công việc
Trong 2 tuần vừa qua (Tuần 3 và 4), nhiệm vụ của em đã chuyển sang giai đoạn **Lập trình và Triển khai (Implementation)**. Dựa trên bộ tài liệu thiết kế kỹ thuật (Technical Design) đã được phê duyệt ở giai đoạn trước, em đảm nhiệm việc phát triển mã nguồn thực tế cho toàn bộ hệ thống Mini Wallet. 

Cụ thể, với khối lượng công việc lớn trong 2 tuần này, em đã hoàn thành các chức năng và hạng mục lập trình sau:

- **Phát triển Backend Core Engine (Node.js/Sails.js):**
  - Xây dựng máy lõi xử lý giao dịch chuẩn 3 bước (Request - Confirm - Verify) tuân thủ hoàn toàn kiến trúc Config-driven.
  - Áp dụng cơ chế Transaction trên MongoDB kết hợp với kỹ thuật Lock để đảm bảo tính nguyên tử (ACID), xử lý an toàn bút toán ghi sổ kép và bảo mật số dư bằng mã băm Checksum.
  - Trực tiếp lập trình và cấu hình các luồng nghiệp vụ thực tế: Chuyển tiền (P2P), Thanh toán hóa đơn (Bill Payment), và **Nạp tiền điện thoại (Top-up)**.
  - Xây dựng module **Liên kết ngân hàng (Bank linking)** để xử lý luồng giao tiếp giữa ví và ngân hàng, hỗ trợ các giao dịch nạp tiền (Cash-in) và rút tiền.

- **Xây dựng Mock Biller (Dịch vụ giả lập bên thứ ba):**
  - Phát triển một service phụ độc lập đóng vai trò là đối tác cung cấp dịch vụ (hóa đơn điện nước, thẻ điện thoại) để hệ thống Ví có môi trường giao tiếp.
  - Cung cấp các API cơ bản (như tra cứu dư nợ, xác nhận thanh toán) để Core Engine có thể kết nối và chạy thử toàn bộ luồng giao dịch trong quá trình lập trình mà chưa cần liên kết với đối tác thật.

- **Phát triển Frontend (React.js & Ant Design):**
  - **Giao diện Officer (Quản trị viên):**
    - **Triển khai các phân hệ quản lý cốt lõi:** Quản lý khách hàng (Customer Management), Quản lý Ví (Pocket Management), và tra cứu Lịch sử giao dịch (Transaction Trail/History).
    - **Xây dựng phân hệ Cấu hình Dịch vụ (Service Builder):** Áp dụng thư viện Ant Design để thiết kế các form nhập liệu động, cho phép Officer tự định nghĩa dịch vụ mới một cách linh hoạt.
    - **Tích hợp module Dashboard:** Trực quan hóa số liệu tổng quan của hệ thống thông qua biểu đồ tương tác (sử dụng Recharts).
  - **Giao diện Customer (Người dùng cuối):**
    - **Phát triển luồng trải nghiệm người dùng:** Từ bước Đăng nhập/Đăng ký (Login/Register) đến trang chủ (Customer Dashboard) để quản lý số dư ví cá nhân.
    - **Hiện thực hóa chức năng Liên kết ngân hàng (Linked Banks):** Thiết kế luồng thao tác để khách hàng thực hiện các giao dịch Nạp tiền (Deposit/Cash-in) và Rút tiền (Withdraw).
    - **Triển khai các luồng thanh toán thực tế:** Chuyển tiền (Transfer P2P), Nạp tiền điện thoại (Mobile Top-up), và Thanh toán hóa đơn (Bill Payment).

## II. Yêu cầu bài toán

### 1. Miêu tả chi tiết bài toán
*(Giữ nguyên mô tả bài toán Core Engine, P2P, Cash-in, Bill Payment...)*

### 2. Phạm vi dự án và Nhiệm vụ đảm nhận
Trong khoảng thời gian 2 tuần qua, nhiệm vụ của em tập trung hoàn toàn vào việc Hiện thực hóa (Implementation) các thiết kế thành mã nguồn. Những phần việc em trực tiếp lập trình bao gồm:
- Xây dựng API và luồng xử lý bằng **Node.js/Sails.js**.
- Xử lý logic khóa/mở khóa tài khoản (lock pocket) và quản lý Database Transaction trên **MongoDB** để đảm bảo an toàn tiền tệ (ACID).
- Lập trình module tích hợp (Integration) gọi API sang hệ thống Biller bằng thư viện **Axios**.
- Lập trình màn hình giao diện (Frontend) trên **React.js**.

## III. Cơ sở lý thuyết và Giải pháp kĩ thuật

### 1. Các nền tảng lý thuyết và công nghệ cốt lõi
*(Giữ nguyên các khái niệm: Ghi sổ kép, Checksum, ACID, Config-driven)*

### 2. Kiến trúc bộ máy lõi và Giải pháp lập trình (Cập nhật)
Dựa trên kiến trúc Config-driven đã thiết kế, em đã tiến hành lập trình Core Engine bằng **Node.js (Framework Sails.js)** và cơ sở dữ liệu **MongoDB**. Quá trình hiện thực hóa luồng 3 bước diễn ra như sau:

- **Bước 1 - REQUEST (Chuẩn bị và tính toán):** Hệ thống đọc cấu hình `fieldBuilder` từ MongoDB, sử dụng logic động để parse dữ liệu đầu vào. Hệ thống sử dụng Waterline ORM của Sails.js để truy vấn `TransField` và `TransValidation`, chạy qua các hàm validate kiểm tra hạn mức, tính toán phí. Nếu là giao dịch thanh toán hóa đơn, Engine dùng thư viện Axios gọi API Enquiry sang Mock Biller.
- **Bước 2 - CONFIRM (Chuẩn bị xác thực):** Xử lý logic kiểm tra phương thức xác thực (Mã PIN hoặc None) và trả kết quả về Frontend.
- **Bước 3 - VERIFY (Xác thực và Ghi sổ - Bước quan trọng nhất):** 
  - **Quản lý Concurrency:** Để chống lỗi race-condition (bấm hai lần), hệ thống sử dụng cơ chế Lock trước khi giao dịch. (Có thể kết hợp Redis để làm Distributed Lock nếu cần mở rộng).
  - **Transaction & ACID:** Hệ thống mở một Database Transaction của MongoDB (sử dụng session trong MongoDB) để đảm bảo mọi bút toán trừ/cộng tiền trong `Pocket` và ghi nhận lịch sử vào `TransactionTrail` đều thành công hoàn toàn, nếu có lỗi sẽ rollback.
  - **Bảo mật:** Mã băm checksum được tính toán lại bằng thư viện Crypto/Bcrypt và cập nhật vào document của ví ngay trong cùng transaction.

### 3. Những khó khăn trong quá trình lập trình và cách khắc phục
- **Khó khăn về dữ liệu động trên Frontend:** Làm sao để màn hình Admin Portal tự sinh ra các ô nhập liệu dựa trên cấu hình Database?
  - *Giải pháp:* Áp dụng tính năng Dynamic Form của thư viện Ant Design trong React. Dữ liệu cấu hình từ API trả về được parse thành các Component React tương ứng (Input, Select) một cách linh hoạt.
- **Khó khăn về tính toàn vẹn khi gọi API đối tác:** Khi gọi API sang Biller để thanh toán, nếu Biller phản hồi chậm (timeout), tiền của khách có bị trừ mất không?
  - *Giải pháp:* Thiết lập cơ chế trừ tiền an toàn trong Transaction. Nếu Biller timeout, giao dịch được đánh dấu là `PENDING` thay vì `FAILED` hay `SUCCESS`. Sau đó cần có một tiến trình chạy ngầm (Cron job sử dụng `node-cron`) để gọi API đối soát lại trạng thái với Biller.

## IV. Mô tả phần mềm cài đặt

Trải qua giai đoạn lập trình, hiện tại dự án Mini Wallet đã có phiên bản chạy thử nghiệm ở môi trường Local/Dev. 
- **Backend (Node.js/Sails.js):** Cung cấp các RESTful API và chạy ổn định. Dễ dàng khởi chạy qua lệnh `npm run start` và kiểm thử qua Postman.
- **Frontend (React.js/Vite):** Giao diện Admin Portal khởi chạy nhanh chóng qua lệnh `npm run dev`. Officer có thể đăng nhập, xem Dashboard biểu đồ (dùng Recharts) và thao tác tạo cấu hình động.
- **Database (MongoDB):** Đã được khởi tạo (seed) bộ dữ liệu gốc đầy đủ cho các nghiệp vụ P2P và Bill Payment.

## V. Kết quả đạt được, hướng phát triển

### 1. Kỹ năng & kiến thức thu thập được
- **Kỹ năng lập trình Backend:** Làm chủ framework Sails.js và Node.js. Chuyển đổi thành công tài liệu thiết kế (Sequence Diagram) thành mã nguồn thực tế.
- **Xử lý đồng thời (Concurrency) & ACID:** Hiểu và áp dụng thành công Database Transaction trong MongoDB, cách lock tài nguyên chống ghi đè số dư.
- **Kỹ năng Frontend:** Làm quen với React.js (Vite) và Ant Design, đặc biệt là kỹ thuật render form động.

### 2. Hướng phát triển tiếp theo để hoàn thiện (Tuần 5 & 6)
Dựa trên Core Engine đã lập trình, hướng phát triển trong giai đoạn tiếp theo (Tuần 5 & 6) sẽ tập trung vào:
- **Kiểm thử hệ thống (Testing):** Bổ sung các kịch bản test API cho các luồng ngoại lệ (Unhappy path) để đảm bảo Core Engine tính toán chính xác trong mọi tình huống rủi ro.
- **Phát triển luồng Đối soát (Reconciliation):** Lập trình các cron-job (tiến trình ngầm) để tự động đối soát các giao dịch treo (Pending) với Biller vào cuối ngày.
- **Hoàn thiện UI Customer (Ứng dụng người dùng):** Tích hợp Frontend của người dùng cuối để họ có thể thao tác chuyển tiền/nạp tiền trực tiếp trên giao diện thay vì gọi API.
- **Triển khai (Deployment):** Đóng gói ứng dụng và chuẩn bị triển khai lên server (Docker/Cloud).
