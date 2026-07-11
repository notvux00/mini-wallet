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
  - Áp dụng cơ chế Transaction trên MongoDB kết hợp với kỹ thuật Khoá phân tán (Distributed Lock) bằng Redis để đảm bảo tính nguyên tử (ACID), xử lý an toàn bút toán ghi sổ kép và bảo mật số dư bằng mã băm Checksum.
  - Trực tiếp lập trình và cấu hình các luồng nghiệp vụ thực tế: Chuyển tiền (P2P), Thanh toán hóa đơn (Bill Payment), và **Nạp tiền điện thoại (Top-up)**.
  - Xây dựng module **Liên kết ngân hàng (Bank linking)** để xử lý luồng giao tiếp giữa ví và ngân hàng, hỗ trợ các giao dịch nạp tiền (Cash-in) và rút tiền.

- **Xây dựng Mock Biller (Dịch vụ giả lập bên thứ ba):**
  - Phát triển một service phụ độc lập đóng vai trò là đối tác cung cấp dịch vụ (hóa đơn điện nước, thẻ điện thoại) để hệ thống Ví có môi trường giao tiếp.
  - Cung cấp các API cơ bản (như tra cứu dư nợ, xác nhận thanh toán, nạp thẻ Viettel) để Core Engine có thể kết nối và chạy thử toàn bộ luồng giao dịch trong quá trình lập trình mà chưa cần liên kết với đối tác thật.

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
- **Xây dựng API và luồng xử lý bằng Node.js/Sails.js:** Phát triển RESTful API cho Core Engine để chuyển đổi linh hoạt dữ liệu cấu hình tĩnh thành các luồng xử lý động (như kiểm tra hạn mức, tính phí, định tuyến giao dịch).
- **Xử lý khóa tài khoản và Database Transaction trên MongoDB:** Áp dụng cơ chế Transaction và khóa ví (Distributed Lock với Redis) để đảm bảo tính nguyên tử (ACID). Việc này giúp ngăn chặn lỗi sai lệch số dư khi có nhiều thao tác diễn ra đồng thời (race condition).
- **Lập trình module tích hợp gọi API bên thứ ba bằng Axios:** Xây dựng module kết nối an toàn với hệ thống Biller (Mock) để thanh toán hóa đơn, nạp thẻ điện thoại, có khả năng bắt và xử lý tốt các lỗi mạng ngoại lệ (như timeout) để bảo vệ trạng thái giao dịch.
- **Lập trình giao diện quản trị (Frontend) trên React.js:** Sử dụng React.js, Vite và Ant Design để xây dựng Admin Portal. Tập trung vào việc tạo các form nhập liệu động (dynamic form) giúp quản trị viên dễ dàng cấu hình dịch vụ mới.

## III. Cơ sở lý thuyết và Giải pháp kĩ thuật

### 1. Các nền tảng lý thuyết và công nghệ cốt lõi
*(Giữ nguyên các khái niệm: Ghi sổ kép, Checksum, ACID, Config-driven)*

### 2. Kiến trúc bộ máy lõi và Giải pháp lập trình (Cập nhật)
Dựa trên kiến trúc Config-driven đã thiết kế, em đã tiến hành lập trình Core Engine bằng **Node.js (Framework Sails.js)**, cơ sở dữ liệu **MongoDB** và **Redis** để hỗ trợ khoá đồng thời. Quá trình hiện thực hóa luồng 3 bước diễn ra như sau:

- **Bước 1 - REQUEST (Chuẩn bị và tính toán):** Hệ thống đọc cấu hình `fieldBuilder` từ MongoDB, sử dụng logic động để parse dữ liệu đầu vào. Hệ thống sử dụng Waterline ORM của Sails.js để truy vấn `TransField` và `TransValidation`, chạy qua các hàm validate kiểm tra hạn mức, tính toán phí. Nếu là giao dịch thanh toán, Engine dùng thư viện Axios gọi API Enquiry sang Mock Biller.
- **Bước 2 - CONFIRM (Chuẩn bị xác thực):** Xử lý logic kiểm tra phương thức xác thực (Mã PIN hoặc None) và trả kết quả về Frontend.
- **Bước 3 - VERIFY (Xác thực và Ghi sổ - Bước quan trọng nhất):** 
  - **Quản lý Concurrency:** Để chống lỗi race-condition (bấm hai lần), hệ thống sử dụng cơ chế Khoá phân tán (Distributed Lock) qua **Redis** (`setnx`) để khoá ví (Pocket) trước khi giao dịch.
  - **Transaction & ACID:** Hệ thống mở một Database Transaction của MongoDB (sử dụng session trong MongoDB) để đảm bảo mọi bút toán trừ/cộng tiền trong `Pocket` và ghi nhận lịch sử vào `TransactionTrail` đều thành công hoàn toàn, nếu có lỗi sẽ rollback.
  - **Bảo mật:** Mã băm checksum được tính toán lại bằng thư viện Crypto/Bcrypt và cập nhật vào document của ví ngay trong cùng transaction để bảo vệ số dư thực.

### 3. Những khó khăn trong quá trình lập trình và cách khắc phục
- **Khó khăn về dữ liệu động trên Frontend:** Làm sao để màn hình Admin Portal tự sinh ra các ô nhập liệu dựa trên cấu hình Database?
  - *Giải pháp:* Áp dụng tính năng Dynamic Form của thư viện Ant Design trong React. Dữ liệu cấu hình từ API trả về được parse thành các Component React tương ứng (Input, Select) một cách linh hoạt.
- **Khó khăn về tính toàn vẹn khi gọi API đối tác:** Khi gọi API sang Biller để thanh toán, nếu Biller phản hồi chậm (timeout), tiền của khách có bị trừ mất không?
  - *Giải pháp:* Thiết lập cơ chế trừ tiền an toàn trong Transaction. Nếu Biller timeout, giao dịch được đánh dấu là `PENDING` thay vì `FAILED` hay `SUCCESS`. Sau đó em đã lập trình một Service (`CronService`) chạy ngầm để gọi API đối soát lại trạng thái với Biller.

## IV. Mô tả phần mềm cài đặt

Trải qua giai đoạn lập trình, dự án Mini Wallet đã có phiên bản chạy thử nghiệm ổn định trên môi trường Local/Dev. Dưới đây là chi tiết về các thành phần và cách thức cài đặt, vận hành hệ thống:

**1. Yêu cầu môi trường (Prerequisites):**
Để hệ thống có thể hoạt động, môi trường phát triển cần được cài đặt sẵn:
- **Node.js** (phiên bản v18.x trở lên) cùng trình quản lý gói `npm`.
- **MongoDB** (phiên bản v6.0 trở lên) chạy ở cổng mặc định `27017` để lưu trữ dữ liệu chính.
- **Redis** chạy ở cổng `6379` (hoặc cấu hình Redis Cloud trong `config/custom.js`) để phục vụ Distributed Lock.

**2. Cài đặt và vận hành Backend (Node.js/Sails.js):**
- Phần mềm đóng vai trò là Core Engine, tiếp nhận và xử lý toàn bộ luồng giao dịch.
- **Cài đặt:** Di chuyển vào thư mục backend, chạy lệnh `npm install` để tải về các thư viện cần thiết (Sails, Axios, Bcrypt, Ioredis...).
- **Cấu hình:** Cấu hình chuỗi kết nối MongoDB tại file `config/datastores.js` và cấu hình Redis URL tại `config/custom.js` (Tuyệt đối không sử dụng file `.env` theo chuẩn cấu trúc của Sails.js).
- **Khởi chạy:** Khởi động server bằng lệnh `npm run start` (hoặc `sails lift`). Backend API sẽ sẵn sàng hoạt động tại cổng `1337`.
- **Khởi tạo dữ liệu (Seed):** Chạy đoạn mã mồi bằng lệnh `node scripts/seed.js` để hệ thống tự động tạo các dịch vụ Nạp tiền (Cash-in) và Chuyển tiền (P2P), cùng với các ví khách hàng mẫu (Alice, Bob) và ví hệ thống.

**3. Cài đặt và vận hành Frontend (React.js/Vite):**
- Ứng dụng Web dành cho Quản trị viên (Admin Portal) và Khách hàng thao tác.
- **Cài đặt:** Tại thư mục frontend, chạy lệnh `npm install` để cài đặt bộ UI kit (Ant Design) và thư viện biểu đồ (Recharts).
- **Khởi chạy:** Chạy lệnh `npm run dev` để bật Vite dev server. Giao diện sẽ hiển thị tại `http://localhost:5173`.
- **Chức năng:** Officer có thể đăng nhập vào hệ thống, theo dõi biểu đồ giao dịch (Dashboard) và sử dụng các Dynamic Form để thiết lập cấu hình dịch vụ mới. Khách hàng có thể thao tác với luồng Chuyển tiền, Nạp tiền.

## V. Kết quả đạt được, hướng phát triển

### 1. Kỹ năng & kiến thức thu thập được
Trong giai đoạn Lập trình (Tuần 3 & 4), em không chỉ hoàn thành khối lượng công việc được giao mà còn đúc kết được nhiều kinh nghiệm thực tiễn quý giá, cụ thể:

- **Kỹ năng lập trình Backend chuyên sâu:** Em đã hoàn toàn làm quen và làm chủ được framework Sails.js trên nền tảng Node.js. Điểm tâm đắc nhất là em đã học được cách đọc hiểu và chuyển đổi thành công các tài liệu thiết kế phức tạp (đặc biệt là Sequence Diagram) thành những dòng mã nguồn thực tế, logic, rành mạch và dễ bảo trì.
- **Giải quyết bài toán xử lý đồng thời (Concurrency) & ACID:** Nhờ va chạm với bài toán tài chính, em đã thực sự hiểu tầm quan trọng của tính nguyên tử (ACID). Em đã thành công trong việc kết hợp kỹ thuật Khoá phân tán (Distributed Lock) thông qua `RedisService` (`setnx`) để khoá ví người dùng, cùng với Database Transaction của MongoDB (session) nhằm loại bỏ triệt để nguy cơ ghi đè số dư (race condition) khi có nhiều request đẩy tới cùng một lúc.
- **Kỹ năng Frontend và thiết kế giao diện động:** Với Frontend, em đã tiếp cận và làm quen với hệ sinh thái React.js (sử dụng build tool Vite) và bộ UI Component Ant Design. Điểm sáng lớn nhất là em đã nắm bắt được kỹ thuật render form động (dynamic form), cho phép hệ thống tự động sinh ra các giao diện nhập liệu từ cấu hình JSON trả về bởi API, giúp tiết kiệm đáng kể thời gian code cứng từng màn hình.
- **Kỹ năng tối ưu hóa với Agent AI:** Em đã tận dụng hiệu quả các công cụ AI (Agent Skills) để tạo dữ liệu giả (mock data), phân tích các tài liệu chuyên sâu (như MongoDB Transaction) và rà soát lỗi nhanh chóng, từ đó tối ưu hóa được năng suất code của bản thân.

### 2. Hướng phát triển tiếp theo để hoàn thiện (Tuần 5 & 6)
Dựa trên nền tảng Core Engine đã được lập trình vững chắc, hướng phát triển trong hai tuần cuối của kỳ thực tập sẽ tập trung vào việc gia tăng tính ổn định và đóng gói sản phẩm:

- **Kiểm thử hệ thống toàn diện (Testing):** Không chỉ dừng lại ở các luồng giao dịch thành công (Happy path), em sẽ bổ sung thêm hàng loạt các kịch bản test API bao phủ các luồng ngoại lệ (Unhappy path). Việc này giúp đảm bảo Core Engine có khả năng xử lý, tính toán và rollback chuẩn xác trong mọi tình huống rủi ro như sai mã PIN, tài khoản hết tiền, hoặc Biller báo lỗi.
- **Phát triển luồng Đối soát tự động (Reconciliation):** Khi giao dịch với các đối tác (Biller), không tránh khỏi tình trạng mạng chập chờn dẫn đến trạng thái giao dịch bị treo (Pending). Em sẽ nâng cấp các tiến trình ngầm (cron-job) bên trong `CronService.js` để tự động lập lịch rà quét và đối soát các giao dịch này vào cuối ngày, giúp dòng tiền luôn được minh bạch.
- **Hoàn thiện giao diện UI/UX cho Customer:** Hệ thống API đã hoàn thiện, nên em sẽ dành thời gian tinh chỉnh lại trải nghiệm UI/UX cho ứng dụng người dùng cuối. Đảm bảo luồng thao tác Chuyển tiền, Nạp tiền diễn ra mượt mà, trực quan, có các thông báo phản hồi (alert/toast) rõ ràng.
- **Đóng gói và Triển khai (Deployment):** Giai đoạn cuối cùng là viết kịch bản đóng gói ứng dụng (Docker) và chuẩn bị các bước triển khai lên môi trường máy chủ (Server/Cloud), qua đó nắm được quy trình CI/CD cơ bản để đưa phần mềm từ Local lên Production.
