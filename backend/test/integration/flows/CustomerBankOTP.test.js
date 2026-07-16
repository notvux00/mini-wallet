const request = require('supertest');
const assert = require('assert');

describe('Customer Bank OTP Flow', function() {
  let token;
  let bankId;
  let linkId;
  let devOtp;

  let customerId;

  before(async function() {
    const pocket = await Pocket.create({
      user: 'temp',
      client: 'customer',
      name: 'Ví Khách Hàng',
      currency: 'VND',
      balance: 0,
      checksum: sails.services.securityutil.generatePocketChecksum(0, 'temp'),
      status: 'active'
    }).fetch();

    const customer = await Customer.create({
      phone: '0901234567',
      passwordHash: 'dummy_hash',
      pinHash: 'dummy_pin_hash',
      name: 'Test User OTP',
      status: 'active',
      pocket: pocket.id
    }).fetch();
    customerId = customer.id;
    await Pocket.updateOne({ id: pocket.id }).set({ user: customerId });

    token = sails.services.securityutil.generateToken({ id: customerId, clientType: 'customer', username: '0901234567' });
    let bank = await Bank.findOne({ code: 'VCB' });
    if (!bank) {
      bank = await Bank.create({
        name: 'Vietcombank',
        code: 'VCB',
        pocket: global.testData.vcb.id,
        status: 'active'
      }).fetch();
    }
    bankId = bank.id;
  });

  afterEach(function() {
    // reset Redis fake store after each test to ensure clean state
    if (sails.services.redisservice._resetFakeStore) {
      sails.services.redisservice._resetFakeStore();
    }
  });

  it('Should successfully request link and return devOtp', async function() {
    const app = sails.hooks.http.app;
    const res = await request(app)
      .post('/api/customer/bank/request-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankId: bankId,
        cardNumber: '9704361234567890',
        cardHolder: 'NGUYEN VAN A'
      })
      .expect(200);

    assert.strictEqual(res.body.err, 200);
    assert.ok(res.body.data.linkId);
    assert.ok(res.body.data._devOtp);
    
    linkId = res.body.data.linkId;
    devOtp = res.body.data._devOtp;

    const linkDb = await BankLink.findOne({ id: linkId });
    assert.strictEqual(linkDb.status, 'pending_otp');
  });

  it('Should reject duplicate request if OTP is still active in Redis', async function() {
    const app = sails.hooks.http.app;
    // Set a lock manually
    await sails.services.redisservice.setnx(`bank_otp:${linkId}`, '111111', 300);

    const res = await request(app)
      .post('/api/customer/bank/request-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankId: bankId,
        cardNumber: '9704361234567890',
        cardHolder: 'NGUYEN VAN A'
      })
      .expect(200); // Controller returns res.error which is 200 HTTP status with custom payload or sometimes 400. In Sails res.error usually maps to custom response. Actually let's just check body code. Wait, res.error maps to 400? Let's check status.

    // If it throws, it goes to catch block -> SERVER_ERROR
    assert.strictEqual(res.body.err, 500);
    assert.ok(res.body.message.includes('Hệ thống đang bận'));
  });

  it('Should reject invalid OTP', async function() {
    const app = sails.hooks.http.app;
    // set actual OTP
    await sails.services.redisservice.setnx(`bank_otp:${linkId}`, '123456', 300);

    const res = await request(app)
      .post('/api/customer/bank/verify-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linkId: linkId,
        otp: '999999' // wrong
      });

    assert.strictEqual(res.body.err, 400);
    assert.strictEqual(res.body.message, 'Mã OTP không chính xác hoặc đã hết hạn!');
  });

  it('Should reject and clear OTP after 5 failed attempts', async function() {
    const app = sails.hooks.http.app;
    // Set actual OTP
    await sails.services.redisservice.setnx(`bank_otp:${linkId}`, '123456', 300);

    for (let i = 1; i <= 4; i++) {
      let res = await request(app)
        .post('/api/customer/bank/verify-link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          linkId: linkId,
          otp: '999999'
        });
      assert.strictEqual(res.body.err, 400);
      assert.strictEqual(res.body.message, 'Mã OTP không chính xác hoặc đã hết hạn!');
    }

    // 5th attempt
    let finalRes = await request(app)
      .post('/api/customer/bank/verify-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linkId: linkId,
        otp: '999999'
      });
    
    assert.strictEqual(finalRes.body.err, 400);
    assert.strictEqual(finalRes.body.message, 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy, vui lòng yêu cầu mã mới.');
    
    // verify OTP is cleared
    const otpKey = `bank_otp:${linkId}`;
    const savedOtp = await sails.services.redisservice.get(otpKey);
    assert.strictEqual(savedOtp, null);
  });

  it('Should reject expired OTP (not in Redis)', async function() {
    const app = sails.hooks.http.app;
    // Do NOT set in redis so it acts as expired

    const res = await request(app)
      .post('/api/customer/bank/verify-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linkId: linkId,
        otp: '123456' 
      });

    assert.strictEqual(res.body.err, 400);
    assert.strictEqual(res.body.message, 'Mã OTP không chính xác hoặc đã hết hạn!');
  });

  it('Should successfully verify correct OTP', async function() {
    const app = sails.hooks.http.app;
    await sails.services.redisservice.setnx(`bank_otp:${linkId}`, '123456', 300);

    const res = await request(app)
      .post('/api/customer/bank/verify-link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        linkId: linkId,
        otp: '123456' 
      })
      .expect(200);

    assert.strictEqual(res.body.err, 200);

    const linkDb = await BankLink.findOne({ id: linkId });
    assert.strictEqual(linkDb.status, 'linked');
  });

  it('Should reject Redis failure for request-link', async function() {
    const app = sails.hooks.http.app;
    
    // Simulate redis down by making setnx always return false
    const origSetnx = sails.services.redisservice.setnx;
    sails.services.redisservice.setnx = async () => false;

    try {
      // We need a pending link
      const pendingLink = await BankLink.create({
        customer: customerId,
        bank: bankId,
        cardNumber: '9704360000000000',
        cardHolder: 'NGUYEN VAN B',
        status: 'pending_otp'
      }).fetch();

      const res = await request(app)
        .post('/api/customer/bank/request-link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bankId: bankId,
          cardNumber: '9704360000000000',
          cardHolder: 'NGUYEN VAN B'
        });

      assert.strictEqual(res.body.err, 500);
      assert.ok(res.body.message.includes('Hệ thống đang bận'));
    } finally {
      // restore
      sails.services.redisservice.setnx = origSetnx;
    }
  });

});
