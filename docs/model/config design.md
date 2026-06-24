# Mini-Wallet — Thiết kế Cấu hình (Config Design)

> **Vai trò tài liệu:** Cung cấp toàn bộ các cấu trúc JSON tĩnh (Config) cho 3 nghiệp vụ cốt lõi: **P2P Transfer**, **Cash-in**, và **Bill Payment**.
> Bám sát mục 7, 8 của tài liệu `WEEK2-DESIGN-BRIEF.md`.
> **Nguyên tắc:** Hệ thống hoàn toàn Config-driven. Transaction Engine chỉ đọc các JSON này và thực thi mà không chứa hard-code logic từng nghiệp vụ.

---

## 1. P2P Transfer (Chuyển tiền cá nhân)

Nghiệp vụ chuyển tiền từ ví Customer này sang ví Customer khác. Thu phí người gửi (ví dụ: 100 VND).

### 1.1 Service
```json
{
  "_id": "ObjectId('service_p2p_id')",
  "code": "P2P_TRANSFER",
  "name": "Chuyển tiền cá nhân",
  "action": "none",
  "actionParams": {},
  "fieldBuilder": [
    { "order": 1, "name": "CURRENCY", "rule": "fixed", "variable": "VND" },
    { "order": 2, "name": "RECEIVERPHONE", "rule": "mapping", "source": "parameters.receiverPhone" },
    { "order": 3, "name": "AMOUNT", "rule": "mapping", "source": "parameters.amount", "datatype": "number" },
    { "order": 4, "name": "SENDERID", "rule": "query", "query": "queryPocketByUserId(USERID).id" },
    { "order": 5, "name": "RECEIVERID", "rule": "query", "query": "queryPocketByPhone(RECEIVERPHONE).id", "errorCode": "ERR_RECEIVER_NOT_FOUND" }
  ],
  "fee": { "type": "fixed", "value": 100 },
  "auth": { "method": "PIN" },
  "status": "active"
}
```

### 1.2 TransField
```json
[
  { "service": "service_p2p_id", "fieldName": "SERVICEID", "fieldFormat": "string", "isRequired": true, "order": 1, "status": "active" },
  { "service": "service_p2p_id", "fieldName": "RECEIVERPHONE", "fieldFormat": "string", "regex": "^\\d{10}$", "isRequired": true, "order": 2, "status": "active" },
  { "service": "service_p2p_id", "fieldName": "AMOUNT", "fieldFormat": "number", "minLength": 1000, "isRequired": true, "order": 3, "status": "active" }
]
```

### 1.3 TransValidation
```json
[
  { "service": "service_p2p_id", "validateFunc": "validateReceiverIsNotSender", "validateFields": "SENDERID:RECEIVERID", "order": 1, "errorCode": "ERR_SELF_TRANSFER", "status": "active" },
  { "service": "service_p2p_id", "validateFunc": "validateSenderAccountSufficiency", "validateFields": "SENDERID:AMOUNT:DEBITFEE", "order": 2, "errorCode": "ERR_INSUFFICIENT_BALANCE", "status": "active" }
]
```

### 1.4 TransDefinition
```json
{
  "service": "service_p2p_id",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": { "level": "productLevel", "target": "SENDERID" },
      "credit": { "level": "productLevel", "target": "RECEIVERID" }
    },
    {
      "order": 1,
      "amount": "DEBITFEE",
      "debit": { "level": "productLevel", "target": "SENDERID" },
      "credit": { "level": "wallet", "target": "SYSTEM_POCKET_ID" }
    }
  ],
  "status": "active"
}
```

---

## 2. Cash-in (Nạp tiền vào ví bởi Officer)

Nghiệp vụ do Officer trigger. Tiền chuyển từ ví Bank sang ví Customer. Miễn phí giao dịch và bỏ qua bước nhập PIN.

### 2.1 Service
```json
{
  "_id": "ObjectId('service_cashin_id')",
  "code": "CASH_IN",
  "name": "Nạp tiền vào ví khách hàng",
  "action": "none",
  "actionParams": {},
  "fieldBuilder": [
    { "order": 1, "name": "CURRENCY", "rule": "fixed", "variable": "VND" },
    { "order": 2, "name": "CUSTOMERPHONE", "rule": "mapping", "source": "parameters.customerPhone" },
    { "order": 3, "name": "AMOUNT", "rule": "mapping", "source": "parameters.amount", "datatype": "number" },
    { "order": 4, "name": "SENDERID", "rule": "fixed", "variable": "BANK_POCKET_ID" },
    { "order": 5, "name": "RECEIVERID", "rule": "query", "query": "queryPocketByPhone(CUSTOMERPHONE).id", "errorCode": "ERR_CUSTOMER_NOT_FOUND" }
  ],
  "fee": { "type": "fixed", "value": 0 },
  "auth": { "method": "NONE" },
  "status": "active"
}
```

### 2.2 TransField
```json
[
  { "service": "service_cashin_id", "fieldName": "SERVICEID", "fieldFormat": "string", "isRequired": true, "order": 1, "status": "active" },
  { "service": "service_cashin_id", "fieldName": "CUSTOMERPHONE", "fieldFormat": "string", "regex": "^\\d{10}$", "isRequired": true, "order": 2, "status": "active" },
  { "service": "service_cashin_id", "fieldName": "AMOUNT", "fieldFormat": "number", "minLength": 1000, "isRequired": true, "order": 3, "status": "active" }
]
```

### 2.3 TransValidation
```json
[
  { "service": "service_cashin_id", "validateFunc": "validateReceiverChecksum", "validateFields": "RECEIVERID", "order": 1, "errorCode": "ERR_INVALID_RECEIVER_POCKET", "status": "active" }
]
```
*(Ghi chú: Thường không cần check `validateSenderAccountSufficiency` đối với ví Bank vì ví Bank được nạp số dư khổng lồ định kỳ hoặc cho phép âm, tuy nhiên tuỳ nghiệp vụ có thể thêm vào).*

### 2.4 TransDefinition
```json
{
  "service": "service_cashin_id",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": { "level": "wallet", "target": "BANK_POCKET_ID" },
      "credit": { "level": "productLevel", "target": "RECEIVERID" }
    }
  ],
  "status": "active"
}
```

---

## 3. Bill Payment (Thanh toán hoá đơn)

Thanh toán cho Biller. Lấy BillerId từ cấu hình. Yêu cầu Enquiry URL để lấy số tiền gốc và Payment URL để gạch nợ.

### 3.1 Service
```json
{
  "_id": "ObjectId('service_bill_id')",
  "code": "BILL_PAYMENT",
  "name": "Thanh toán hoá đơn dịch vụ",
  "action": "billerTrans",
  "actionParams": { "billerId": "ObjectId('biller_evn_id')" },
  "fieldBuilder": [
    { "order": 1, "name": "CURRENCY", "rule": "fixed", "variable": "VND" },
    { "order": 2, "name": "BILLCODE", "rule": "mapping", "source": "parameters.billCode" },
    { "order": 3, "name": "SENDERID", "rule": "query", "query": "queryPocketByUserId(USERID).id" },
    { "order": 4, "name": "RECEIVERID", "rule": "query", "query": "queryPocketByBillerId(actionParams.billerId).id" }
  ],
  "fee": { "type": "fixed", "value": 1000 },
  "auth": { "method": "PIN" },
  "status": "active"
}
```
*(Ghi chú: Trường `AMOUNT` không được client truyền lên qua `parameters.amount` mà sẽ do Engine tự gọi `inquiryUrl` của Biller tại bước Request để tự động chèn vào TRANSBODY).*

### 3.2 TransField
```json
[
  { "service": "service_bill_id", "fieldName": "SERVICEID", "fieldFormat": "string", "isRequired": true, "order": 1, "status": "active" },
  { "service": "service_bill_id", "fieldName": "BILLCODE", "fieldFormat": "string", "isRequired": true, "order": 2, "status": "active" }
]
```

### 3.3 TransValidation
```json
[
  { "service": "service_bill_id", "validateFunc": "validateSenderAccountSufficiency", "validateFields": "SENDERID:AMOUNT:DEBITFEE", "order": 1, "errorCode": "ERR_INSUFFICIENT_BALANCE", "status": "active" }
]
```

### 3.4 TransDefinition
```json
{
  "service": "service_bill_id",
  "glSteps": [
    {
      "order": 0,
      "amount": "AMOUNT",
      "debit": { "level": "productLevel", "target": "SENDERID" },
      "credit": { "level": "productLevel", "target": "RECEIVERID" }
    },
    {
      "order": 1,
      "amount": "DEBITFEE",
      "debit": { "level": "productLevel", "target": "SENDERID" },
      "credit": { "level": "wallet", "target": "SYSTEM_POCKET_ID" }
    }
  ],
  "status": "active"
}
```

---
*Chốt Thiết kế Config 3 Nghiệp Vụ - Theo sát "Checklist Design Gate" của tài liệu WEEK2-DESIGN-BRIEF.*
