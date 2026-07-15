const sails = require('sails');
const rc = require('sails/accessible/rc');

before(function (done) {
  // Increase the Mocha timeout so that Sails has enough time to lift
  this.timeout(10000);

  const config = rc('sails');
  // Override configuration for test environment
  config.environment = 'test';
  config.models = {
    migrate: 'drop',
    datastore: 'testDb',
  };
  config.datastores = {
    testDb: {
      adapter: 'sails-mongo',
      url: 'mongodb://localhost:27017/mini-wallet-test'
    }
  };
  config.port = 1338; // Use different port for tests
  config.log = { level: 'warn' }; // Suppress normal logs

  sails.lift(config, async function (err) {
    if (err) return done(err);
    
    try {
      // Create System Fee Pocket
      const sysFee = await Pocket.create({
        user: 'system_admin',
        client: 'system',
        name: 'Ví thu tiền phí',
        currency: 'VND',
        balance: 0,
        checksum: 'fake_checksum_sys_fee',
        status: 'active'
      }).fetch();

      // Create OTC Pocket
      const otc = await Pocket.create({
        user: 'otc_admin',
        client: 'system',
        name: 'Két tiền mặt quầy (OTC)',
        currency: 'VND',
        balance: 0,
        checksum: 'fake_checksum_otc',
        status: 'active'
      }).fetch();

      // Create Bank Pocket
      const vcb = await Pocket.create({
        user: 'vcb_admin',
        client: 'bank',
        name: 'Ví Ngân Hàng VCB',
        currency: 'VND',
        balance: 1000000000,
        checksum: 'fake_checksum_vcb',
        status: 'active'
      }).fetch();

      const senderPocket = await Pocket.create({
        user: 'test_user_1',
        client: 'customer',
        name: 'Ví SENDER',
        currency: 'VND',
        balance: 50000,
        checksum: 'fake_checksum_sender',
        status: 'active'
      }).fetch();

      const receiverPocket = await Pocket.create({
        user: 'test_user_2',
        client: 'customer',
        name: 'Ví RECEIVER',
        currency: 'VND',
        balance: 0,
        checksum: 'fake_checksum_receiver',
        status: 'active'
      }).fetch();

      // Create a P2P service
      const p2pService = await Service.create({
        code: 'P2P_TEST',
        name: 'Chuyển tiền P2P Test',
        action: 'none',
        fee: { type: 'fixed', value: 1000 },
        auth: { method: 'NONE' },
        status: 'active',
        fieldBuilder: [
          { order: 1, name: 'AMOUNT', rule: 'mapping', source: 'parameters', variable: 'AMOUNT', datatype: 'number' },
          { order: 2, name: 'SENDERID', rule: 'mapping', source: 'parameters', variable: 'SENDERID', datatype: 'string' },
          { order: 3, name: 'RECEIVERID', rule: 'mapping', source: 'parameters', variable: 'RECEIVERID', datatype: 'string' }
        ]
      }).fetch();

      await TransDefinition.create({
        service: p2pService.id,
        glSteps: [
          { order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' } },
          { order: 1, amount: 'FEE', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'wallet', target: sysFee.id } }
        ],
        status: 'active'
      });

      // Save for tests
      global.testData = {
        sysFee, vcb, senderPocket, receiverPocket, p2pService
      };
      
    } catch (e) {
      return done(e);
    }
    
    return done();
  });
});

afterEach(function() {
  if (sails.services && sails.services.redisservice && typeof sails.services.redisservice._resetFakeStore === 'function') {
    sails.services.redisservice._resetFakeStore();
  }
});

after(function (done) {
  sails.lower(done);
});
