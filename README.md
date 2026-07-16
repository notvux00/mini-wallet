# Mini Wallet - MVP

Dự án ví điện tử Mini Wallet (MVP).

## Yêu Cầu Hệ Thống

- Node.js (v18 trở lên)
- MongoDB Replica Set (để hỗ trợ Transactions)
- Redis (để cache OTP, session, Rate Limit)

## Hướng Dẫn Cài Đặt và Chạy Backend

1. Cài đặt các thư viện:
   ```bash
   cd backend
   npm install
   ```

2. Cấu hình biến môi trường:
   Backend hiện tại sử dụng cấu hình mặc định (MongoDB `mongodb://localhost:27017/mini_wallet`, Redis `localhost:6379`). Bạn có thể tạo file `.env` (nếu có tích hợp dotenv) hoặc set trực tiếp trong môi trường để thay đổi cấu hình.

3. Khởi động Backend (Sails.js):
   ```bash
   npm start
   ```

## Hướng Dẫn Cài Đặt và Chạy Frontend

1. Cài đặt các thư viện:
   ```bash
   cd frontend
   npm install
   ```

2. Cấu hình Frontend:
   Frontend đang được cấu hình mặc định kết nối đến Backend qua `http://localhost:1337` (được thiết lập trong `src/utils/axios.js` và `src/context/SocketContext.jsx`). 

3. Khởi động Frontend (Vite):
   ```bash
   npm run dev
   ```

## Chạy Test

Hệ thống có bộ Integration Test cho Backend bằng Mocha. Đảm bảo MongoDB và Redis đang chạy trước khi test.

```bash
cd backend
npm test
```
*(Lệnh này sẽ gọi script `npm run custom-tests` để chạy tuần tự các kịch bản kiểm thử tích hợp).*

## Các Thiết Lập Quan Trọng

1. **MongoDB Replica Set**: Cần thiết lập Replica Set để sử dụng được tính năng `session.startTransaction()` trong Sails.
   - Thêm `--replSet rs0` khi chạy mongod.
   - Chạy `rs.initiate()` trong mongo shell.

2. **Redis**: Bắt buộc để sử dụng chức năng gửi/xác thực OTP và khoá chống trùng lặp (Concurrency Control).

## Cấu trúc luồng (MVP)

- **Frontend**: Giao diện cho Cán bộ (Officer) quản lý dịch vụ và Khách hàng (Customer) thực hiện giao dịch (chuyển tiền, thanh toán).
- **Backend**: Xử lý logic, gọi sang Engine mô phỏng và đảm bảo tính nguyên vẹn của dữ liệu bằng DB Transaction.
- **Tính năng nổi bật**: Dynamic Form Builder, Ghi sổ kép (Double-entry Bookkeeping), Kiểm soát đồng thời (Concurrency Control).
