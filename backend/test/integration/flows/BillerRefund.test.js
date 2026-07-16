const assert = require('assert');

describe('Biller Refund Flow', function() {
  it('Should successfully refund a pending Biller Payment and protect against double refund', async function() {
    const { senderPocket, sysFee } = global.testData; 

    // Create Biller pocket
    const billerPocket = await Pocket.create({
      user: 'viettel_admin_2',
      client: 'biller',
      name: 'Ví Biller Viettel 2',
      currency: 'VND',
      balance: 0,
      checksum: sails.services.securityutil.generatePocketChecksum(0, 'viettel_admin_2'),
      status: 'active'
    }).fetch();

    const biller = await Biller.create({
      code: 'VIETTEL_REFUND',
      name: 'Viettel Telecom Refund',
      paymentUrl: 'http://localhost:1338/mock_not_found', // This will result in 404 -> pending
      pocket: billerPocket.id,
      status: 'active'
    }).fetch();
    
    // Create a mock Biller service
    const billerService = await Service.create({
      code: 'BILL_ELEC_VIETTEL_REFUND',
      name: 'Thanh toán tiền điện Viettel Refund',
      action: 'billerTrans',
      actionParams: { billerIdField: 'RECEIVERID', customerCodeField: 'BILLCODE' },
      status: 'active',
      fee: { type: 'fixed', value: 0 },
      discount: { type: 'percentage', value: 5 }, // 5% discount
      auth: { method: 'NONE' },
      fieldBuilder: [
        { order: 1, name: 'AMOUNT', rule: 'mapping', source: 'parameters', variable: 'AMOUNT', datatype: 'number' },
        { order: 2, name: 'SENDERID', rule: 'mapping', source: 'parameters', variable: 'SENDERPHONE', datatype: 'string' },
        { order: 3, name: 'RECEIVERID', rule: 'mapping', source: 'parameters', variable: 'BILLERID', datatype: 'string' },
        { order: 4, name: 'BILLCODE', rule: 'mapping', source: 'parameters', variable: 'BILLCODE', datatype: 'string' }
      ]
    }).fetch();

    await TransDefinition.create({
      service: billerService.id,
      glSteps: [
        { order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'BILLERPOCKET' } },
        { order: 1, amount: 'FEE', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'wallet', target: sysFee.id } },
        { order: 2, amount: 'DISCOUNT', debit: { level: 'wallet', target: sysFee.id }, credit: { level: 'productLevel', target: 'SENDERID' } }
      ],
      status: 'active'
    });

    const senderDb = await Pocket.findOne({ id: senderPocket.id });
    const feeDb = await Pocket.findOne({ id: sysFee.id });

    const initSenderBalance = senderDb.balance; 
    const initBillerBalance = billerPocket.balance;
    const initFeeBalance = feeDb.balance;

    const reqResult = await TransactionEngine.engineRequestTransaction({
      serviceId: billerService.id,
      transData: {
        AMOUNT: 10000,
        SENDERPHONE: senderPocket.id, 
        BILLERID: 'VIETTEL_REFUND',
        BILLCODE: '123456'
      },
      userId: 'test_user_1',
      clientType: 'officer'
    });

    // 10000 AMOUNT, 0 FEE, 5% DISCOUNT = 500
    assert.strictEqual(reqResult.preview.totalAmount, 9500); 

    await TransactionEngine.engineConfirmTransaction({
      transRefId: reqResult.transRefId,
      userId: 'test_user_1',
      clientType: 'officer'
    });

    const verifyResult = await TransactionEngine.engineVerifyTransaction({
      transRefId: reqResult.transRefId,
      authCode: 'NONE',
      userId: 'test_user_1',
      clientType: 'officer'
    });

    assert.strictEqual(verifyResult.status, 'SUCCESS');

    // Wait a brief moment to ensure NeonMessage async process runs
    await new Promise(resolve => setTimeout(resolve, 100));

    // Biller should be paid and Sender deducted initially
    const postPaySender = await Pocket.findOne({ id: senderPocket.id });
    const postPayBiller = await Pocket.findOne({ id: billerPocket.id });
    const postPayFee = await Pocket.findOne({ id: sysFee.id });

    assert.strictEqual(postPaySender.balance, initSenderBalance - 9500);
    assert.strictEqual(postPayBiller.balance, initBillerBalance + 10000);

    // Verify trail status is pending due to network error
    const trail = await TransactionTrail.findOne({ transRefId: reqResult.transRefId });
    assert.strictEqual(trail.billerSyncStatus, 'pending');

    // Refund
    await NeonMessage.processBillerRefund(reqResult.transRefId);

    const refundedSender = await Pocket.findOne({ id: senderPocket.id });
    const refundedBiller = await Pocket.findOne({ id: billerPocket.id });
    const refundedFee = await Pocket.findOne({ id: sysFee.id });

    // Balances should return to exact initial state
    assert.strictEqual(refundedSender.balance, initSenderBalance);
    assert.strictEqual(refundedBiller.balance, initBillerBalance);
    assert.strictEqual(refundedFee.balance, initFeeBalance);

    // Verify Reverse entries are created
    const entries = await PocketEntry.find({ transRefId: reqResult.transRefId });
    assert.strictEqual(entries.length, 4); // 2 original + 2 reversed

    const trx = await Transaction.findOne({ transRefId: reqResult.transRefId });
    assert.strictEqual(trx.status, 'refunded');

    // Double refund protection test
    await NeonMessage.processBillerRefund(reqResult.transRefId);

    const doubleRefundSender = await Pocket.findOne({ id: senderPocket.id });
    assert.strictEqual(doubleRefundSender.balance, initSenderBalance, 'Double refund should not change balance');
  });
});
