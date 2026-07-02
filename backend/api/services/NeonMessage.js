const crypto = require('crypto');

module.exports = {
  /**
   * Bộ định tuyến chính của Engine
   */
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

  /**
   * BƯỚC 1: Xây dựng TRANSBODY, Validate, Tính phí, Sinh Trail
   */
  processRequestStep: async function (input) {
    const { serviceId, transData, userId, clientType } = input;

    // 1. Fetch Service & kiểm tra trạng thái
    const service = await Service.findOne({ id: serviceId });
    if (!service) throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Dịch vụ không tồn tại.');
    if (service.status !== 'active') throw new Error('SVC_ERR.SERVICE_INACTIVE: Dịch vụ đang tạm ngưng.');

    // 2. Chuẩn bị TRANSBODY
    const TRANSBODY = {
      SERVICEID: serviceId,
      CURRENCY: 'VND', // Mặc định
    };

    // 3. Xử lý fieldBuilder (bao gồm mapping, query, jwt, và các field do user gửi lên)
    const fieldBuilder = service.fieldBuilder || [];
    for (const fb of fieldBuilder) {
      if (fb.source === 'client' && fb.rule === 'none') {
        // Lấy từ transData
        if (transData[fb.name] !== undefined) {
          TRANSBODY[fb.name] = transData[fb.name];
        }
      } else if (fb.source === 'parameters' && fb.rule === 'mapping') {
        // Lấy từ transData thông qua biến mapping
        if (transData[fb.variable] !== undefined) {
          TRANSBODY[fb.name] = transData[fb.variable];
        }
      } else if (fb.source === 'system') {
        if (fb.rule === 'jwt') {
          // Lấy pocket dựa trên userId (chỉ áp dụng cho customer)
          if (clientType === 'customer') {
            const pocket = await Pocket.findOne({ user: userId });
            if (pocket) TRANSBODY[fb.name] = pocket.id;
          }
        } else if (fb.rule === 'mapping') {
          // variable = 'BANKID' => lấy transData['BANKID']
          if (transData[fb.variable]) {
            TRANSBODY[fb.name] = transData[fb.variable];
          }
        } else if (fb.rule === 'query') {
          // variable = 'queryPocketByUserId(USERID).id' — lấy ví của chính user đang đăng nhập
          const matchUserId = fb.variable.match(/queryPocketByUserId\(.*?\)/);
          if (matchUserId) {
            const pocket = await Pocket.findOne({ user: userId });
            if (pocket) TRANSBODY[fb.name] = pocket.id;
          }

          // variable = 'queryPocketByPhone(RECEIVERPHONE).id'
          const matchPhone = fb.variable.match(/queryPocketByPhone\((.*?)\)/);
          if (matchPhone && matchPhone[1]) {
            const phoneVar = matchPhone[1];
            const phone = transData[phoneVar];
            if (phone) {
              const user = await Customer.findOne({ phone });
              if (user) {
                const pocket = await Pocket.findOne({ user: user.id });
                if (pocket) TRANSBODY[fb.name] = pocket.id;
              }
            }
          }
          
          const matchBiller = fb.variable.match(/queryPocketByBillerId\((.*?)\)/);
          if (matchBiller && matchBiller[1]) {
            const billerVar = matchBiller[1];
            const billerCode = transData[billerVar];
            if (billerCode) {
              const biller = await Biller.findOne({ code: billerCode });
              if (biller) {
                const pocket = await Pocket.findOne({ user: biller.id, client: 'biller' });
                if (pocket) TRANSBODY[fb.name] = pocket.id;
              }
            }
          }
        }
      }
    }

    // 4. Validate Required fields dựa trên TransField
    const transFields = await TransField.find({ service: serviceId }).sort('order ASC');
    for (const tf of transFields) {
      if (tf.isRequired && (TRANSBODY[tf.fieldName] === undefined || TRANSBODY[tf.fieldName] === null || TRANSBODY[tf.fieldName] === '')) {
        throw new Error(`${tf.errorCode}: ${tf.errorMessage}`);
      }
    }

    // 5. Xử lý TransValidation (Ví dụ: validateReceiverIsNotSender, validateMinAmount)
    const validations = await TransValidation.find({ service: serviceId }).sort('order ASC');
    for (const val of validations) {
      if (val.validateFunc === 'validateReceiverIsNotSender') {
        if (TRANSBODY.SENDERID && TRANSBODY.RECEIVERID && TRANSBODY.SENDERID === TRANSBODY.RECEIVERID) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMinAmount') {
        const parts = val.validateFields.split(':'); // AMOUNT:10000
        const amountField = parts[0];
        const minVal = parseInt(parts[1], 10) || 0;
        if (TRANSBODY[amountField] !== undefined && Number(TRANSBODY[amountField]) < minVal) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      }
      // checkBalance sẽ được verify lại kỹ ở bước 3, nhưng có thể check nhanh ở đây nếu muốn
    }

    // 6. Tính phí (Giả sử tạm thời FEE = 0 hoặc lấy từ transData nếu có truyền)
    // Ở hệ thống thực tế có thể gọi bảng FeeMatrix.
    if (TRANSBODY.FEE === undefined) TRANSBODY.FEE = 0;

    // IN RA LOG ĐỂ KIỂM TRA TRANSBODY TỪNG BƯỚC
    sails.log.info('--- [TEST] TRANSBODY ĐÃ ĐƯỢC TẠO ---');
    sails.log.info(JSON.stringify(TRANSBODY, null, 2));
    sails.log.info('------------------------------------');

    // 7. Sinh mã giao dịch & Tạo TransactionTrail
    const transRefId = 'TRX' + Date.now() + crypto.randomBytes(2).toString('hex').toUpperCase();
    
    // Tìm Total Amount để show preview (đọc trực tiếp từ cấu hình Kế toán của dịch vụ)
    let amountField = 'AMOUNT';
    const transDef = await TransDefinition.findOne({ service: serviceId });
    if (transDef && transDef.glSteps && transDef.glSteps.length > 0) {
      amountField = transDef.glSteps[0].amount; // lấy trường số tiền từ bút toán kế toán đầu tiên
    } else {
      // Fallback tìm field nào có chữ AMOUNT hoặc có chữ tiền
      amountField = Object.keys(TRANSBODY).find(k => k.includes('AMOUNT') || k === 'SOTIEN') || 'AMOUNT';
    }
    const totalAmount = (Number(TRANSBODY[amountField]) || 0) + (Number(TRANSBODY.FEE) || 0);

    const trail = await TransactionTrail.create({
      transRefId,
      serviceId: serviceId,
      transStep: input.TRANSTEP || 1,
      status: 'pending',
      inputMessage: TRANSBODY,
      createdBy: userId,
      clientType: clientType,
      totalAmount: totalAmount
    }).fetch();

    return {
      transRefId: trail.transRefId,
      preview: {
        totalAmount: trail.totalAmount,
        fee: TRANSBODY.FEE,
        amount: Number(TRANSBODY[amountField]) || 0,
        currency: TRANSBODY.CURRENCY
      }
    };
  },

  /**
   * BƯỚC 2: Kiểm tra phương thức xác thực (PIN/NONE)
   */
  processConfirmStep: async function (input) {
    const { transRefId, userId, clientType } = input;

    const trail = await TransactionTrail.findOne({ transRefId, createdBy: userId });
    if (!trail) throw new Error('TRX_ERR.NOT_FOUND: Giao dịch không tồn tại hoặc không có quyền truy cập.');
    if (trail.status !== 'pending') throw new Error('TRX_ERR.INVALID_STATUS: Giao dịch không ở trạng thái chờ xác nhận.');

    const service = await Service.findOne({ id: trail.serviceId });
    
    // Nếu là Officer làm Cash-in, auth mặc định NONE. Nếu khách hàng, dùng auth của service
    const authMethod = (clientType === 'officer') ? 'NONE' : (service.authMethod || 'PIN');

    return {
      transRefId: trail.transRefId,
      authMethod: authMethod
    };
  },

  /**
   * BƯỚC 3: Xác thực PIN, Khóa tài khoản, Thực thi Kế toán (glSteps), Lưu Transaction
   */
  processVerifyStep: async function (input) {
    const { transRefId, authCode, userId, clientType } = input;

    const trail = await TransactionTrail.findOne({ transRefId, createdBy: userId });
    if (!trail) throw new Error('TRX_ERR.NOT_FOUND: Giao dịch không tồn tại.');
    if (trail.status !== 'pending') throw new Error('TRX_ERR.INVALID_STATUS: Giao dịch đã được xử lý.');

    const service = await Service.findOne({ id: trail.serviceId });
    const TRANSBODY = trail.inputMessage;

    // 1. Verify PIN (nếu authMethod === 'PIN')
    const authMethod = (clientType === 'officer')
      ? 'NONE'
      : (service.auth && service.auth.method ? service.auth.method : 'PIN');

    if (authMethod === 'PIN') {
      if (!authCode || authCode === 'NONE') {
        throw new Error('AUTH_ERR.WRONG_PIN: Mã PIN không chính xác.');
      }
      const customer = await Customer.findOne({ id: userId });
      if (!customer) throw new Error('AUTH_ERR.USER_NOT_FOUND: Không tìm thấy người dùng.');
      const isValid = await SecurityUtil.compareText(authCode, customer.pinHash);
      if (!isValid) {
        throw new Error('AUTH_ERR.WRONG_PIN: Mã PIN không chính xác.');
      }
    }

    // 2. Nạp TransDefinition (glSteps)
    const transDef = await TransDefinition.findOne({ service: service.id, status: 'active' });
    if (!transDef || !transDef.glSteps || transDef.glSteps.length === 0) {
      throw new Error('SYS_ERR.NO_GL_STEPS: Dịch vụ chưa cấu hình bút toán kế toán.');
    }

    // 3. Thực thi Kế toán sử dụng MongoDB Replica Set Transaction (ACID)
    const db = Pocket.getDatastore().manager;
    const client = db.client; // Lấy MongoClient từ manager
    const pocketCollection = db.collection(Pocket.tableName);
    const transactionCollection = db.collection(Transaction.tableName);
    const trailCollection = db.collection(TransactionTrail.tableName);

    let createdTransactionId = null;
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Lặp qua các bước kế toán (glSteps)
        const glSteps = transDef.glSteps.sort((a, b) => a.order - b.order);

        for (const step of glSteps) {
          const amountValue = Number(TRANSBODY[step.amount]) || 0;
          if (amountValue <= 0) continue;

          let debitPocketId = null;
          if (step.debit.level === 'productLevel') debitPocketId = TRANSBODY[step.debit.target];
          else if (step.debit.level === 'wallet') debitPocketId = step.debit.target;

          let creditPocketId = null;
          if (step.credit.level === 'productLevel') creditPocketId = TRANSBODY[step.credit.target];
          else if (step.credit.level === 'wallet') creditPocketId = step.credit.target;

          if (!debitPocketId || !creditPocketId) {
            throw new Error(`SYS_ERR.GL_STEP_INVALID: Lỗi xác định ví Nợ/Có ở bút toán ${step.order}`);
          }

          const debitObjectId = new (require('mongodb').ObjectId)(debitPocketId);

          // MongoDB driver v6+: findOneAndUpdate trả về document trực tiếp
          const updatedDebitPocket = await pocketCollection.findOneAndUpdate(
            { _id: { $in: [debitPocketId, debitObjectId] }, balance: { $gte: amountValue } },
            { $inc: { balance: -amountValue } },
            { session, returnDocument: 'after' }
          );

          if (!updatedDebitPocket) {
            throw new Error('TRX_ERR.INSUFFICIENT_BALANCE: Ví nguồn không đủ số dư để thực hiện giao dịch.');
          }

          // Tính và cập nhật lại checksum cho Ví Nợ
          const debitChecksum = SecurityUtil.generatePocketChecksum(updatedDebitPocket.balance, updatedDebitPocket.user);
          await pocketCollection.updateOne(
            { _id: updatedDebitPocket._id },
            { $set: { checksum: debitChecksum } },
            { session }
          );

          const creditObjectId = new (require('mongodb').ObjectId)(creditPocketId);
          const updatedCreditPocket = await pocketCollection.findOneAndUpdate(
            { _id: { $in: [creditPocketId, creditObjectId] } },
            { $inc: { balance: amountValue } },
            { session, returnDocument: 'after' }
          );

          // Tính và cập nhật lại checksum cho Ví Có
          if (updatedCreditPocket) {
            const creditChecksum = SecurityUtil.generatePocketChecksum(updatedCreditPocket.balance, updatedCreditPocket.user);
            await pocketCollection.updateOne(
              { _id: updatedCreditPocket._id },
              { $set: { checksum: creditChecksum } },
              { session }
            );
          }
        }

        // Tạo Transaction Record trong cùng 1 session
        // Đọc tên biến số tiền từ TransDefinition (do Officer đặt: AMOUNT, SOTIEN,...)
        const txAmountField = transDef.amountField || (transDef.glSteps && transDef.glSteps[0] ? transDef.glSteps[0].amount : 'AMOUNT');
        const newTrans = {
          transRefId: transRefId,
          serviceId: service.id,
          sender: TRANSBODY.SENDERID || null,
          receiver: TRANSBODY.RECEIVERID || null,
          amount: Number(TRANSBODY[txAmountField]) || 0,
          fee: Number(TRANSBODY.FEE) || 0,
          totalAmount: Number(TRANSBODY.TOTALAMOUNT) || Number(TRANSBODY[txAmountField]) || 0,
          billerRefId: TRANSBODY.BILLERREFID || null,
          status: 'done',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const insertRes = await transactionCollection.insertOne(newTrans, { session });
        createdTransactionId = insertRes.insertedId.toString();

        // Cập nhật Trail thành done
        await trailCollection.updateOne(
          { _id: new (require('mongodb').ObjectId)(trail.id) },
          { $set: { status: 'done', updatedAt: Date.now() } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return {
      transRefId: transRefId,
      status: 'SUCCESS',
      message: 'Giao dịch thành công',
      transactionId: createdTransactionId
    };
  }
};
