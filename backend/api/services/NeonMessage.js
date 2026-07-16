const crypto = require('crypto');
const axios = require('axios');
const _ = require('lodash');

module.exports = {
  /**
   * Bộ định tuyến chính của Engine
   */
  routeProcess: async function (input) {
    try {
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
    } catch (err) {
      if (input.transRefId) {
        // Cập nhật Audit Trail nếu có lỗi ở Step 2 hoặc 3
        const trail = await TransactionTrail.findOne({ transRefId: input.transRefId });
        if (trail && trail.status === 'pending') {
          const logs = trail.transStepLog || [];
          logs.push({
            step: input.TRANSTEP,
            timestamp: Date.now(),
            result: 'failed',
            errorCode: err.message
          });
          
          // Fail giao dịch nếu bị khóa PIN (PIN_LOCKED) hoặc giao dịch không còn hợp lệ, chỉ giữ pending nếu đơn thuần sai mã PIN (WRONG_PIN)
          const isWrongPinOnly = err.message && err.message.startsWith('AUTH_ERR.WRONG_PIN');
          const isDeadTransaction = err.message && (err.message.includes('PIN_LOCKED') || err.message.includes('INVALID_STATUS'));
          
          await TransactionTrail.updateOne({ id: trail.id }).set({
            status: (isWrongPinOnly && !isDeadTransaction) ? 'pending' : 'failed',
            transStep: input.TRANSTEP,
            transStepLog: logs,
            outputMessage: { error: err.message },
            updatedAt: Date.now()
          });
        }
      }
      throw err;
    }
  },

  /**
   * BƯỚC 1: Xây dựng TRANSBODY, Validate, Tính phí, Sinh Trail
   */
  processRequestStep: async function (input) {
    const { serviceId, transData, userId, clientType } = input;

    // --- TASK: Chống Spam Bước 1 (Rate Limiting) ---
    const rateKey = `rate_limit_req:${userId}`;
    const reqCount = await RedisService.incr(rateKey);
    if (reqCount === 1) {
      // Lần đầu tiên gọi trong chu kỳ, set TTL 10 giây
      await RedisService.expire(rateKey, 10);
    } else if (reqCount > 3) {
      throw new Error('SYS_ERR.RATE_LIMIT_EXCEEDED: Bạn đang thao tác quá nhanh, vui lòng đợi vài giây.');
    }
    // ------------------------------------------------

    // 1. Lấy cấu hình Engine từ Cache (hoặc DB)
    const engineConfig = await this.getEngineConfig(serviceId);
    if (!engineConfig) throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Dịch vụ không tồn tại.');
    
    const { service, transFields, transDef, validations } = engineConfig;
    
    if (service.status !== 'active') throw new Error('SVC_ERR.SERVICE_INACTIVE: Dịch vụ đang tạm ngưng.');

    // 2. Chuẩn bị TRANSBODY
    const descField = service.descriptionField || 'DESCRIPTION';
    
    const TRANSBODY = {
      SERVICEID: serviceId,
      CURRENCY: 'VND', // Mặc định
      [descField]: transData.description || transData[descField] || ''
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

          // variable = 'queryPocketByBankLinkId(BANK_LINK_ID).id'
          const matchBankLink = fb.variable.match(/queryPocketByBankLinkId\((.*?)\)/);
          if (matchBankLink && matchBankLink[1]) {
            const linkVar = matchBankLink[1];
            const linkId = transData[linkVar];
            if (linkId) {
              // Phải kiểm tra đúng thẻ của user này và trạng thái linked để chống hack
              const link = await BankLink.findOne({ id: linkId, customer: userId, status: 'linked' });
              if (link) {
                const bank = await Bank.findOne({ id: link.bank });
                if (bank && bank.pocket) {
                  TRANSBODY[fb.name] = bank.pocket;
                }
              }
            }
          }
        } else if (fb.rule === 'math') {
          if (fb.mathOp === 'percent') {
            const baseValue = Number(TRANSBODY[fb.sourceField] || transData[fb.sourceField]) || 0;
            TRANSBODY[fb.name] = (baseValue * (Number(fb.percentValue) || 0)) / 100;
          }
        }
      }
    }

    // 3.5 Biller Inquiry Adapter (Generic Mapping)
    if (service.action === 'billerTrans') {
      // Đọc cấu hình từ Service (Tầng 1) để biết Frontend truyền vào field nào
      const billerIdField = service.actionParams?.billerIdField || 'BILLERID';
      const customerCodeField = service.actionParams?.customerCodeField || 'BILLCODE';

      const billerCode = TRANSBODY[billerIdField] || TRANSBODY.BILLER_CODE;
      const customerCode = TRANSBODY[customerCodeField] || TRANSBODY.CUSTOMER_CODE;
      
      if (!billerCode || !customerCode) {
        throw new Error(`BILLER_ERR.MISSING_DATA: Không tìm thấy Biller Code (${billerIdField}) hoặc Customer Code (${customerCodeField}).`);
      }

      const biller = await Biller.findOne({ code: billerCode });
      if (!biller) throw new Error('BILLER_ERR.NOT_FOUND: Biller không tồn tại.');
      if (biller.status !== 'active') throw new Error('BILLER_ERR.INACTIVE: Biller đang bị khóa.');

      // Inject Biller Pocket to TRANSBODY so GL Steps can use it as Credit destination
      TRANSBODY['BILLERPOCKET'] = biller.pocket;
      if (biller.inquiryUrl) {
        try {
          // Xây dựng Payload động dựa trên Key Name Officer cấu hình
          let reqBody = {};
          if (biller.inqReqKeyCustomer) reqBody[biller.inqReqKeyCustomer] = customerCode;
          if (biller.inqReqKeyBiller) reqBody[biller.inqReqKeyBiller] = billerCode;

          // Gọi API
          sails.log.info(`[Biller Adapter] INQUIRY to ${biller.inquiryUrl}`, reqBody);
          const response = await axios.post(biller.inquiryUrl, reqBody, { timeout: 10000 });
          sails.log.info(`[Biller Adapter] INQUIRY RES:`, response.data);

          // Đọc dữ liệu bằng Mapping
          const amountPath = biller.inquiryResMappingAmount || 'amountOwed';
          const billRefPath = biller.inquiryResMappingBillRef || 'billRef';
          
          const amountValue = Number(_.get(response.data, amountPath));
          const billRefValue = String(_.get(response.data, billRefPath) || '');

          if (isNaN(amountValue)) {
            throw new Error('Không thể đọc số tiền từ kết quả Biller.');
          }

          // Nhồi vào TRANSBODY
          TRANSBODY['AMOUNT'] = amountValue;
          TRANSBODY['TOTALAMOUNT'] = amountValue; // Sẽ được cộng thêm phí sau
          TRANSBODY['BILLERREFID'] = billRefValue;
          
        } catch (error) {
          sails.log.error('[Biller Adapter] Lỗi gọi Inquiry:', error.message);
          throw new Error('BILLER_ERR.INQUIRY_FAILED: Lỗi kết nối đến nhà cung cấp dịch vụ.');
        }
      }
    }

    // 4. Validate Required fields dựa trên TransField
    for (const tf of transFields) {
      if (tf.isRequired && (TRANSBODY[tf.fieldName] === undefined || TRANSBODY[tf.fieldName] === null || TRANSBODY[tf.fieldName] === '')) {
        throw new Error(`${tf.errorCode}: ${tf.errorMessage}`);
      }
      
      const val = TRANSBODY[tf.fieldName];
      if (val !== undefined && val !== null && val !== '') {
        if (tf.fieldFormat === 'number' && isNaN(Number(val))) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Phải là kiểu số)`);
        }
        if (tf.fieldFormat === 'objectId' && !/^[0-9a-fA-F]{24}$/.test(String(val))) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Mã định danh không hợp lệ)`);
        }

        const strVal = String(val);
        if (tf.minLength && strVal.length < tf.minLength) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Tối thiểu ${tf.minLength} ký tự)`);
        }
        if (tf.maxLength && strVal.length > tf.maxLength) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Tối đa ${tf.maxLength} ký tự)`);
        }
      }
    }

    // 5. Tính phí động dựa trên cấu hình service (Normalize Amount first)
    let amountField = 'AMOUNT';
    if (transDef && transDef.glSteps && transDef.glSteps.length > 0) {
      amountField = transDef.glSteps[0].amount; // lấy trường số tiền từ bút toán kế toán đầu tiên
    } else {
      amountField = Object.keys(TRANSBODY).find(k => k.includes('AMOUNT') || k === 'SOTIEN') || 'AMOUNT';
    }
    
    const amountValue = Number(TRANSBODY[amountField]) || Number(TRANSBODY['AMOUNT']) || Number(TRANSBODY['amount']) || 0;
    
    // [QUAN TRỌNG] Đảm bảo biến động (Ví dụ: SO_TIEN_HOA_DON) được nạp giá trị để Bút toán (GL Step) và Validation đọc được
    TRANSBODY[amountField] = amountValue;
    // Đồng thời gán vào biến AMOUNT chuẩn xác để TransValidation bắt được nếu nó dùng field name là AMOUNT
    if (amountField !== 'AMOUNT') {
      TRANSBODY['AMOUNT'] = amountValue;
    }
    
    let calculatedFee = Number(TRANSBODY.FEE) || 0;
    
    if (service.fee && service.fee.type) {
      if (service.fee.type === 'fixed') {
        calculatedFee = Number(service.fee.value) || 0;
      } else if (service.fee.type === 'percent') {
        calculatedFee = amountValue * ((Number(service.fee.value) || 0) / 100);
        if (service.fee.max && calculatedFee > service.fee.max) {
          calculatedFee = service.fee.max;
        }
      }
    }
    
    // Tính chiết khấu (nếu có)
    let calculatedDiscount = Number(TRANSBODY.DISCOUNT) || 0;
    if (service.discount && service.discount.type) {
      if (service.discount.type === 'fixed') {
        calculatedDiscount = Number(service.discount.value) || 0;
      } else if (service.discount.type === 'percent' || service.discount.type === 'percentage') {
        calculatedDiscount = amountValue * ((Number(service.discount.value) || 0) / 100);
        if (service.discount.max && calculatedDiscount > service.discount.max) {
          calculatedDiscount = service.discount.max;
        }
      }
    }

    // Ghi đè phí và chiết khấu vào TRANSBODY
    TRANSBODY.FEE = calculatedFee;
    TRANSBODY.DISCOUNT = calculatedDiscount;
    TRANSBODY.TOTALAMOUNT = amountValue + calculatedFee - calculatedDiscount;
    // 6. Xử lý TransValidation (Ví dụ: validateReceiverIsNotSender, validateMinAmount)
    
    // Đánh giá DB-related validations
    for (const val of validations) {
      if (val.validateFunc === 'validateMaintainBalance') {
        const parts = val.validateFields.split(':');
        const maintainVal = parseInt(parts[1], 10) || 50000;
        if (TRANSBODY.SENDERID) {
           const senderPocket = await Pocket.findOne({ id: TRANSBODY.SENDERID });
           if (senderPocket && senderPocket.client !== 'system' && senderPocket.client !== 'bank') {
             if (senderPocket.balance - TRANSBODY.TOTALAMOUNT < maintainVal) {
               throw new Error(`${val.errorCode}: ${val.errorMessage}`);
             }
           }
        }
      }
    }
    for (const val of validations) {
      if (val.validateFunc === 'validateReceiverIsNotSender') {
        if (TRANSBODY.SENDERID && TRANSBODY.RECEIVERID && TRANSBODY.SENDERID === TRANSBODY.RECEIVERID) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMinAmount') {
        const parts = val.validateFields.split(':'); // AMOUNT:10000
        const validateAmountField = parts[0];
        const minVal = parseInt(parts[1], 10) || 0;
        if (TRANSBODY[validateAmountField] !== undefined && Number(TRANSBODY[validateAmountField]) < minVal) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMaxAmount') {
        const parts = val.validateFields.split(':');
        const validateAmountField = parts[0];
        const maxVal = parseInt(parts[1], 10) || 0;
        if (TRANSBODY[validateAmountField] !== undefined && Number(TRANSBODY[validateAmountField]) > maxVal) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMultipleOf') {
        const parts = val.validateFields.split(':');
        const validateAmountField = parts[0];
        const multipleVal = parseInt(parts[1], 10) || 1;
        if (TRANSBODY[validateAmountField] !== undefined && Number(TRANSBODY[validateAmountField]) % multipleVal !== 0) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      }
      // checkBalance sẽ được verify lại kỹ ở bước 3, nhưng có thể check nhanh ở đây nếu muốn
    }

    // IN RA LOG ĐỂ KIỂM TRA TRANSBODY TỪNG BƯỚC
    sails.log.info('--- [TEST] TRANSBODY ĐÃ ĐƯỢC TẠO ---');
    sails.log.info(JSON.stringify(TRANSBODY, null, 2));
    sails.log.info('------------------------------------');

    // 7. Sinh mã giao dịch & Tạo TransactionTrail
    const transRefId = 'TRX' + Date.now() + crypto.randomBytes(2).toString('hex').toUpperCase();
    const totalAmount = TRANSBODY.TOTALAMOUNT;

    const trail = await TransactionTrail.create({
      transRefId,
      serviceId: serviceId,
      transStep: input.TRANSTEP || 1,
      status: 'pending',
      inputMessage: TRANSBODY,
      createdBy: userId,
      clientType: clientType,
      totalAmount: totalAmount,
      transStepLog: [{
        step: 1,
        timestamp: Date.now(),
        result: 'success',
        message: 'Khởi tạo giao dịch thành công'
      }]
    }).fetch();

    return {
      transRefId: trail.transRefId,
      preview: {
        totalAmount: trail.totalAmount,
        fee: TRANSBODY.FEE,
        discount: TRANSBODY.DISCOUNT,
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

    const engineConfig = await this.getEngineConfig(trail.serviceId);
    if (!engineConfig) throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Dịch vụ không tồn tại.');
    const { service } = engineConfig;
    
    // Nếu là Officer làm Cash-in, auth mặc định NONE. Nếu khách hàng, dùng auth của service
    const authMethod = (clientType === 'officer') ? 'NONE' : (service.authMethod || 'PIN');

    const outputData = {
      transRefId: trail.transRefId,
      authMethod: authMethod
    };

    const logs = trail.transStepLog || [];
    logs.push({
      step: 2,
      timestamp: Date.now(),
      result: 'success',
      message: `Trả về phương thức xác thực ${authMethod}`
    });

    await TransactionTrail.updateOne({ id: trail.id }).set({
      transStep: 2,
      transStepLog: logs,
      outputMessage: outputData
    });

    return outputData;
  },

  /**
   * BƯỚC 3: Xác thực PIN, Khóa tài khoản, Thực thi Kế toán (glSteps), Lưu Transaction
   */
  processVerifyStep: async function (input) {
    const { transRefId, authCode, userId, clientType } = input;

    // --- TASK: Chống Race Condition Bước 3 (Distributed Lock) ---
    const trxLockKey = `trx_lock:${transRefId}`;
    const acquiredLock = await RedisService.setnx(trxLockKey, 'locked', 30); // Tăng lên 30s để bao phủ thời gian Timeout của Biller
    if (!acquiredLock) {
      throw new Error('TRX_ERR.RACE_CONDITION: Giao dịch đang được xử lý, vui lòng không thao tác quá nhanh.');
    }
    // -------------------------------------------------------------

    try {
      const trail = await TransactionTrail.findOne({ transRefId, createdBy: userId });
    if (!trail) throw new Error('TRX_ERR.NOT_FOUND: Giao dịch không tồn tại.');
    if (trail.status !== 'pending') throw new Error('TRX_ERR.INVALID_STATUS: Giao dịch đã được xử lý.');

    const engineConfig = await this.getEngineConfig(trail.serviceId);
    if (!engineConfig) throw new Error('SVC_ERR.SERVICE_NOT_FOUND: Dịch vụ không tồn tại.');
    const { service } = engineConfig;
    const TRANSBODY = trail.inputMessage;

    // 1. Verify PIN (nếu authMethod === 'PIN')
    const authMethod = (clientType === 'officer')
      ? 'NONE'
      : (service.auth && service.auth.method ? service.auth.method : 'PIN');

    if (authMethod === 'PIN') {
      // 1. Kiểm tra xem tài khoản có đang bị khóa PIN không
      const lockKey = `pin_lock:${userId}`;
      const failKey = `pin_fail:${userId}`;
      
      const isLocked = await RedisService.get(lockKey);
      if (isLocked) {
        const ttl = await RedisService.ttl(lockKey);
        const minutes = Math.ceil(ttl / 60);
        const timeMsg = minutes > 60 ? Math.ceil(minutes / 60) + ' giờ' : minutes + ' phút';
        throw new Error(`AUTH_ERR.PIN_LOCKED: Mã PIN đang bị khóa. Vui lòng thử lại sau ${timeMsg}.`);
      }

      if (!authCode || authCode === 'NONE') {
        throw new Error('AUTH_ERR.WRONG_PIN: Mã PIN không chính xác.');
      }
      
      const customer = await Customer.findOne({ id: userId });
      if (!customer) throw new Error('AUTH_ERR.USER_NOT_FOUND: Không tìm thấy người dùng.');
      
      const isValid = await SecurityUtil.compareText(authCode, customer.pinHash);
      if (!isValid) {
        // Xử lý sai PIN (Khóa lũy tiến theo chuẩn iPhone)
        const fails = await RedisService.incr(failKey);
        
        let lockTime = 0;
        let lockMsg = '';
        if (fails === 5) { lockTime = 60; lockMsg = '1 phút'; }
        else if (fails === 6) { lockTime = 300; lockMsg = '5 phút'; }
        else if (fails === 7 || fails === 8) { lockTime = 900; lockMsg = '15 phút'; }
        else if (fails === 9) { lockTime = 3600; lockMsg = '1 giờ'; }
        else if (fails >= 10) { lockTime = 86400; lockMsg = '24 giờ'; }

        if (lockTime > 0) {
          await RedisService.set(lockKey, 'locked', lockTime);
          throw new Error(`AUTH_ERR.PIN_LOCKED: Nhập sai PIN ${fails} lần. Mã PIN bị khóa tạm thời ${lockMsg}.`);
        } else {
          throw new Error(`AUTH_ERR.WRONG_PIN: Mã PIN không chính xác. Bạn còn ${5 - fails} lần thử.`);
        }
      } else {
        // Đúng PIN: Reset toàn bộ bộ đếm
        await RedisService.del(failKey);
        await RedisService.del(lockKey);
      }
    }

    // 2. Nạp cấu hình từ Engine (Cache)
    const { transFields, transDef, validations } = engineConfig;
    if (!transDef || !transDef.glSteps || transDef.glSteps.length === 0) {
      throw new Error('SYS_ERR.NO_GL_STEPS: Dịch vụ chưa cấu hình bút toán kế toán.');
    }

    // --- TASK 4: Re-validation & Fee Re-calculation ---
    // Validate Required fields
    for (const tf of transFields) {
      if (tf.isRequired && (TRANSBODY[tf.fieldName] === undefined || TRANSBODY[tf.fieldName] === null || TRANSBODY[tf.fieldName] === '')) {
        throw new Error(`${tf.errorCode}: ${tf.errorMessage}`);
      }
      
      const val = TRANSBODY[tf.fieldName];
      if (val !== undefined && val !== null && val !== '') {
        if (tf.fieldFormat === 'number' && isNaN(Number(val))) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Phải là kiểu số)`);
        }
        if (tf.fieldFormat === 'objectId' && !/^[0-9a-fA-F]{24}$/.test(String(val))) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Mã định danh không hợp lệ)`);
        }

        const strVal = String(val);
        if (tf.minLength && strVal.length < tf.minLength) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Tối thiểu ${tf.minLength} ký tự)`);
        }
        if (tf.maxLength && strVal.length > tf.maxLength) {
          throw new Error(`${tf.errorCode}: ${tf.errorMessage} (Tối đa ${tf.maxLength} ký tự)`);
        }
      }
    }
    
    // Validate TransValidation
    for (const val of validations) {
      if (val.validateFunc === 'validateReceiverIsNotSender') {
        if (TRANSBODY.SENDERID && TRANSBODY.RECEIVERID && TRANSBODY.SENDERID === TRANSBODY.RECEIVERID) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMinAmount') {
        const parts = val.validateFields.split(':');
        const amountField = parts[0];
        const minVal = parseInt(parts[1], 10) || 0;
        if (TRANSBODY[amountField] !== undefined && Number(TRANSBODY[amountField]) < minVal) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      } else if (val.validateFunc === 'validateMaxAmount') {
        const parts = val.validateFields.split(':');
        const amountField = parts[0];
        const maxVal = parseInt(parts[1], 10) || 0;
        if (TRANSBODY[amountField] !== undefined && Number(TRANSBODY[amountField]) > maxVal) {
          throw new Error(`${val.errorCode}: ${val.errorMessage}`);
        }
      }
    }

    // Fee Re-calculation
    const txAmountField = transDef.amountField || (transDef.glSteps && transDef.glSteps[0] ? transDef.glSteps[0].amount : 'AMOUNT');
    const amountValue = Number(TRANSBODY[txAmountField]) || 0;
    let calculatedFee = Number(TRANSBODY.FEE) || 0;
    
    if (service.fee && service.fee.type) {
      if (service.fee.type === 'fixed') {
        calculatedFee = Number(service.fee.value) || 0;
      } else if (service.fee.type === 'percent') {
        calculatedFee = amountValue * ((Number(service.fee.value) || 0) / 100);
        if (service.fee.max && calculatedFee > service.fee.max) {
          calculatedFee = service.fee.max;
        }
      }
    }
    TRANSBODY.FEE = calculatedFee;
    const discountValue = Number(TRANSBODY.DISCOUNT) || 0;
    TRANSBODY.TOTALAMOUNT = amountValue + calculatedFee - discountValue;
    // ----------------------------------------------------

    // Đánh giá DB-related validations (kiểm tra lại số dư thực tế lần cuối)
    for (const val of validations) {
      if (val.validateFunc === 'validateMaintainBalance') {
        const parts = val.validateFields.split(':');
        const maintainVal = parseInt(parts[1], 10) || 50000;
        if (TRANSBODY.SENDERID) {
           const senderPocket = await Pocket.findOne({ id: TRANSBODY.SENDERID });
           if (senderPocket && senderPocket.client !== 'system' && senderPocket.client !== 'bank') {
             if (senderPocket.balance - TRANSBODY.TOTALAMOUNT < maintainVal) {
               throw new Error(`${val.errorCode}: ${val.errorMessage}`);
             }
           }
        }
      }
    }

    // 3. Thực thi Kế toán sử dụng MongoDB Replica Set Transaction (ACID)
    const db = Pocket.getDatastore().manager;
    const client = db.client; // Lấy MongoClient từ manager
    const pocketCollection = db.collection(Pocket.tableName);
    const transactionCollection = db.collection(Transaction.tableName);
    const trailCollection = db.collection(TransactionTrail.tableName);
    const pocketEntryCollection = db.collection('pocketentry'); // Bảng PocketEntry

    let createdTransactionId = null;
    let isLocked = false;
    const session = client.startSession();

    try {
      // --- TASK 3: Khóa tài khoản (Race-condition protection) ---
      if (TRANSBODY.SENDERID) {
        const lockedPocket = await Pocket.updateOne({ id: TRANSBODY.SENDERID, state: 'active', status: 'active' }).set({ state: 'inProgress', lockOwner: transRefId });
        if (!lockedPocket) {
          throw new Error('TRX_ERR.ACCOUNT_LOCKED: Tài khoản đang xử lý giao dịch khác hoặc đang bị khóa, vui lòng thử lại sau.');
        }
        isLocked = true;
      }
      // ----------------------------------------------------------

      await session.withTransaction(async () => {
        // Lặp qua các bước kế toán (glSteps)
        const glSteps = transDef.glSteps.sort((a, b) => a.order - b.order);

        for (const step of glSteps) {
          const stepAmountValue = Number(TRANSBODY[step.amount]) || 0;
          if (stepAmountValue <= 0) continue;

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

          // Lấy thông tin ví Nợ để kiểm tra xem có cho phép âm tiền không (Ví Hệ thống / Ngân hàng được phép âm)
          const debitPocketInfo = await pocketCollection.findOne(
            { _id: { $in: [debitPocketId, debitObjectId] } },
            { session }
          );

          if (!debitPocketInfo) {
            throw new Error(`SYS_ERR.POCKET_NOT_FOUND: Không tìm thấy ví Nợ ${debitPocketId}`);
          }
          if (debitPocketInfo.status === 'inactive' || 
              (debitPocketInfo.state === 'inProgress' && debitPocketInfo.lockOwner !== transRefId) || 
              (debitPocketInfo.state !== 'active' && debitPocketInfo.state !== 'inProgress')) {
            throw new Error(`SYS_ERR.POCKET_LOCKED: Ví Nợ đang bị khóa hoặc không hoạt động.`);
          }

          const creditObjectId = new (require('mongodb').ObjectId)(creditPocketId);
          const creditPocketInfo = await pocketCollection.findOne(
            { _id: { $in: [creditPocketId, creditObjectId] } },
            { session }
          );

          if (!creditPocketInfo) {
            throw new Error(`SYS_ERR.POCKET_NOT_FOUND: Không tìm thấy ví Có ${creditPocketId}`);
          }
          if (creditPocketInfo.status === 'inactive' || 
              (creditPocketInfo.state === 'inProgress' && creditPocketInfo.lockOwner !== transRefId) || 
              (creditPocketInfo.state !== 'active' && creditPocketInfo.state !== 'inProgress')) {
            throw new Error(`SYS_ERR.POCKET_LOCKED: Ví Có đang bị khóa hoặc không hoạt động.`);
          }

          const allowNegative = ['system', 'bank'].includes(debitPocketInfo.client);
          
          const query = { _id: debitPocketInfo._id };
          if (!allowNegative) {
            query.balance = { $gte: stepAmountValue };
          }

          // MongoDB driver v6+: findOneAndUpdate trả về document trực tiếp
          const updatedDebitPocket = await pocketCollection.findOneAndUpdate(
            query,
            { $inc: { balance: -stepAmountValue } },
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

          const updatedCreditPocket = await pocketCollection.findOneAndUpdate(
            { _id: { $in: [creditPocketId, creditObjectId] } },
            { $inc: { balance: stepAmountValue } },
            { session, returnDocument: 'after' }
          );

          if (!updatedCreditPocket) {
            throw new Error(`SYS_ERR.CREDIT_FAILED: Ghi Có thất bại, ví không tồn tại hoặc bị lỗi.`);
          }

          // Tính và cập nhật lại checksum cho Ví Có
          if (updatedCreditPocket) {
            const creditChecksum = SecurityUtil.generatePocketChecksum(updatedCreditPocket.balance, updatedCreditPocket.user);
            await pocketCollection.updateOne(
              { _id: updatedCreditPocket._id },
              { $set: { checksum: creditChecksum } },
              { session }
            );
          }

          // --- TASK 5: Sinh bút toán chi tiết (PocketEntry) ---
          await pocketEntryCollection.insertOne({
            transRefId: transRefId,
            stepOrder: step.order,
            debit: debitPocketId,
            credit: creditPocketId,
            amount: stepAmountValue,
            status: 'settled',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }, { session });
          // ----------------------------------------------------
        }

        // Khai báo các biến cho Biller Retry
        let billerSyncStatus = null;
        let finalBillerCode = null;
        let finalBillerRefId = null;

        // --- 3.5 Biller Payment Adapter (Generic Mapping) ---
        if (service.action === 'billerTrans') {
          // Lấy cấu hình từ Service
          const billerIdField = service.actionParams?.billerIdField || 'BILLERID';
          const customerCodeField = service.actionParams?.customerCodeField || 'BILLCODE';

          const billerCode = TRANSBODY[billerIdField] || TRANSBODY.BILLER_CODE;
          const customerCode = TRANSBODY[customerCodeField] || TRANSBODY.CUSTOMER_CODE;
          
          if (!billerCode) throw new Error('BILLER_ERR.MISSING_DATA: Thiếu Biller Code để thanh toán.');

          const biller = await Biller.findOne({ code: billerCode });
          if (!biller) throw new Error('BILLER_ERR.NOT_FOUND: Biller không tồn tại.');

          if (biller.paymentUrl) {
            finalBillerCode = billerCode;
            finalBillerRefId = TRANSBODY.BILLERREFID || transRefId;
            
            try {
              let reqBody = {};
              if (biller.payReqKeyCustomer) reqBody[biller.payReqKeyCustomer] = customerCode;
              if (biller.payReqKeyAmount) reqBody[biller.payReqKeyAmount] = TRANSBODY.TOTALAMOUNT || amountValue;
              if (biller.payReqKeyBillRef) reqBody[biller.payReqKeyBillRef] = finalBillerRefId;

              sails.log.info(`[Biller Adapter] PAY to ${biller.paymentUrl}`, reqBody);
              const response = await axios.post(biller.paymentUrl, reqBody, { timeout: 15000 });
              sails.log.info(`[Biller Adapter] PAY RES:`, response.data);

              const statusPath = biller.payResMappingStatus || 'status';
              const successVal = biller.payResMappingSuccessValue || 'success';
              
              const resStatus = String(_.get(response.data, statusPath) || '');
              
              if (resStatus.toLowerCase() !== successVal.toLowerCase()) {
                throw new Error(`BILLER_ERR.REJECTED: Nhà cung cấp từ chối thanh toán: ${resStatus}`);
              }
              
              // Thành công
              billerSyncStatus = 'success';
            } catch (error) {
              const isTest = process.env.NODE_ENV === 'test' || (sails.config && sails.config.environment === 'test');
              if (!isTest) {
                sails.log.error('[Biller Adapter] Lỗi gọi Payment:', error.message);
              }
              
              // Nếu Biller từ chối rõ ràng thì huỷ giao dịch (throw error)
              if (error.message.startsWith('BILLER_ERR.REJECTED')) {
                throw error;
              }
              
              // Nếu lỗi mạng / Timeout -> Không huỷ giao dịch, đưa vào trạng thái pending để Retry
              if (!isTest) {
                sails.log.warn('[Biller Adapter] Gặp lỗi mạng, chuyển trạng thái sang pending để Retry Cronjob xử lý.');
              }
              billerSyncStatus = 'pending';
            }
          }
        }
        // ----------------------------------------------------

        // Tạo Transaction Record trong cùng 1 session
        const descField = service.descriptionField || 'DESCRIPTION';
        const newTrans = {
          transRefId: transRefId,
          serviceId: service.id,
          sender: TRANSBODY.SENDERID || null,
          receiver: TRANSBODY.RECEIVERID || null,
          amount: amountValue,
          fee: calculatedFee,
          totalAmount: TRANSBODY.TOTALAMOUNT || amountValue,
          billerRefId: TRANSBODY.BILLERREFID || null,
          description: TRANSBODY[descField] || null,
          status: 'done',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const insertRes = await transactionCollection.insertOne(newTrans, { session });
        createdTransactionId = insertRes.insertedId.toString();

        // Cập nhật Trail thành done
        const successMessage = { message: 'Giao dịch thành công', transactionId: createdTransactionId };
        const logs = trail.transStepLog || [];
        logs.push({
          step: 3,
          timestamp: Date.now(),
          result: 'success',
          message: 'Xác thực PIN và hạch toán kế toán thành công'
        });
        
        const updateData = { 
          status: 'done', 
          transStep: 3,
          transStepLog: logs,
          outputMessage: successMessage,
          updatedAt: Date.now() 
        };
        
        // Thêm trường Biller nếu có
        if (billerSyncStatus) {
          updateData.billerSyncStatus = billerSyncStatus;
          updateData.billerSyncRetries = 0;
          updateData.billerCode = finalBillerCode;
          updateData.billerRefId = finalBillerRefId;
        }
        
        await trailCollection.updateOne(
          { _id: new (require('mongodb').ObjectId)(trail.id) },
          { $set: updateData },
          { session }
        );
      });
    } finally {
      await session.endSession();
      // --- TASK 3: Mở khóa tài khoản (Release) ---
      if (isLocked && TRANSBODY.SENDERID) {
        await Pocket.updateOne({ id: TRANSBODY.SENDERID, lockOwner: transRefId }).set({ state: 'active', lockOwner: null });
      }
      // -------------------------------------------
    }
    
    // --- TASK 5: Realtime Socket Emit ---
    try {
      if (TRANSBODY.SENDERID) {
        sails.sockets.broadcast(`pocket_room_${TRANSBODY.SENDERID}`, 'transaction_updated', { transactionId: createdTransactionId, transRefId });
      }
      if (TRANSBODY.RECEIVERID) {
        sails.sockets.broadcast(`pocket_room_${TRANSBODY.RECEIVERID}`, 'transaction_updated', { transactionId: createdTransactionId, transRefId });
      }
      // Báo cho Officer room
      sails.sockets.broadcast('officer_room', 'transaction_updated', { transactionId: createdTransactionId, transRefId });
    } catch (err) {
      sails.log.error('Lỗi broadcast socket realtime:', err);
    }

    return {
      transRefId: transRefId,
      status: 'SUCCESS',
      message: 'Giao dịch thành công',
      transactionId: createdTransactionId
    };
    
    } finally {
      await RedisService.del(`trx_lock:${transRefId}`);
    }
  },

  processBillerRefund: async function (transRefId) {
    const trx = await Transaction.findOne({ transRefId, status: 'done' });
    if (!trx) return;
    
    const entries = await PocketEntry.find({ transRefId: transRefId });
    if (!entries || entries.length === 0) return;

    const db = Transaction.getDatastore().manager;
    const pocketCollection = db.collection(Pocket.tableName);
    const entryCollection = db.collection(PocketEntry.tableName);

    const session = db.client.startSession();
    try {
      await session.withTransaction(async () => {
        for (const entry of entries) {
          const debitPocketId = entry.debit;
          const creditPocketId = entry.credit;
          const amount = entry.amount;

          // Xử lý hoàn lại tiền cho ví Nguồn (debit) -> Cộng lại tiền
          if (debitPocketId && debitPocketId !== 'null' && debitPocketId !== 'SYSTEM_POCKET_ID') {
            const debitObjId = new (require('mongodb').ObjectId)(debitPocketId);
            const updatedDebit = await pocketCollection.findOneAndUpdate(
              { _id: { $in: [debitPocketId, debitObjId] } },
              { $inc: { balance: amount } },
              { session, returnDocument: 'after' }
            );
            if (!updatedDebit) throw new Error('Refund failed for debit pocket');
            
            const newDebitChecksum = SecurityUtil.generatePocketChecksum(
              updatedDebit.balance !== undefined ? updatedDebit.balance : updatedDebit.value.balance,
              updatedDebit.user !== undefined ? updatedDebit.user : updatedDebit.value.user
            );
            await pocketCollection.updateOne(
              { _id: { $in: [debitPocketId, debitObjId] } },
              { $set: { checksum: newDebitChecksum } },
              { session }
            );
          }

          // Xử lý trừ tiền lại ví Đích (credit) -> Trừ tiền
          if (creditPocketId && creditPocketId !== 'null' && creditPocketId !== 'SYSTEM_POCKET_ID') {
            const creditObjId = new (require('mongodb').ObjectId)(creditPocketId);
            const updatedCredit = await pocketCollection.findOneAndUpdate(
              { _id: { $in: [creditPocketId, creditObjId] }, balance: { $gte: amount } },
              { $inc: { balance: -amount } },
              { session, returnDocument: 'after' }
            );
            if (!updatedCredit) throw new Error('Refund failed for credit pocket - insufficient balance');
            
            const newCreditChecksum = SecurityUtil.generatePocketChecksum(
              updatedCredit.balance !== undefined ? updatedCredit.balance : updatedCredit.value.balance,
              updatedCredit.user !== undefined ? updatedCredit.user : updatedCredit.value.user
            );
            await pocketCollection.updateOne(
              { _id: { $in: [creditPocketId, creditObjId] } },
              { $set: { checksum: newCreditChecksum } },
              { session }
            );
          }

          // Thêm bút toán đảo (Reverse Entry)
          const newStepOrder = entry.stepOrder + 100; // Để nó nằm sau
          await entryCollection.insertOne({
            transRefId: entry.transRefId,
            stepOrder: newStepOrder,
            debit: entry.credit,
            credit: entry.debit,
            amount: entry.amount,
            status: 'done',
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime()
          }, { session });
        }

        // Cập nhật trạng thái transaction
        await db.collection(Transaction.tableName).updateOne(
          { transRefId: trx.transRefId },
          { $set: { status: 'refunded', description: trx.description + ' (ĐÃ HOÀN TIỀN)' } },
          { session }
        );
      });
      sails.log.info(`[Biller Refund] Hoàn tiền thành công cho giao dịch ${transRefId}`);
    } catch (err) {
      sails.log.error(`[Biller Refund] Lỗi hoàn tiền tự động cho giao dịch ${transRefId}`, err);
    } finally {
      session.endSession();
    }
  },

  /**
   * Lấy cấu hình Engine từ Cache (hoặc DB nếu Cache Miss)
   */
  getEngineConfig: async function (serviceId) {
    // Luôn luôn phải Query Service trước để lấy Version
    const service = await Service.findOne({ id: serviceId });
    if (!service) return null; // Dịch vụ không tồn tại

    const version = service.version || 1;
    const cacheKey = `CACHE:ENGINE:SERVICE_CONFIG:${serviceId}_v${version}`;
    let config = null;
    
    // Thử lấy cấu hình đầy đủ từ Cache dựa trên Version
    const cachedStr = await RedisService.get(cacheKey);
    if (cachedStr) {
      try {
        config = JSON.parse(cachedStr);
      } catch (e) {
        sails.log.warn(`Lỗi parse JSON cache Engine Config cho service ${serviceId}, sẽ fetch lại từ DB.`);
      }
    }
    
    // Nếu Cache Miss
    if (!config) {
      const transFields = await TransField.find({ service: serviceId }).sort('order ASC');
      const transDef = await TransDefinition.findOne({ service: serviceId });
      const validations = await TransValidation.find({ service: serviceId }).sort('order ASC');
      
      config = {
        service,
        transFields,
        transDef,
        validations
      };
      
      // Lưu lại vào Cache trong 24 giờ (Vì có versioning nên có thể cache dài hạn)
      await RedisService.set(cacheKey, JSON.stringify(config), 86400);
    }
    
    return config;
  }
};
