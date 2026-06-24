# Mini-Wallet — High-Level API Specification

> **Vai trò tài liệu:** Đặc tả API ở mức kiến trúc (Architecture Design).
> Bám sát `MINIWALLET.md` + `WEEK2-DESIGN-BRIEF.md`.
>
> **Database:** MongoDB (Replica Set — bắt buộc cho `session.withTransaction`)
> **Auth strategy:** JWT Bearer Token — Middleware đọc token → gắn `req.info.user`
> **Giao thức:** 100% HTTP POST (RPC-style)
> **Response Format (Envelope):** Tất cả API trả về theo format: `{ "err": 0, "message": "Success", "data": { ... } }`
> **Version:** 3.0 — Chuyển 100% phương thức sang POST và chuẩn hoá Response Envelope.

---

## Mục lục

- [Phần 1 — Phân tích Runtime](#phần-1--phân-tích-runtime)
- [Phần 2 — API Specification](#phần-2--api-specification)
- [Phần 3 — API Grouping](#phần-3--api-grouping)
- [Phần 4 — Review](#phần-4--review)

---

# PHẦN 1 — PHÂN TÍCH RUNTIME

> Mọi giao dịch đều đi qua đúng một bộ máy (engine) duy nhất, nhận diện bằng `transRefId`.
> Engine KHÔNG biết nghiệp vụ là gì — chỉ đọc config rồi làm theo.

---

## 1.1 Request Transaction

| Mục | Nội dung |
|-----|----------|
| **Entry point** | `Transaction.engineRequestTransaction` → `NeonMessage.processRequestStep` |
| **Input** | `{ serviceId, parameters: { ... } }` — dữ liệu thô từ client |
| **Output** | Preview: `{ transRefId, amount, fee, totalAmount }` — **tiền chưa chạy** |
| **Trail status** | `init` → `pending` |

**Runtime flow (6 sub-bước):**

```
1. Service.buildTransactionFields      — đọc fieldBuilder, biến input thô → TRANSBODY
2. TransactionTrail.init               — dựng inputMessage + outputMessage; tạo Trail status=init
                                         → gán TRANSREFID = String(trail._id) vào TRANSBODY
3. TransField.validateFields           — validate ĐỊNH DẠNG từng field trong TRANSBODY
   3.1 [chỉ billerTrans]               — gọi Biller.inquiryUrl → lấy AMOUNT (ghi đè)
4. Tính phí                            — theo Service.fee; chốt TOTALAMOUNT = AMOUNT + DEBITFEE
5. TransValidation.validateTransaction — kiểm LUẬT NGHIỆP VỤ (đủ tiền, không chuyển cho mình, ...)
6. Update Trail → pending              — lưu outputMessage đã đầy đủ; trả preview + transRefId cho client
```

**Mục đích:** Dựng và kiểm tra đầy đủ thông tin giao dịch. Cho người dùng xem preview trước khi xác nhận. **Tiền tuyệt đối chưa chạy.**

---

## 1.2 Confirm Transaction

| Mục | Nội dung |
|-----|----------|
| **Entry point** | `Transaction.engineConfirmTransaction` → `NeonMessage.processConfirmStep` |
| **Input** | `{ transRefId }` |
| **Output** | `{ authMethod, transRefId }` |
| **Trail status** | Không đổi (vẫn `pending`) |

**Runtime flow:**

```
1. Nạp lại Trail theo transRefId (findOne status=pending)
2. Đọc Service.auth.method
3. Trả về authMethod (PIN hoặc NONE) cho frontend
```

**authMethod:**

| Giá trị | Ý nghĩa | Áp dụng |
|---------|---------|---------|
| `PIN` | Frontend yêu cầu người dùng nhập PIN trước khi gọi Verify | P2P, Bill Payment |
| `NONE` | Frontend gọi thẳng Verify, không cần PIN | Cash-in (Officer trigger) |

**Mục đích:** Cầu nối giữa Request và Verify. Cho frontend biết cần xác thực bằng cách nào. **Không thay đổi trạng thái tài chính.**

---

## 1.3 Verify Transaction

| Mục | Nội dung |
|-----|----------|
| **Entry point** | `Transaction.engineVerifyTransaction` → `NeonMessage.processVerifyStep` |
| **Input** | `{ transRefId, pin? }` |
| **Output** | Biên lai giao dịch (Transaction) |
| **Trail status** | `pending` → `done` / `failed` |
| **★ Tiền chạy ở đây ★** | `TransDefinition.ExecuteTransaction` — trong `session.withTransaction` (ACID) |

**Runtime flow (7 sub-bước):**

```
1. validateStateAndLock(SENDERPHONE)   — khoá ví người gửi (state: inProgress) — chống song song
2. Xác thực PIN                        — nếu authMethod=PIN → Auth.VerifyPINAsync; NONE → bỏ qua
3. TransField.validateFields           — validate lại định dạng (không tin dữ liệu cũ từ Request)
4. Tính phí lại                        — tính lại từ đầu (không tin số cũ)
5. TransValidation.validateTransaction — kiểm lại luật nghiệp vụ (số dư có thể đã đổi)
6. TransDefinition.ExecuteTransaction  — trong session.withTransaction:
      - với mỗi glStep: Pocket.debit($inc) + Pocket.credit($inc) + tính lại checksum
      - ghi PocketEntry (immutable)
      - tạo Transaction (biên lai)
      - lật Trail: pending → done
      (lỗi bất kỳ → rollback TẤT CẢ, số dư về như cũ)
7. [chỉ billerTrans]                   — gọi Biller.paymentUrl (sau khi đã ghi sổ thành công)
8. releaseAccount(SENDERPHONE)         — mở khoá ví người gửi — BẮT BUỘC ở MỌI lối ra
```

---

# PHẦN 2 — API SPECIFICATION

> **Nguyên tắc chung:**
> - Mọi API đều sử dụng phương thức **POST**.
> - ID hoặc tham số nằm trong **Request Body** dưới dạng JSON, không đưa lên URL Query.
> - Trả về chung dạng gói (Envelope): `{ err, message, data }`
>
> **Ký hiệu Auth:**
> - `Public` — không cần token
> - `Customer JWT` — bearer token của Customer
> - `Officer JWT` — bearer token của Officer

---

## 2.1 Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | Public | Đăng ký tài khoản Customer bằng `phone`, `pin`. Tự động tạo Pocket với số dư 0. |
| POST | `/api/auth/login` | Public | Đăng nhập Customer bằng `phone`, `pin`. Trả về `data.token`. |
| POST | `/api/officer/auth/login` | Public | Đăng nhập Officer bằng `username`, `password`. Trả về `data.token`. |
| POST | `/api/auth/logout` | Customer JWT | Vô hiệu hoá token hiện tại của Customer. |
| POST | `/api/officer/auth/logout` | Officer JWT | Vô hiệu hoá token hiện tại của Officer. |
| POST | `/api/auth/verify-pin` | Customer JWT | Xác thực PIN trước khi gọi verify transaction (hỗ trợ UI). Truyền vào `{ pin }`. |

---

## 2.2 Service Discovery (Customer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/services/list` | Customer JWT | Lấy danh sách Service đang `active` (để hiển thị menu app). |
| POST | `/api/services/detail` | Customer JWT | Lấy chi tiết một Service active (để render form). Truyền `{ id }`. |
| POST | `/api/billers/list` | Customer JWT | Lấy danh sách Biller đang `active`. |

---

## 2.3 Wallet (Customer)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/wallet/balance` | Customer JWT | Trả số dư ví Customer (`data.balance`). Server kiểm tra checksum trước khi trả. |
| POST | `/api/wallet/detail` | Customer JWT | Trả chi tiết Pocket (client type, currency, state, status). |
| POST | `/api/wallet/transactions/list` | Customer JWT | Danh sách Transaction thành công của khách. Body: `{ page, limit }`. |

---

## 2.4 Transaction Engine

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/transaction/request` | Customer JWT | Gọi **Request Runtime**. Body: `{ serviceId, parameters: {} }`. Trả về `data: { transRefId, amount, fee, totalAmount }`. |
| POST | `/api/transaction/confirm` | Customer JWT | Gọi **Confirm Runtime**. Body: `{ transRefId }`. Trả về `data: { authMethod, transRefId }`. |
| POST | `/api/transaction/verify` | Customer JWT | Gọi **Verify Runtime**. Body: `{ transRefId, pin }`. **★ Tiền chạy ở đây ★**. Trả về Transaction. |
| POST | `/api/transaction/detail` | Customer JWT | Lấy chi tiết giao dịch thành công. Body: `{ transRefId }`. |
| POST | `/api/transaction/status` | Customer JWT | Polling kiểm tra status của Trail (`pending`, `done`, `failed`). Body: `{ transRefId }`. |

---

## 2.5 Cash-in (Officer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/cash-in` | Officer JWT | Server tự chạy Request → Verify. Body: `{ customerPhone, amount }`. |

---

## 2.6 Service Management (Officer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/services/list` | Officer JWT | Danh sách tất cả Service. Body: `{ page, limit, status }`. |
| POST | `/api/officer/services/detail` | Officer JWT | Chi tiết Service kèm `fieldBuilder`. Body: `{ id }`. |
| POST | `/api/officer/services/create` | Officer JWT | Tạo Service mới. Body chứa các trường của Service. |
| POST | `/api/officer/services/update` | Officer JWT | Cập nhật Service. Body: `{ id, ...fields }`. |
| POST | `/api/officer/services/toggle` | Officer JWT | Bật/tắt Service (`active` / `inactive`). Body: `{ id, status }`. |
| POST | `/api/officer/services/delete` | Officer JWT | Xoá mềm Service. Body: `{ id }`. |

---

## 2.7 Transaction Design (Officer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/trans-fields/list` | Officer JWT | Danh sách TransField. Body: `{ serviceId }`. |
| POST | `/api/officer/trans-fields/create` | Officer JWT | Thêm một TransField mới cho service. |
| POST | `/api/officer/trans-fields/update` | Officer JWT | Cập nhật định dạng TransField. Body: `{ id, ...fields }`. |
| POST | `/api/officer/trans-fields/delete` | Officer JWT | Xoá TransField. Body: `{ id }`. |
| POST | `/api/officer/trans-validations/list` | Officer JWT | Danh sách luật validation. Body: `{ serviceId }`. |
| POST | `/api/officer/trans-validations/create` | Officer JWT | Thêm một TransValidation. |
| POST | `/api/officer/trans-validations/update` | Officer JWT | Cập nhật TransValidation. Body: `{ id, ...fields }`. |
| POST | `/api/officer/trans-validations/delete` | Officer JWT | Xoá TransValidation. Body: `{ id }`. |
| POST | `/api/officer/trans-definition/detail` | Officer JWT | Lấy glSteps của một Service. Body: `{ serviceId }`. |
| POST | `/api/officer/trans-definition/save` | Officer JWT | Tạo hoặc cập nhật toàn bộ glSteps. Body: `{ serviceId, glSteps: [] }`. |

---

## 2.8 Transaction Design Meta (Officer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/meta/validators` | Officer JWT | Lấy danh sách các validator functions (Dropdown). |
| POST | `/api/officer/meta/field-queries` | Officer JWT | Lấy danh sách các hàm DB query cho fieldBuilder (Dropdown). |

---

## 2.9 Biller & Wallet & Customers (Officer APIs)

### Biller
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/billers/list` | Officer JWT | Danh sách Biller. Body: `{ page, limit, status }`. |
| POST | `/api/officer/billers/detail` | Officer JWT | Chi tiết Biller. Body: `{ id }`. |
| POST | `/api/officer/billers/create` | Officer JWT | Tạo Biller mới (tự sinh Pocket). |
| POST | `/api/officer/billers/update` | Officer JWT | Cập nhật thông tin Biller. Body: `{ id, ...fields }`. |
| POST | `/api/officer/billers/toggle` | Officer JWT | Bật/tắt Biller. Body: `{ id, status }`. |

### Wallet
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/wallets/list` | Officer JWT | Danh sách ví. Body: `{ client: 'system' hay 'bank' }`. |
| POST | `/api/officer/wallets/detail` | Officer JWT | Chi tiết một ví. Body: `{ id }`. |
| POST | `/api/officer/wallets/create` | Officer JWT | Tạo ví System/Bank mới. |
| POST | `/api/officer/wallets/top-up` | Officer JWT | Nạp tiền trực tiếp vào ví Bank. Body: `{ id, amount }`. |

### Customers
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/customers/list` | Officer JWT | Danh sách khách hàng. Body: `{ page, limit, phone }`. |
| POST | `/api/officer/customers/detail` | Officer JWT | Chi tiết Customer & số dư. Body: `{ id }`. |
| POST | `/api/officer/customers/toggle-lock` | Officer JWT | Khoá hoặc mở khoá khách hàng (`state`). Body: `{ id, isLocked: boolean }`. |

---

## 2.10 Transaction Monitoring (Officer APIs)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/officer/trails/list` | Officer JWT | Danh sách TransactionTrail. Body: `{ page, limit, status }`. |
| POST | `/api/officer/trails/detail` | Officer JWT | Chi tiết Trail (kèm logs). Body: `{ transRefId }`. |
| POST | `/api/officer/transactions/list` | Officer JWT | Danh sách giao dịch thành công. |
| POST | `/api/officer/transactions/detail` | Officer JWT | Chi tiết biên lai & PocketEntry. Body: `{ transRefId }`. |

---

# PHẦN 3 — API GROUPING

Tổng cộng **55 APIs**. Tất cả đều sử dụng phương thức **POST**.

| Phân loại | Số API | Base Prefix |
|-----------|--------|-------------|
| Customer APIs | 15 | `/api/` (vd: `/api/services/list`) |
| Officer APIs | 40 | `/api/officer/` (vd: `/api/officer/services/list`) |
| Shared APIs | 0 | Hai luồng tách biệt hoàn toàn. |

---

# PHẦN 4 — REVIEW

## Checklist Design Gate (bám WEEK2-DESIGN-BRIEF mục 10)

| # | Tiêu chí | Kết quả |
|---|----------|---------|
| 1 | Mô tả đúng 3 runtime (request 6 bước, confirm, verify 7 bước) | PASS — Phần 1 |
| 2 | TransField có `SERVICEID`; glSteps cân bằng; phí về Ví System | PASS — ERD & Phần 1 |
| 3 | Cash-in `auth=NONE`; bỏ Confirm; server tự chạy Request → Verify | PASS — Mục 2.5 |
| 4 | Bill Payment có enquiry@Request + payment@Verify | PASS |
| 5 | Tiền chỉ chạy ở Verify, trong `session.withTransaction`; khoá sender | PASS — Phần 1.3 |
| 6 | Deny-by-default: Customer không gọi được Officer API | PASS — Tách prefix rõ ràng |
| 7 | Giao thức: 100% POST, dữ liệu vào Body, trả về Envelope gói | PASS — Chuẩn hoá Toàn bộ |

---