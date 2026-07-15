const request = require('supertest');
const assert = require('assert');

describe('Officer Biller SSRF Flow', function() {
  let officerToken;

  before(async function() {
    // Tạo Officer tạm để test
    const officer = await Officer.create({
      username: 'test_officer_ssrf',
      passwordHash: 'dummy',
      name: 'Test Officer SSRF',
      role: 'officer',
      status: 'active'
    }).fetch();

    officerToken = sails.services.securityutil.generateToken({ id: officer.id, clientType: 'officer', username: officer.username, role: officer.role });
  });

  after(async function() {
    // Cleanup nếu cần
  });

  it('Should reject SSRF payloads with private IPs in production mode', async function() {
    const app = sails.hooks.http.app;
    
    // Giả lập môi trường production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const payloads = [
      'https://127.0.0.1/api',
      'https://127.0.0.2/api',
      'https://0.0.0.0/api',
      'https://[::ffff:7f00:1]/api',
      'https://[::1]/api',
      'https://192.168.1.1/api'
    ];

    try {
      for (const url of payloads) {
        const res = await request(app)
          .post('/api/officer/billers/create')
          .set('Authorization', `Bearer ${officerToken}`)
          .send({
            code: `TEST_SSRF_${Math.random()}`,
            name: 'Test Biller',
            inquiryUrl: url,
            paymentUrl: 'https://google.com/api'
          });

        if (res.body.err !== 400) console.log('Response:', res.body);
        assert.strictEqual(res.body.err, 400, `Failed to block ${url}`);
        assert.ok(res.body.message.includes('không an toàn'), `Wrong error message for ${url}`);
      }
    } finally {
      // Phục hồi lại env
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('Should allow safe URLs', async function() {
    const app = sails.hooks.http.app;
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app)
        .post('/api/officer/billers/create')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          code: `TEST_SAFE_${Date.now()}`,
          name: 'Test Biller Safe',
          inquiryUrl: 'https://api.github.com/test',
          paymentUrl: 'https://api.github.com/pay'
        });

      assert.strictEqual(res.body.err, 200);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
