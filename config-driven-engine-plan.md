# Config-Driven Engine Improvement Plan

## Goal
Nang cap Mini-Wallet de them service moi bang config qua Officer UI ma khong can sua code engine, tru cac primitive he thong that su moi.

## Current Verdict
Du an da co nen tang config-driven: `Service.fieldBuilder`, `TransField`, `TransValidation`, `TransDefinition.glSteps`, va runtime chung `request -> confirm -> verify`.

Nhung engine chua generic hoan toan vi van hard-code query, validator, fee, biller flow, va mot so contract trong docs chua khop voi code.

## Tasks
- [ ] P0 - Chuan hoa contract `TRANSBODY`: dung thong nhat `DEBITFEE`, `TOTALAMOUNT`, `TRANSREFID`, `SERVICEID`; cap nhat engine va seed de khong con dung lan `FEE`.
  Verify: P2P preview tra dung `amount`, `fee`, `totalAmount`; glStep phi doc duoc `DEBITFEE`.

- [ ] P0 - Tach `fieldBuilder` thanh registry resolver rieng, vi du `FieldResolver.resolve(fb, context)`, ho tro `fixed`, `mapping`, `query`.
  Verify: `NeonMessage.processRequestStep` khong con parse regex truc tiep cac chuoi `queryPocketBy...`.

- [ ] P0 - Tao query registry co danh sach primitive duoc phep: `queryPocketByUserId`, `queryPocketByPhone`, `queryPocketByBillerId`, `queryPocketByPocketId`.
  Verify: them mot query primitive moi chi can them vao registry, khong sua request runtime.

- [ ] P0 - Tao validation registry cho `TransValidation`: `validateReceiverIsNotSender`, `validateSenderAccountSufficiency`, `validateMinAmount`, checksum/status pocket.
  Verify: request va verify deu goi validator theo `validateFunc` tu DB; service co validator khong ton tai bi tu choi ro rang.

- [ ] P0 - Hoan thien `TransField.validateFields`: check required, type, min/max, regex, status active.
  Verify: input sai type, sai regex so dien thoai, hoac duoi minAmount fail truoc khi tao trail pending.

- [ ] P0 - Tinh phi tu `Service.fee`: fixed, percent, optional min/max; ghi `DEBITFEE` va `TOTALAMOUNT` vao trail.
  Verify: service phi fixed va percent deu tao preview dung, verify tinh lai phi dung voi request.

- [ ] P1 - Hoan thien verify runtime theo brief: lock sender pocket, revalidate fields, tinh lai fee, re-run validations, execute glSteps trong Mongo transaction, release lock moi loi ra.
  Verify: giao dich thanh cong tao `Transaction`, cap nhat vi ACID; giao dich loi khong tru tien va sender pocket ve `active`.

- [ ] P1 - Ghi `PocketEntry` cho tung glStep va bo qua step amount <= 0.
  Verify: P2P co step goc va step phi tao entry rieng; fee 0 khong tao entry phi.

- [ ] P1 - Hoan thien Bill Payment runtime: request goi `Biller.inquiryUrl` de set `AMOUNT`; verify goi `paymentUrl` sau khi ghi so thanh cong; luu `billerRefId` va trang thai sync.
  Verify: bill payment khong nhap amount van preview dung; payment fail khong rollback tien da ghi so, trail danh dau can retry.

- [ ] P2 - Lam Officer Service Builder bot dong khung nghiep vu: hien primitive query/validator tu meta API thay vi hard-code chi P2P/Cash-in/Biller.
  Verify: Officer co the cau hinh service moi bang chon resolver, validator, fee, auth, glSteps ma khong sua frontend cho tung action.

## Done When
- [ ] Tao service P2P, Cash-in, Bill Payment tu Officer UI va chay end-to-end.
- [ ] Tao service thu 4 cung cac primitive san co ma khong sua `NeonMessage.js` hoac controller runtime.
- [ ] Neu can primitive moi, chi them vao registry/meta API, khong chen logic nghiep vu vao flow request/confirm/verify.
- [ ] Co test hoac script verify cho request/confirm/verify, fee, validation, glSteps, va biller flow.

## Suggested Implementation Order
1. Fix contract `TRANSBODY`, fee, and TransField validation first because these affect every service.
2. Extract field/query/validation registries before adding more business cases.
3. Harden verify runtime and accounting entries.
4. Add Bill Payment integration after the accounting path is reliable.
5. Update Officer UI/meta APIs last so the UI exposes the new generic engine safely.

## Notes
- Config-driven khong co nghia la engine khong co code. Engine van can mot thu vien primitive an toan: query resolvers, validators, fee calculators, auth handlers, external action handlers.
- Muc tieu dung: service moi duoc tao bang cach lap ghep cac primitive da co. Khi nghiep vu can hanh vi that su moi, ta them primitive vao registry, khong sua flow engine.
