const assert = require('assert');

describe('Bank Withdraw Flow', function() {
  it('Should successfully execute a Bank Withdraw', async function() {
    const { vcb, senderPocket, sysFee } = global.testData; 
    
    // Create a mock Withdraw service
    const withdrawService = await Service.create({
      code: 'WITHDRAW_TEST',
      name: 'Rút tiền Test',
      action: 'bankWithdraw',
      fee: { type: 'fixed', value: 5000 }, // 5000 VND fee for withdrawing
      auth: { method: 'NONE' },
      status: 'active',
      fieldBuilder: [
        { order: 1, name: 'AMOUNT', rule: 'mapping', source: 'parameters', variable: 'AMOUNT', datatype: 'number' },
        { order: 2, name: 'SENDERID', rule: 'mapping', source: 'parameters', variable: 'SENDERPHONE', datatype: 'string' },
        { order: 3, name: 'RECEIVERID', rule: 'mapping', source: 'parameters', variable: 'BANKID', datatype: 'string' }
      ]
    }).fetch();

    await TransDefinition.create({
      service: withdrawService.id,
      glSteps: [
        { order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' } },
        { order: 1, amount: 'FEE', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'wallet', target: sysFee.id } }
      ],
      status: 'active'
    });

    const senderDb = await Pocket.findOne({ id: senderPocket.id });
    const vcbDb = await Pocket.findOne({ id: vcb.id });
    const feeDb = await Pocket.findOne({ id: sysFee.id });

    const initSenderBalance = senderDb.balance;
    const initVcbBalance = vcbDb.balance;
    const initFeeBalance = feeDb.balance;

    const reqResult = await TransactionEngine.engineRequestTransaction({
      serviceId: withdrawService.id,
      transData: {
        AMOUNT: 20000,
        SENDERPHONE: senderPocket.id, 
        BANKID: vcb.id
      },
      userId: 'test_user_1',
      clientType: 'officer'
    });

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

    const updatedVcb = await Pocket.findOne({ id: vcb.id });
    const updatedSender = await Pocket.findOne({ id: senderPocket.id });
    const updatedFee = await Pocket.findOne({ id: sysFee.id });

    // Sender had initSenderBalance, withdraw 20000 + 5000 fee
    assert.strictEqual(updatedSender.balance, initSenderBalance - 25000, 'Sender balance should decrease by AMOUNT + FEE');
    // VCB balance should increase by 20000
    assert.strictEqual(updatedVcb.balance, initVcbBalance + 20000, 'Bank balance should increase by AMOUNT');
    // SysFee should increase by 5000
    assert.strictEqual(updatedFee.balance, initFeeBalance + 5000, 'System fee should increase by FEE');
  });
});
