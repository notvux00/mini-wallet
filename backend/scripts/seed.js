/**
 * Seed Script — Dev Data
 * Chạy bằng: node scripts/seed.js
 *
 * Tạo đủ:
 *   1. Customer (Alice + Bob)
 *   2. Pocket cho mỗi Customer
 *   3. Bank Pocket (1 tỷ VND)
 *   4. System Pocket
 *   5. Service Cash-in
 *   6. Service P2P
 */

const Sails = require('sails');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Phải khớp với SecurityUtil.generatePocketChecksum
const POCKET_SALT = process.env.POCKET_SALT || 'MINIWALLET_SECRET_2026';
function generateChecksum(balance, userId) {
  const balanceStr = Number(balance).toString();
  const userStr = userId ? String(userId) : 'SYSTEM_WALLET';
  return crypto.createHash('md5').update(`${balanceStr}_${userStr}_${POCKET_SALT}`).digest('hex');
}

Sails.lift({
  hooks: { grunt: false, views: false, http: false, sockets: false, session: false },
  log: { level: 'warn' }
}, async function (err, app) {
  if (err) {
    console.error('Sails lift failed:', err);
    process.exit(1);
  }

  const db = sails.getDatastore().manager.client.db();

  console.log('\n🌱 Bắt đầu seed dev data...\n');

  // ──────────────────────────────────────────────
  // 1. CUSTOMERS
  // ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const pinHash = await bcrypt.hash('123456', 10);

  const customers = [
    { name: 'Alice Nguyen', phone: '0901111111' },
    { name: 'Bob Tran',     phone: '0902222222' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const existing = await Customer.findOne({ phone: c.phone });
    if (existing) {
      console.log(`  ⏭  Customer ${c.phone} đã tồn tại — skip`);
      createdCustomers.push(existing);
      continue;
    }

    // Tạo Pocket trước (Customer cần pocket ID)
    const pocket = await Pocket.create({
      client: 'customer',
      currency: 'VND',
      balance: 0,
      checksum: generateChecksum(0, c.phone),
      state: 'active',
      status: 'active',
    }).fetch();

    const customer = await Customer.create({
      phone: c.phone,
      name: c.name,
      passwordHash,
      pinHash,
      pocket: pocket.id,
    }).fetch();

    // Cập nhật lại Pocket: user = customer.id + checksum tính lại với customer.id
    const correctChecksum = generateChecksum(0, customer.id);
    await Pocket.update({ id: pocket.id }).set({ user: customer.id, checksum: correctChecksum });

    createdCustomers.push(customer);
    console.log(`  ✅ Customer: ${c.name} (${c.phone}) | Pocket: ${pocket.id}`);
  }

  // ──────────────────────────────────────────────
  // 2. BANK POCKET
  // ──────────────────────────────────────────────
  const existingBank = await Pocket.findOne({ client: 'bank' });
  let bankPocket = existingBank;
  if (!existingBank) {
    bankPocket = await Pocket.create({
      client: 'bank',
      currency: 'VND',
      balance: 1000000000, // 1 tỷ
      checksum: generateChecksum(1000000000, 'bank'),
      state: 'active',
      status: 'active',
    }).fetch();
    console.log(`  ✅ Bank Pocket: ${bankPocket.id} (1,000,000,000 VND)`);
  } else {
    console.log(`  ⏭  Bank Pocket đã tồn tại (${existingBank.id}) — skip`);
  }

  // ──────────────────────────────────────────────
  // 3. SYSTEM POCKET
  // ──────────────────────────────────────────────
  const existingSystem = await Pocket.findOne({ client: 'system' });
  if (!existingSystem) {
    const sysPocket = await Pocket.create({
      client: 'system',
      currency: 'VND',
      balance: 0,
      checksum: generateChecksum(0, 'system'),
      state: 'active',
      status: 'active',
    }).fetch();
    console.log(`  ✅ System Pocket: ${sysPocket.id}`);
  } else {
    console.log(`  ⏭  System Pocket đã tồn tại — skip`);
  }

  // ──────────────────────────────────────────────
  // 4. SERVICE: CASH-IN
  // ──────────────────────────────────────────────
  const existingCashin = await Service.findOne({ code: 'CASHIN_VND' });
  if (!existingCashin) {
    const SVC_ERR = { SENDER_NOT_FOUND: 5010, RECEIVER_NOT_FOUND: 5011, CURRENCY_INVALID: 5020 };

    const fieldBuilder = [
      { order: 1, name: 'BANKID',        rule: 'mapping', source: 'parameters', variable: 'BANKID',        datatype: 'string' },
      { order: 2, name: 'RECEIVERPHONE', rule: 'mapping', source: 'parameters', variable: 'RECEIVERPHONE', datatype: 'string' },
      { order: 3, name: 'AMOUNT',        rule: 'mapping', source: 'parameters', variable: 'AMOUNT',        datatype: 'number' },
      { order: 4, name: 'CURRENCY',      rule: 'fixed',   source: '',           variable: 'VND',           datatype: 'string' },
      { order: 5, name: 'SENDERID',      rule: 'mapping', source: 'parameters', variable: 'BANKID',        datatype: 'string', errorCode: SVC_ERR.SENDER_NOT_FOUND, errorMessage: 'Ví Bank không hợp lệ.' },
      { order: 6, name: 'RECEIVERID',    rule: 'query',   source: 'system',     variable: 'queryPocketByPhone(RECEIVERPHONE).id', datatype: 'string', errorCode: SVC_ERR.RECEIVER_NOT_FOUND, errorMessage: 'Không tìm thấy ví khách hàng.' },
    ];

    const glSteps = [{ order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' } }];

    const svcResult = await db.collection('service').insertOne({
      code: 'CASHIN_VND', name: 'Nạp tiền VND', action: 'cashIn',
      actionParams: { bankPocketField: 'BANKID', receiverPhoneField: 'RECEIVERPHONE' },
      auth: { method: 'NONE' }, fee: { type: 'fixed', value: 0 },
      status: 'active', fieldBuilder, createdAt: Date.now(), updatedAt: Date.now(),
    });
    const svcId = svcResult.insertedId.toString();

    await db.collection('transfield').insertMany([
      { service: svcId, fieldName: 'BANKID',        fieldFormat: 'string', isRequired: true,  order: 1, errorCode: 5001, errorMessage: 'BANKID không hợp lệ.',        createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'RECEIVERPHONE', fieldFormat: 'string', isRequired: true,  order: 2, errorCode: 5002, errorMessage: 'SĐT người nhận không hợp lệ.', createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'AMOUNT',        fieldFormat: 'number', isRequired: true,  order: 3, errorCode: 5003, errorMessage: 'Số tiền không hợp lệ.',         createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'SERVICEID',     fieldFormat: 'string', isRequired: true,  order: 0, errorCode: 5000, errorMessage: 'Không tìm thấy dịch vụ.',      createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'CURRENCY',      fieldFormat: 'string', isRequired: true,  order: 1000, errorCode: 5020, errorMessage: 'Tiền tệ không hợp lệ.',     createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'SENDERID',      fieldFormat: 'string', isRequired: true,  order: 1001, errorCode: 5010, errorMessage: 'Ví nguồn không hợp lệ.',    createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'RECEIVERID',    fieldFormat: 'string', isRequired: true,  order: 1002, errorCode: 5011, errorMessage: 'Ví đích không hợp lệ.',      createdAt: Date.now(), updatedAt: Date.now() },
    ]);

    await db.collection('transdefinition').insertOne({
      service: svcId, glSteps, amountField: 'AMOUNT',
      status: 'active', createdAt: Date.now(), updatedAt: Date.now(),
    });

    console.log(`  ✅ Service Cash-in: CASHIN_VND (id: ${svcId})`);
  } else {
    console.log(`  ⏭  Service CASHIN_VND đã tồn tại — skip`);
  }

  // ──────────────────────────────────────────────
  // 5. SERVICE: P2P
  // ──────────────────────────────────────────────
  const existingP2P = await Service.findOne({ code: 'P2P_VND' });
  if (!existingP2P) {
    const fieldBuilder = [
      { order: 1, name: 'RECEIVERPHONE', rule: 'mapping', source: 'parameters', variable: 'RECEIVERPHONE', datatype: 'string' },
      { order: 2, name: 'AMOUNT',        rule: 'mapping', source: 'parameters', variable: 'AMOUNT',        datatype: 'number' },
      { order: 3, name: 'CURRENCY',      rule: 'fixed',   source: '',           variable: 'VND',           datatype: 'string' },
      { order: 4, name: 'SENDERID',      rule: 'query',   source: 'system',     variable: 'queryPocketByUserId(USERID).id', datatype: 'string' },
      { order: 5, name: 'RECEIVERID',    rule: 'query',   source: 'system',     variable: 'queryPocketByPhone(RECEIVERPHONE).id', datatype: 'string' },
    ];

    const glSteps = [{ order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' } }];

    const svcResult = await db.collection('service').insertOne({
      code: 'P2P_VND', name: 'Chuyển tiền P2P', action: 'none',
      actionParams: { receiverPhoneField: 'RECEIVERPHONE' },
      auth: { method: 'PIN' }, fee: { type: 'fixed', value: 0 },
      status: 'active', fieldBuilder, createdAt: Date.now(), updatedAt: Date.now(),
    });
    const svcId = svcResult.insertedId.toString();

    await db.collection('transfield').insertMany([
      { service: svcId, fieldName: 'RECEIVERPHONE', fieldFormat: 'string', isRequired: true, order: 1, errorCode: 5002, errorMessage: 'SĐT người nhận không hợp lệ.', createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'AMOUNT',        fieldFormat: 'number', isRequired: true, order: 2, errorCode: 5003, errorMessage: 'Số tiền không hợp lệ.',         createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'SERVICEID',     fieldFormat: 'string', isRequired: true, order: 0, errorCode: 5000, errorMessage: 'Không tìm thấy dịch vụ.',      createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'CURRENCY',      fieldFormat: 'string', isRequired: true, order: 1000, errorCode: 5020, errorMessage: 'Tiền tệ không hợp lệ.',     createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'SENDERID',      fieldFormat: 'string', isRequired: true, order: 1001, errorCode: 5010, errorMessage: 'Ví nguồn không hợp lệ.',    createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, fieldName: 'RECEIVERID',    fieldFormat: 'string', isRequired: true, order: 1002, errorCode: 5011, errorMessage: 'Ví đích không hợp lệ.',      createdAt: Date.now(), updatedAt: Date.now() },
    ]);

    await db.collection('transvalidation').insertMany([
      { service: svcId, validateFunc: 'validateReceiverIsNotSender', validateFields: 'SENDERID:RECEIVERID', order: 1, errorCode: 5030, errorMessage: 'Người nhận không được trùng với người gửi.', createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, validateFunc: 'validateSenderAccountSufficiency', validateFields: 'SENDERID:AMOUNT:DEBITFEE', order: 2, errorCode: 5031, errorMessage: 'Số dư không đủ.', createdAt: Date.now(), updatedAt: Date.now() },
      { service: svcId, validateFunc: 'validateMinAmount', validateFields: 'AMOUNT:10000', order: 3, errorCode: 5032, errorMessage: 'Số tiền tối thiểu là 10,000đ.', createdAt: Date.now(), updatedAt: Date.now() },
    ]);

    await db.collection('transdefinition').insertOne({
      service: svcId, glSteps, amountField: 'AMOUNT',
      status: 'active', createdAt: Date.now(), updatedAt: Date.now(),
    });

    console.log(`  ✅ Service P2P: P2P_VND (id: ${svcId})`);
  } else {
    console.log(`  ⏭  Service P2P_VND đã tồn tại — skip`);
  }

  // ──────────────────────────────────────────────
  console.log('\n✅ Seed hoàn tất!\n');
  console.log('  Accounts:');
  console.log('    Officer  : admin / admin123');
  console.log('    Customer1: 0901111111 / password123 (PIN: 123456)');
  console.log('    Customer2: 0902222222 / password123 (PIN: 123456)');
  console.log('\n  Services:');
  console.log('    CASHIN_VND  — Nạp tiền (auth: NONE)');
  console.log('    P2P_VND     — Chuyển tiền (auth: PIN)\n');

  app.lower();
});
