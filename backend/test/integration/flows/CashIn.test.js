const assert = require('assert');

describe('CashIn Transaction Flow', function() {
  it('Should successfully execute a CashIn and transfer money from OTC to Customer', async function() {
    const { p2pService, vcb, receiverPocket, sysFee } = global.testData; // using p2pService as a mock service since we just test GL Steps
    
    // Create a mock CashIn service
    const cashInService = await Service.create({
      code: 'CASHIN_TEST',
      name: 'Nạp tiền mặt Test',
      action: 'cashIn',
      fee: { type: 'fixed', value: 0 },
      auth: { method: 'NONE' },
      status: 'active',
      fieldBuilder: [
        { order: 1, name: 'AMOUNT', rule: 'mapping', source: 'parameters', variable: 'AMOUNT', datatype: 'number' },
        { order: 2, name: 'SENDERID', rule: 'mapping', source: 'parameters', variable: 'BANKID', datatype: 'string' },
        { order: 3, name: 'RECEIVERID', rule: 'mapping', source: 'parameters', variable: 'RECEIVERPHONE', datatype: 'string' }
      ]
    }).fetch();

    await TransDefinition.create({
      service: cashInService.id,
      glSteps: [
        { order: 0, amount: 'AMOUNT', debit: { level: 'productLevel', target: 'SENDERID' }, credit: { level: 'productLevel', target: 'RECEIVERID' } }
      ],
      status: 'active'
    });

    const receiverDb = await Pocket.findOne({ id: receiverPocket.id });
    const vcbDb = await Pocket.findOne({ id: vcb.id });

    const initReceiverBalance = receiverDb.balance;
    const initVcbBalance = vcbDb.balance;

    const reqResult = await TransactionEngine.engineRequestTransaction({
      serviceId: cashInService.id,
      transData: {
        AMOUNT: 500000,
        BANKID: vcb.id,
        RECEIVERPHONE: receiverPocket.id // bypassing phone lookup for unit test simplicity
      },
      userId: 'test_officer',
      clientType: 'officer'
    });

    await TransactionEngine.engineConfirmTransaction({
      transRefId: reqResult.transRefId,
      userId: 'test_officer',
      clientType: 'officer'
    });

    const verifyResult = await TransactionEngine.engineVerifyTransaction({
      transRefId: reqResult.transRefId,
      authCode: 'NONE',
      userId: 'test_officer',
      clientType: 'officer'
    });

    assert.strictEqual(verifyResult.status, 'SUCCESS');

    const updatedVcb = await Pocket.findOne({ id: vcb.id });
    const updatedReceiver = await Pocket.findOne({ id: receiverPocket.id });

    assert.strictEqual(updatedVcb.balance, initVcbBalance - 500000, 'Bank balance should decrease');
    assert.strictEqual(updatedReceiver.balance, initReceiverBalance + 500000, 'Receiver balance should increase');
  });
});
