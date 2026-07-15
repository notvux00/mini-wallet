const assert = require('assert');

describe('P2P Transaction Flow', function() {
  it('Should successfully execute a P2P transfer and charge fee', async function() {
    const { p2pService, senderPocket, receiverPocket, sysFee } = global.testData;

    const senderDb = await Pocket.findOne({ id: senderPocket.id });
    const receiverDb = await Pocket.findOne({ id: receiverPocket.id });
    const feeDb = await Pocket.findOne({ id: sysFee.id });

    const initSenderBalance = senderDb.balance;
    const initReceiverBalance = receiverDb.balance;
    const initFeeBalance = feeDb.balance;

    // 1. Request Transaction
    const reqResult = await TransactionEngine.engineRequestTransaction({
      serviceId: p2pService.id,
      transData: {
        AMOUNT: 10000,
        SENDERID: senderPocket.id,
        RECEIVERID: receiverPocket.id
      },
      userId: 'test_user_1',
      clientType: 'officer' // bypass pin for tests if any
    });

    assert.ok(reqResult.transRefId);
    assert.strictEqual(reqResult.preview.amount, 10000);
    assert.strictEqual(reqResult.preview.fee, 1000);
    assert.strictEqual(reqResult.preview.totalAmount, 11000);

    // 2. Confirm Transaction
    await TransactionEngine.engineConfirmTransaction({
      transRefId: reqResult.transRefId,
      userId: 'test_user_1',
      clientType: 'officer'
    });

    // 3. Verify Transaction
    const verifyResult = await TransactionEngine.engineVerifyTransaction({
      transRefId: reqResult.transRefId,
      authCode: 'NONE',
      userId: 'test_user_1',
      clientType: 'officer'
    });

    assert.strictEqual(verifyResult.status, 'SUCCESS');

    // 4. Verify balances
    const updatedSender = await Pocket.findOne({ id: senderPocket.id });
    const updatedReceiver = await Pocket.findOne({ id: receiverPocket.id });
    const updatedFee = await Pocket.findOne({ id: sysFee.id });

    assert.strictEqual(updatedSender.balance, initSenderBalance - 11000, 'Sender balance should decrease by AMOUNT + FEE');
    assert.strictEqual(updatedReceiver.balance, initReceiverBalance + 10000, 'Receiver balance should increase by AMOUNT');
    assert.strictEqual(updatedFee.balance, initFeeBalance + 1000, 'Fee balance should increase by FEE');
  });

  it('Should fail if SENDER has insufficient balance', async function() {
    const { p2pService, senderPocket, receiverPocket } = global.testData;

    try {
      const reqResult = await TransactionEngine.engineRequestTransaction({
        serviceId: p2pService.id,
        transData: {
          AMOUNT: 99999999, // Too large
          SENDERID: senderPocket.id,
          RECEIVERID: receiverPocket.id
        },
        userId: 'test_user_1',
        clientType: 'officer'
      });

      await TransactionEngine.engineConfirmTransaction({
        transRefId: reqResult.transRefId,
        userId: 'test_user_1',
        clientType: 'officer'
      });

      await TransactionEngine.engineVerifyTransaction({
        transRefId: reqResult.transRefId,
        authCode: 'NONE',
        userId: 'test_user_1',
        clientType: 'officer'
      });
      assert.fail('Should have thrown insufficient balance error');
    } catch (error) {
      if (!error.message.includes('TRX_ERR.INSUFFICIENT_BALANCE')) {
        console.error('Expected insufficient balance error, got:', error.message);
      }
      assert.ok(error.message.includes('TRX_ERR.INSUFFICIENT_BALANCE'));
    }
  });
});
