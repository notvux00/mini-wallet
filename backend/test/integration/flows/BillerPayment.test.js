const assert = require('assert');

describe('Biller Payment Flow', function() {
  it('Should successfully execute a Biller Payment with discount', async function() {
    const { senderPocket, sysFee } = global.testData; 

    // Create Biller pocket
    const billerPocket = await Pocket.create({
      user: 'viettel_admin',
      client: 'biller',
      name: 'Ví Biller Viettel',
      currency: 'VND',
      balance: 0,
      checksum: sails.services.securityutil.generatePocketChecksum(0, 'viettel_admin'),
      status: 'active'
    }).fetch();

    const biller = await Biller.create({
      code: 'VIETTEL',
      name: 'Viettel Telecom',
      paymentUrl: 'http://localhost:1337/mock',
      pocket: billerPocket.id,
      status: 'active'
    }).fetch();
    
    
    // Create a mock Biller service
    const billerService = await Service.create({
      code: 'BILL_ELEC_VIETTEL',
      name: 'Thanh toán tiền điện Viettel',
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
        BILLERID: 'VIETTEL',
        BILLCODE: '123456'
      },
      userId: 'test_user_1',
      clientType: 'officer'
    });

    // 10000 AMOUNT, 0 FEE, 5% DISCOUNT = 500
    assert.strictEqual(reqResult.preview.amount, 10000);
    assert.strictEqual(reqResult.preview.fee, 0);
    assert.strictEqual(reqResult.preview.discount, 500);
    assert.strictEqual(reqResult.preview.totalAmount, 9500); // 10000 + 0 - 500

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

    const updatedBiller = await Pocket.findOne({ id: billerPocket.id });
    const updatedSender = await Pocket.findOne({ id: senderPocket.id });
    const updatedFee = await Pocket.findOne({ id: sysFee.id });

    // Sender should be deducted 9500
    assert.strictEqual(updatedSender.balance, initSenderBalance - 9500, 'Sender balance should decrease by 9500');
    // Biller should receive 10000
    assert.strictEqual(updatedBiller.balance, initBillerBalance + 10000, 'Biller balance should increase by 10000');
    // SysFee should be deducted 500 (since FEE is 0, DISCOUNT is 500)
    assert.strictEqual(updatedFee.balance, initFeeBalance - 500, 'System fee should decrease by 500');
  });
});
