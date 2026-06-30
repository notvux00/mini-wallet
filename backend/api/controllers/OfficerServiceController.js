/**
 * OfficerServiceController
 *
 * @description :: Server-side actions for handling Service Config for Officer.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  // Lấy danh sách các dịch vụ hiện tại từ Database
  list: async function (req, res) {
    try {
      const services = await Service.find();
      const total = await Service.count();
      
      return res.ok({
        items: services,
        total: total
      }, 'Lấy danh sách dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi lấy danh sách dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // API nhận data từ màn hình Wizard 4 bước và lưu vào 5 bảng DB
  create: async function (req, res) {
    try {
      const { serviceInfo, fields, rules, accountingSteps } = req.body;
      
      // 1. Build fieldBuilder từ mảng fields
      const fieldBuilder = fields.map((f, i) => ({
        order: i + 1,
        name: f.variableName,
        rule: 'mapping',
        source: 'parameters',
        variable: f.variableName,
        datatype: f.type,
        errorCode: `ERR_${f.variableName}`
      }));
      
      // UNDER THE HOOD: Tự động nhét thêm các Rule ngầm để Engine hoạt động
      let orderIndex = fieldBuilder.length + 1;
      
      fieldBuilder.push({
        order: orderIndex++,
        name: 'CURRENCY',
        rule: 'fixed',
        source: '',
        variable: 'VND',
        datatype: 'string',
        errorCode: 'ERR_CURRENCY'
      });
      
      fieldBuilder.push({
        order: orderIndex++,
        name: 'SENDERID',
        rule: 'query',
        source: 'system',
        variable: 'queryPocketByUserId(USERID).id',
        datatype: 'string',
        errorCode: 'ERR_SENDER_POCKET_NOT_FOUND'
      });
      
      // Nếu là dịch vụ P2P (ko gọi hệ thống ngoài) thì tự lấy Ví nhận từ SĐT
      if (!serviceInfo.action || serviceInfo.action === 'none') {
        fieldBuilder.push({
          order: orderIndex++,
          name: 'RECEIVERID',
          rule: 'query',
          source: 'system',
          variable: 'queryPocketByPhone(RECEIVERPHONE).id',
          datatype: 'string',
          errorCode: 'ERR_RECEIVER_POCKET_NOT_FOUND'
        });
      } else {
        // Dành cho dịch vụ Bill Payment (lấy từ config Bill)
        const billerVar = (serviceInfo.actionParams && serviceInfo.actionParams.billerIdField) ? serviceInfo.actionParams.billerIdField : 'BILLERID';
        fieldBuilder.push({
          order: orderIndex++,
          name: 'RECEIVERID',
          rule: 'query',
          source: 'system',
          variable: `queryPocketByBillerId(${billerVar}).id`,
          datatype: 'string',
          errorCode: 'ERR_BILLER_POCKET_NOT_FOUND'
        });
      }
      
      // KHỞI TẠO NATIVE MONGODB TRANSACTION ĐỂ ĐẢM BẢO TÍNH ACID (Vì sails-mongo không support waterline .transaction())
      const client = sails.getDatastore().manager.client;
      const db = client.db();
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          // 2. Tạo record trong bảng Service (dùng native driver)
          const serviceResult = await db.collection('service').insertOne({
            code: serviceInfo.serviceCode,
            name: serviceInfo.serviceName,
            action: serviceInfo.action || 'none',
            actionParams: serviceInfo.actionParams || {},
            auth: { method: serviceInfo.authMethod },
            fee: { type: serviceInfo.feeType, value: Number(serviceInfo.feeValue) || 0 },
            status: 'active',
            fieldBuilder: fieldBuilder,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }, { session });
          
          const serviceIdStr = serviceResult.insertedId.toString();
          
          // 3. Tạo các record trong bảng TransField
          const transFieldsToCreate = fields.map((f, i) => ({
            service: serviceIdStr,
            fieldName: f.variableName,
            fieldFormat: f.type,
            isRequired: f.required,
            order: i + 1,
            errorCode: `ERR_FIELD_${f.variableName}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
          
          // Luôn có trường SERVICEID ẩn theo Design Brief
          transFieldsToCreate.unshift({
            service: serviceIdStr,
            fieldName: 'SERVICEID',
            fieldFormat: 'string',
            isRequired: true,
            order: 0,
            errorCode: 'ERR_MISSING_SERVICEID',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          await db.collection('transfield').insertMany(transFieldsToCreate, { session });
          
          // 4. Tạo các record trong bảng TransValidation
          const validationsToCreate = [];
          let order = 1;
          
          if (rules.notSameSender) {
            validationsToCreate.push({
              service: serviceIdStr,
              validateFunc: 'validateReceiverIsNotSender',
              validateFields: 'SENDERID:RECEIVERID',
              order: order++,
              errorCode: 'ERR_SAME_SENDER',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          if (rules.checkBalance) {
            validationsToCreate.push({
              service: serviceIdStr,
              validateFunc: 'validateSenderAccountSufficiency',
              validateFields: 'SENDERID:AMOUNT:DEBITFEE',
              order: order++,
              errorCode: 'ERR_INSUFFICIENT_BALANCE',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          if (rules.minAmount) {
            validationsToCreate.push({
              service: serviceIdStr,
              validateFunc: 'validateMinAmount',
              validateFields: 'AMOUNT:10000',
              order: order++,
              errorCode: 'ERR_MIN_AMOUNT',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          
          if (validationsToCreate.length > 0) {
            await db.collection('transvalidation').insertMany(validationsToCreate, { session });
          }
          
          // 5. Tạo record trong bảng TransDefinition (glSteps)
          const glSteps = accountingSteps.map((step, i) => {
            // Hàm quy đổi ví từ Dropdown Frontend sang Format Backend
            const mapTarget = (val) => {
              if (val === 'SENDER') return { level: 'productLevel', target: 'SENDERID' };
              if (val === 'RECEIVER') return { level: 'productLevel', target: 'RECEIVERID' };
              if (val === 'SYSTEM_FEE') return { level: 'wallet', target: 'SYS_FEE' };
              if (val === 'SYSTEM_PROMO') return { level: 'wallet', target: 'SYS_PROMO' };
              if (val === 'BANK') return { level: 'wallet', target: 'SYS_BANK' };
              return { level: 'wallet', target: val };
            };
            
            return {
              order: i,
              amount: step.amountVar,
              debit: mapTarget(step.from),
              credit: mapTarget(step.to)
            };
          });
          
          await db.collection('transdefinition').insertOne({
            service: serviceIdStr,
            glSteps: glSteps,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }, { session });
        });
      } finally {
        await session.endSession();
      }
      
      return res.ok(null, 'Lưu cấu hình Dịch vụ thành công (vào Database)!');
    } catch (error) {
      sails.log.error('Lỗi lưu cấu hình dịch vụ DB:', error);
      
      // Bắt lỗi trùng mã Service
      if (error.code === 'E_UNIQUE') {
         return res.error('BAD_REQUEST', 'Mã Dịch vụ (Code) này đã tồn tại!');
      }
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // Xem chi tiết Dịch vụ (dùng cho Edit)
  detail: async function (req, res) {
    try {
      const { id } = req.body;
      if (!id) return res.error('BAD_REQUEST', 'Thiếu ID dịch vụ');

      const service = await Service.findOne({ id });
      if (!service) return res.error('NOT_FOUND', 'Dịch vụ không tồn tại');

      const fields = await TransField.find({ service: id }).sort('order ASC');
      const validations = await TransValidation.find({ service: id }).sort('order ASC');
      const definition = await TransDefinition.findOne({ service: id });

      return res.ok({
        serviceInfo: {
          serviceCode: service.code,
          serviceName: service.name,
          authMethod: service.auth?.method || 'PIN',
          feeType: service.fee?.type || 'fixed',
          feeValue: service.fee?.value || 0,
          action: service.action || 'none',
          actionParams: service.actionParams || {}
        },
        fields: fields,
        validations: validations,
        accountingSteps: definition ? definition.glSteps : []
      }, 'Lấy chi tiết dịch vụ thành công');
    } catch (error) {
      sails.log.error('Lỗi lấy chi tiết dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // Cập nhật Dịch vụ (Edit)
  update: async function (req, res) {
    try {
      const { id, serviceInfo, fields, rules, accountingSteps } = req.body;
      if (!id) return res.error('BAD_REQUEST', 'Thiếu ID dịch vụ');

      // 1. Build fieldBuilder từ mảng fields
      const fieldBuilder = fields.map((f, i) => ({
        order: i + 1,
        name: f.variableName,
        rule: 'mapping',
        source: 'parameters',
        variable: f.variableName,
        datatype: f.type,
        errorCode: `ERR_${f.variableName}`
      }));
      
      // UNDER THE HOOD: Tự động nhét thêm các Rule ngầm để Engine hoạt động
      let orderIndex = fieldBuilder.length + 1;
      
      fieldBuilder.push({
        order: orderIndex++,
        name: 'CURRENCY',
        rule: 'fixed',
        source: '',
        variable: 'VND',
        datatype: 'string',
        errorCode: 'ERR_CURRENCY'
      });
      
      fieldBuilder.push({
        order: orderIndex++,
        name: 'SENDERID',
        rule: 'query',
        source: 'system',
        variable: 'queryPocketByUserId(USERID).id',
        datatype: 'string',
        errorCode: 'ERR_SENDER_POCKET_NOT_FOUND'
      });
      
      // Nếu là dịch vụ P2P (ko gọi hệ thống ngoài) thì tự lấy Ví nhận từ SĐT
      if (!serviceInfo.action || serviceInfo.action === 'none') {
        fieldBuilder.push({
          order: orderIndex++,
          name: 'RECEIVERID',
          rule: 'query',
          source: 'system',
          variable: 'queryPocketByPhone(RECEIVERPHONE).id',
          datatype: 'string',
          errorCode: 'ERR_RECEIVER_POCKET_NOT_FOUND'
        });
      } else {
        // Dành cho dịch vụ Bill Payment (lấy từ config Bill)
        const billerVar = (serviceInfo.actionParams && serviceInfo.actionParams.billerIdField) ? serviceInfo.actionParams.billerIdField : 'BILLERID';
        fieldBuilder.push({
          order: orderIndex++,
          name: 'RECEIVERID',
          rule: 'query',
          source: 'system',
          variable: `queryPocketByBillerId(${billerVar}).id`,
          datatype: 'string',
          errorCode: 'ERR_BILLER_POCKET_NOT_FOUND'
        });
      }
      
      const client = sails.getDatastore().manager.client;
      const db = client.db();
      const session = client.startSession();
      
      const ObjectId = require('mongodb').ObjectId;
      const objectId = new ObjectId(id);
      
      try {
        await session.withTransaction(async () => {
          // Xóa config cũ
          await db.collection('transfield').deleteMany({ service: id }, { session });
          await db.collection('transvalidation').deleteMany({ service: id }, { session });
          await db.collection('transdefinition').deleteMany({ service: id }, { session });

          // Cập nhật bảng Service
          await db.collection('service').updateOne(
            { _id: objectId },
            {
              $set: {
                name: serviceInfo.serviceName,
                action: serviceInfo.action || 'none',
                actionParams: serviceInfo.actionParams || {},
                auth: { method: serviceInfo.authMethod },
                fee: { type: serviceInfo.feeType, value: Number(serviceInfo.feeValue) || 0 },
                fieldBuilder: fieldBuilder,
                updatedAt: Date.now()
              }
            },
            { session }
          );
          
          // Tạo các record trong bảng TransField mới
          const transFieldsToCreate = fields.map((f, i) => ({
            service: id,
            fieldName: f.variableName,
            fieldFormat: f.type,
            isRequired: f.required,
            order: i + 1,
            errorCode: `ERR_FIELD_${f.variableName}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
          
          transFieldsToCreate.unshift({
            service: id,
            fieldName: 'SERVICEID',
            fieldFormat: 'string',
            isRequired: true,
            order: 0,
            errorCode: 'ERR_MISSING_SERVICEID',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          await db.collection('transfield').insertMany(transFieldsToCreate, { session });
          
          // Tạo các record trong bảng TransValidation mới
          const validationsToCreate = [];
          let order = 1;
          
          if (rules.notSameSender) {
            validationsToCreate.push({
              service: id,
              validateFunc: 'validateReceiverIsNotSender',
              validateFields: 'SENDERID:RECEIVERID',
              order: order++,
              errorCode: 'ERR_SAME_SENDER',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          if (rules.checkBalance) {
            validationsToCreate.push({
              service: id,
              validateFunc: 'validateSenderAccountSufficiency',
              validateFields: 'SENDERID:AMOUNT:DEBITFEE',
              order: order++,
              errorCode: 'ERR_INSUFFICIENT_BALANCE',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          if (rules.minAmount) {
            validationsToCreate.push({
              service: id,
              validateFunc: 'validateMinAmount',
              validateFields: 'AMOUNT:10000',
              order: order++,
              errorCode: 'ERR_MIN_AMOUNT',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          
          if (validationsToCreate.length > 0) {
            await db.collection('transvalidation').insertMany(validationsToCreate, { session });
          }
          
          // Tạo record trong bảng TransDefinition mới
          const glSteps = accountingSteps.map((step, i) => {
            const mapTarget = (val) => {
              if (val === 'SENDER') return { level: 'productLevel', target: 'SENDERID' };
              if (val === 'RECEIVER') return { level: 'productLevel', target: 'RECEIVERID' };
              if (val === 'SYSTEM_FEE') return { level: 'wallet', target: 'SYS_FEE' };
              if (val === 'SYSTEM_PROMO') return { level: 'wallet', target: 'SYS_PROMO' };
              if (val === 'BANK') return { level: 'wallet', target: 'SYS_BANK' };
              return { level: 'wallet', target: val };
            };
            
            return {
              order: i,
              amount: step.amountVar,
              debit: mapTarget(step.from),
              credit: mapTarget(step.to)
            };
          });
          
          await db.collection('transdefinition').insertOne({
            service: id,
            glSteps: glSteps,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }, { session });
        });
      } finally {
        await session.endSession();
      }
      
      return res.ok(null, 'Cập nhật cấu hình Dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi cập nhật cấu hình dịch vụ DB:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  }

};
