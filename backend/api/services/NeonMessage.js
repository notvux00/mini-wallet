const crypto = require('crypto');
const { ObjectId } = require('mongodb');

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch (unusedError) {
    return null;
  }
}

function idQuery(value) {
  const objectId = toObjectId(value);
  return objectId ? { $in: [value, objectId] } : value;
}

async function loadRuntimeConfig(serviceId) {
  const service = await Service.findOne({ id: serviceId });
  if (!service) {
    throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Service does not exist.');
  }
  if (service.status !== 'active') {
    throw new Error('SVC_ERR.SERVICE_INACTIVE: Service is inactive.');
  }

  const transDef = await TransDefinition.findOne({ service: serviceId, status: 'active' });
  if (!transDef || !transDef.glSteps || transDef.glSteps.length === 0) {
    throw new Error('SYS_ERR.NO_GL_STEPS: Service has no active accounting definition.');
  }

  const transFields = await TransField.find({ service: serviceId }).sort('order ASC');
  const validations = await TransValidation.find({ service: serviceId }).sort('order ASC');

  return { service, transDef, transFields, validations };
}

async function validateRuntimeConfig(config, TRANSBODY) {
  TransFieldValidator.validate(config.transFields, TRANSBODY);
  FeeCalculator.applyToTransBody(config.service, config.transDef, TRANSBODY);
  await ValidationRegistry.validate(config.validations, TRANSBODY);
}

async function verifyPinIfRequired(service, input) {
  const authMethod = input.clientType === 'officer'
    ? 'NONE'
    : (service.auth && service.auth.method ? service.auth.method : 'PIN');

  if (authMethod !== 'PIN') {
    return authMethod;
  }

  if (!input.authCode || input.authCode === 'NONE') {
    throw new Error('AUTH_ERR.WRONG_PIN: PIN is invalid.');
  }

  const customer = await Customer.findOne({ id: input.userId });
  if (!customer) {
    throw new Error('AUTH_ERR.USER_NOT_FOUND: User was not found.');
  }

  const isValid = await SecurityUtil.compareText(input.authCode, customer.pinHash);
  if (!isValid) {
    throw new Error('AUTH_ERR.WRONG_PIN: PIN is invalid.');
  }

  return authMethod;
}

async function lockSenderPocket(senderPocketId) {
  if (!senderPocketId) {
    return null;
  }

  const locked = await Pocket.updateOne({
    id: senderPocketId,
    status: 'active',
    state: 'active',
  }).set({ state: 'inProgress' });

  if (!locked) {
    throw new Error('TRX_ERR.SENDER_LOCKED: Sender pocket is not ready for transaction.');
  }

  return senderPocketId;
}

async function releaseSenderPocket(senderPocketId) {
  if (!senderPocketId) {
    return;
  }
  await Pocket.updateOne({ id: senderPocketId }).set({ state: 'active' });
}

module.exports = {
  routeProcess: async function (input) {
    switch (input.TRANSTEP) {
      case 1:
        return await this.processRequestStep(input);
      case 2:
        return await this.processConfirmStep(input);
      case 3:
        return await this.processVerifyStep(input);
      default:
        throw new Error('Invalid TRANSTEP');
    }
  },

  processRequestStep: async function (input) {
    const serviceId = input.serviceId;
    const config = await loadRuntimeConfig(serviceId);
    const TRANSBODY = await FieldResolver.buildTransactionFields(
      config.service,
      input.transData || {},
      input.userId,
      input.clientType
    );

    const transRefId = 'TRX' + Date.now() + crypto.randomBytes(2).toString('hex').toUpperCase();
    TRANSBODY.TRANSREFID = transRefId;

    await BillerActionHandler.processRequest(config.service, TRANSBODY);
    await validateRuntimeConfig(config, TRANSBODY);

    const amountInfo = FeeCalculator.applyToTransBody(config.service, config.transDef, TRANSBODY);

    const trail = await TransactionTrail.create({
      transRefId,
      serviceId,
      transStep: 1,
      status: 'pending',
      inputMessage: TRANSBODY,
      outputMessage: {
        TRANSBODY,
      },
      createdBy: input.userId,
      clientType: input.clientType,
      totalAmount: amountInfo.totalAmount,
    }).fetch();

    return {
      transRefId: trail.transRefId,
      preview: {
        amount: amountInfo.amount,
        fee: amountInfo.fee,
        totalAmount: amountInfo.totalAmount,
        currency: TRANSBODY.CURRENCY,
      },
    };
  },

  processConfirmStep: async function (input) {
    const trail = await TransactionTrail.findOne({
      transRefId: input.transRefId,
      createdBy: input.userId,
    });
    if (!trail) {
      throw new Error('TRX_ERR.NOT_FOUND: Transaction was not found.');
    }
    if (trail.status !== 'pending') {
      throw new Error('TRX_ERR.INVALID_STATUS: Transaction is not pending.');
    }

    const service = await Service.findOne({ id: trail.serviceId });
    if (!service) {
      throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Service does not exist.');
    }

    const authMethod = input.clientType === 'officer'
      ? 'NONE'
      : (service.auth && service.auth.method ? service.auth.method : 'PIN');

    return {
      transRefId: trail.transRefId,
      authMethod,
    };
  },

  processVerifyStep: async function (input) {
    const trail = await TransactionTrail.findOne({
      transRefId: input.transRefId,
      createdBy: input.userId,
    });
    if (!trail) {
      throw new Error('TRX_ERR.NOT_FOUND: Transaction was not found.');
    }
    if (trail.status !== 'pending') {
      throw new Error('TRX_ERR.INVALID_STATUS: Transaction was already processed.');
    }

    const config = await loadRuntimeConfig(trail.serviceId);
    const TRANSBODY = Object.assign({}, trail.inputMessage || {});

    await verifyPinIfRequired(config.service, input);
    await validateRuntimeConfig(config, TRANSBODY);

    const amountInfo = FeeCalculator.applyToTransBody(config.service, config.transDef, TRANSBODY);
    const lockedSenderPocketId = await lockSenderPocket(TRANSBODY.SENDERID);

    try {
      const db = Pocket.getDatastore().manager;
      const client = db.client;
      const pocketCollection = db.collection(Pocket.tableName);
      const entryCollection = db.collection(PocketEntry.tableName);
      const transactionCollection = db.collection(Transaction.tableName);
      const trailCollection = db.collection(TransactionTrail.tableName);
      const session = client.startSession();
      let createdTransactionId = null;

      try {
        await session.withTransaction(async () => {
          const glSteps = config.transDef.glSteps.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

          for (const step of glSteps) {
            const amountValue = Number(TRANSBODY[step.amount]) || 0;
            if (amountValue <= 0) {
              continue;
            }

            const debitPocketId = step.debit.level === 'productLevel'
              ? TRANSBODY[step.debit.target]
              : step.debit.target;
            const creditPocketId = step.credit.level === 'productLevel'
              ? TRANSBODY[step.credit.target]
              : step.credit.target;

            if (!debitPocketId || !creditPocketId) {
              throw new Error(`SYS_ERR.GL_STEP_INVALID: Invalid debit/credit pocket at step ${step.order}.`);
            }

            const updatedDebitPocket = await pocketCollection.findOneAndUpdate(
              { _id: idQuery(debitPocketId), status: 'active', balance: { $gte: amountValue } },
              { $inc: { balance: -amountValue } },
              { session, returnDocument: 'after' }
            );
            if (!updatedDebitPocket) {
              throw new Error('TRX_ERR.INSUFFICIENT_BALANCE: Source pocket balance is insufficient.');
            }

            await pocketCollection.updateOne(
              { _id: updatedDebitPocket._id },
              { $set: { checksum: SecurityUtil.generatePocketChecksum(updatedDebitPocket.balance, updatedDebitPocket.user) } },
              { session }
            );

            const updatedCreditPocket = await pocketCollection.findOneAndUpdate(
              { _id: idQuery(creditPocketId), status: 'active' },
              { $inc: { balance: amountValue } },
              { session, returnDocument: 'after' }
            );
            if (!updatedCreditPocket) {
              throw new Error('TRX_ERR.CREDIT_POCKET_NOT_FOUND: Destination pocket was not found.');
            }

            await pocketCollection.updateOne(
              { _id: updatedCreditPocket._id },
              { $set: { checksum: SecurityUtil.generatePocketChecksum(updatedCreditPocket.balance, updatedCreditPocket.user) } },
              { session }
            );

            await entryCollection.insertOne({
              transRefId: input.transRefId,
              stepOrder: step.order,
              debit: debitPocketId,
              credit: creditPocketId,
              amount: amountValue,
              status: 'settled',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }, { session });
          }

          const txAmountField = FeeCalculator.getAmountField(config.transDef);
          const newTrans = {
            transRefId: input.transRefId,
            serviceId: config.service.id,
            sender: TRANSBODY.SENDERID,
            receiver: TRANSBODY.RECEIVERID,
            amount: Number(TRANSBODY[txAmountField]) || 0,
            fee: Number(TRANSBODY.DEBITFEE) || 0,
            totalAmount: Number(TRANSBODY.TOTALAMOUNT) || amountInfo.totalAmount,
            billerRefId: TRANSBODY.BILLERREFID || null,
            status: 'done',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const insertRes = await transactionCollection.insertOne(newTrans, { session });
          createdTransactionId = insertRes.insertedId.toString();

          await trailCollection.updateOne(
            { _id: idQuery(trail.id) },
            {
              $set: {
                status: 'done',
                outputMessage: { TRANSBODY },
                totalAmount: newTrans.totalAmount,
                updatedAt: Date.now(),
              },
            },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      let billerSync = { status: 'skipped' };
      try {
        billerSync = await BillerActionHandler.processPayment(config.service, TRANSBODY, createdTransactionId);
        if (billerSync.status === 'done' && TRANSBODY.BILLERREFID) {
          await transactionCollection.updateOne(
            { _id: idQuery(createdTransactionId) },
            { $set: { billerRefId: TRANSBODY.BILLERREFID, updatedAt: Date.now() } }
          );
        }
      } catch (paymentError) {
        billerSync = {
          status: 'pending',
          error: paymentError.message,
        };
      }

      await trailCollection.updateOne(
        { _id: idQuery(trail.id) },
        {
          $set: {
            outputMessage: {
              TRANSBODY,
              billerSync,
            },
            updatedAt: Date.now(),
          },
        }
      );

      return {
        transRefId: input.transRefId,
        status: 'SUCCESS',
        message: 'Transaction completed successfully',
        transactionId: createdTransactionId,
        billerSync,
      };
    } catch (error) {
      await TransactionTrail.updateOne({ id: trail.id }).set({
        status: 'failed',
        outputMessage: {
          TRANSBODY,
          error: error.message,
        },
        updatedAt: Date.now(),
      });
      throw error;
    } finally {
      await releaseSenderPocket(lockedSenderPocketId);
    }
  },
};
