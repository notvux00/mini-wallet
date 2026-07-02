/**
 * OfficerServiceController
 *
 * @description :: Server-side actions for handling Service Config for Officer.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// ─── Error Codes cho Service Configurator ────────────────────────────────────
// Format: 5xxx = Service Config domain
const SVC_ERR = {
  FIELD_BASE:               5001, // Lỗi field nhập liệu (base, +index để phân biệt)
  SENDER_NOT_FOUND:         5010, // Không tìm thấy ví người gửi
  RECEIVER_NOT_FOUND:       5011, // Không tìm thấy ví người nhận
  BILLER_NOT_FOUND:         5012, // Không tìm thấy ví Biller
  CURRENCY_INVALID:         5020, // Đơn vị tiền tệ không hợp lệ
  SAME_SENDER:              5030, // Người nhận trùng người gửi
  INSUFFICIENT_BALANCE:     5031, // Số dư không đủ (bao gồm phí)
  MIN_AMOUNT:               5032, // Số tiền dưới mức tối thiểu
  SERVICE_NOT_ACTIVE:       5040, // Dịch vụ đang active, phải tắt trước khi sửa
  SERVICE_ALREADY_INACTIVE: 5041, // Dịch vụ đã inactive rồi
};

// Tên biến hệ thống — Officer KHÔNG được đặt trùng
const SYSTEM_FIELD_NAMES = ['SERVICEID', 'CURRENCY', 'SENDERID', 'RECEIVERID',
  'DEBITFEE', 'TOTALAMOUNT', 'TRANSREFID', 'USERID'];

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Kiểm tra Officer không đặt tên biến trùng với biến hệ thống.
 * Trả về tên biến bị trùng nếu có, null nếu hợp lệ.
 */
function _findReservedNameConflict(fields) {
  const conflict = fields.find(f => SYSTEM_FIELD_NAMES.includes(f.variableName.toUpperCase()));
  return conflict ? conflict.variableName : null;
}

/**
 * Xây dựng mảng fieldBuilder từ danh sách field của Officer.
 * Tự động bổ sung các biến hệ thống (CURRENCY, SENDERID, RECEIVERID).
 *
 * Với P2P: tên biến SĐT người nhận lấy từ actionParams.receiverPhoneField
 * (Officer khai báo ở Bước 1 Wizard), thay vì hardcode 'RECEIVERPHONE'.
 * Với billerTrans: tương tự, dùng actionParams.billerIdField.
 */
function _buildFieldBuilder(fields, serviceInfo) {
  const fieldBuilder = fields.map((f, i) => ({
    order: i + 1,
    name: f.variableName,
    rule: 'mapping',
    source: 'parameters',
    variable: f.variableName,
    datatype: f.type,
  }));

  let orderIndex = fieldBuilder.length + 1;

  // Biến hệ thống: Đơn vị tiền tệ cố định
  fieldBuilder.push({
    order: orderIndex++,
    name: 'CURRENCY',
    rule: 'fixed',
    source: '',
    variable: 'VND',
    datatype: 'string',
    errorCode: SVC_ERR.CURRENCY_INVALID,
    errorMessage: 'Đơn vị tiền tệ không hợp lệ.',
  });

  // Biến hệ thống: ID Ví người gửi (luôn lấy từ session user)
  fieldBuilder.push({
    order: orderIndex++,
    name: 'SENDERID',
    rule: 'query',
    source: 'system',
    variable: 'queryPocketByUserId(USERID).id',
    datatype: 'string',
    errorCode: SVC_ERR.SENDER_NOT_FOUND,
    errorMessage: 'Không tìm thấy ví của người gửi.',
  });

  // Biến hệ thống: ID Ví người nhận
  // Dùng tên biến do Officer khai báo trong actionParams thay vì hardcode,
  // tránh trường hợp Officer đặt tên khác (VD: PHONE thay vì RECEIVERPHONE).
  if (serviceInfo.action === 'cashIn') {
    // Cash-in: SENDERID là ví Bank Officer chọn LÚC GIAO DỊCH (không fix ở config).
    // Officer định nghĩa một field (VD: BANKID) ở Bước 2 Wizard,
    // rồi ánh xạ field đó là "bankPocketField" ở Bước 3.
    // Lúc giao dịch, Officer chọn ví Bank → giá trị được mapping vào SENDERID.
    const bankPocketField = serviceInfo.actionParams && serviceInfo.actionParams.bankPocketField
      ? serviceInfo.actionParams.bankPocketField
      : 'BANKID'; // fallback mặc định

    const senderIdx = fieldBuilder.findIndex(f => f.name === 'SENDERID');
    if (senderIdx !== -1) {
      fieldBuilder[senderIdx] = {
        ...fieldBuilder[senderIdx],
        rule: 'mapping',
        source: 'parameters',
        variable: bankPocketField, // lấy từ input của Officer lúc giao dịch
        errorCode: SVC_ERR.SENDER_NOT_FOUND,
        errorMessage: 'Ví Bank nguồn không hợp lệ.',
      };
    }

    // RECEIVERID: ví của Customer được nạp tiền, tra theo SĐT Officer nhập
    const phoneVar = serviceInfo.actionParams && serviceInfo.actionParams.receiverPhoneField
      ? serviceInfo.actionParams.receiverPhoneField
      : 'RECEIVERPHONE';
    fieldBuilder.push({
      order: orderIndex++,
      name: 'RECEIVERID',
      rule: 'query',
      source: 'system',
      variable: `queryPocketByPhone(${phoneVar}).id`,
      datatype: 'string',
      errorCode: SVC_ERR.RECEIVER_NOT_FOUND,
      errorMessage: 'Không tìm thấy ví của khách hàng được nạp tiền.',
    });

  } else if (!serviceInfo.action || serviceInfo.action === 'none') {
    // P2P: tra ví theo SĐT. Officer phải khai báo actionParams.receiverPhoneField
    // là tên biến họ dùng cho SĐT người nhận (VD: 'RECEIVERPHONE', 'PHONE', ...).
    const phoneVar = serviceInfo.actionParams && serviceInfo.actionParams.receiverPhoneField
      ? serviceInfo.actionParams.receiverPhoneField
      : 'RECEIVERPHONE'; // fallback mặc định nếu không khai báo
    fieldBuilder.push({
      order: orderIndex++,
      name: 'RECEIVERID',
      rule: 'query',
      source: 'system',
      variable: `queryPocketByPhone(${phoneVar}).id`,
      datatype: 'string',
      errorCode: SVC_ERR.RECEIVER_NOT_FOUND,
      errorMessage: 'Không tìm thấy ví của người nhận.',
    });
  } else {
    // billerTrans: tra ví Biller theo billerIdField
    const billerVar = serviceInfo.actionParams && serviceInfo.actionParams.billerIdField
      ? serviceInfo.actionParams.billerIdField
      : 'BILLERID'; // fallback mặc định
    fieldBuilder.push({
      order: orderIndex++,
      name: 'RECEIVERID',
      rule: 'query',
      source: 'system',
      variable: `queryPocketByBillerId(${billerVar}).id`,
      datatype: 'string',
      errorCode: SVC_ERR.BILLER_NOT_FOUND,
      errorMessage: 'Không tìm thấy ví của nhà cung cấp dịch vụ.',
    });
  }

  return fieldBuilder;
}

/**
 * Xây dựng mảng TransField records từ danh sách field của Officer.
 *
 * TRANSBODY chỉ dựng từ các fieldName khai trong TransField (WEEK2 §9).
 * Vì vậy, ngoài các field Officer định nghĩa, cần tạo đủ record cho TẤT CẢ
 * biến hệ thống mà fieldBuilder inject (SERVICEID, CURRENCY, SENDERID, RECEIVERID).
 */
function _buildTransFields(fields, serviceId, serviceInfo) {
  // ── Các biến hệ thống bắt buộc ───────────────────────────────────────────
  // Engine chỉ đưa vào TRANSBODY những field có khai trong TransField.
  // Thiếu bất kỳ record nào dưới đây → glSteps chạy với undefined.

  const systemFields = [
    {
      fieldName: 'SERVICEID',
      fieldFormat: 'string',
      isRequired: true,
      order: 0,
      errorCode: SVC_ERR.FIELD_BASE,
      errorMessage: 'Không tìm thấy cấu hình dịch vụ.',
    },
    {
      fieldName: 'CURRENCY',
      fieldFormat: 'string',
      isRequired: true,
      order: 1000, // đặt cao để không xung đột với Officer fields
      errorCode: SVC_ERR.CURRENCY_INVALID,
      errorMessage: 'Đơn vị tiền tệ không hợp lệ.',
    },
    {
      fieldName: 'SENDERID',
      fieldFormat: 'string',
      isRequired: true,
      order: 1001,
      errorCode: SVC_ERR.SENDER_NOT_FOUND,
      errorMessage: 'Không tìm thấy ví của người gửi.',
    },
    {
      fieldName: 'RECEIVERID',
      fieldFormat: 'string',
      isRequired: true,
      order: 1002,
      errorCode: SVC_ERR.RECEIVER_NOT_FOUND,
      errorMessage: 'Không tìm thấy ví của người nhận.',
    },
  ].map(f => ({
    service: serviceId,
    minLength: null,
    maxLength: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...f,
  }));

  // ── Các field do Officer định nghĩa (Wizard Bước 2) ──────────────────────
  const officerFields = fields.map((f, i) => ({
    service: serviceId,
    fieldName: f.variableName,
    fieldFormat: f.type,
    isRequired: f.required,
    minLength: f.minLength || null,
    maxLength: f.maxLength || null,
    errorCode: f.errorCode || SVC_ERR.FIELD_BASE + (i + 1),
    errorMessage: f.errorMessage || `Trường "${f.variableName}" không hợp lệ.`,
    order: i + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  return [...systemFields, ...officerFields];
}


/**
 * Xây dựng mảng TransValidation records từ object rules của Officer.
 * amountField: tên biến số tiền do Officer đặt (VD: 'AMOUNT', 'SOTIEN'...)
 */
function _buildValidations(rules, serviceId, amountField) {
  const validations = [];
  let order = 1;

  if (rules.notSameSender) {
    validations.push({
      service: serviceId,
      validateFunc: 'validateReceiverIsNotSender',
      validateFields: 'SENDERID:RECEIVERID',
      order: order++,
      errorCode: SVC_ERR.SAME_SENDER,
      errorMessage: 'Người nhận không được trùng với người gửi.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  if (rules.checkBalance) {
    validations.push({
      service: serviceId,
      validateFunc: 'validateSenderAccountSufficiency',
      validateFields: `SENDERID:${amountField}:DEBITFEE`, // dùng tên biến động
      order: order++,
      errorCode: SVC_ERR.INSUFFICIENT_BALANCE,
      errorMessage: 'Số dư không đủ để thực hiện giao dịch (bao gồm phí).',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  if (rules.minAmount) {
    const threshold = rules.minAmountValue || 10000;
    validations.push({
      service: serviceId,
      validateFunc: 'validateMinAmount',
      validateFields: `${amountField}:${threshold}`, // dùng tên biến động
      order: order++,
      errorCode: SVC_ERR.MIN_AMOUNT,
      errorMessage: `Số tiền giao dịch tối thiểu là ${threshold.toLocaleString('vi-VN')}đ.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return validations;
}

/**
 * Chuyển đổi giá trị Dropdown (từ Frontend) sang format glSteps của Engine.
 */
function _mapGlTarget(val) {
  const mapping = {
    SENDER:      { level: 'productLevel', target: 'SENDERID' },
    RECEIVER:    { level: 'productLevel', target: 'RECEIVERID' },
    SYSTEM_FEE:  { level: 'wallet',       target: 'SYS_FEE'   },
    SYSTEM_PROMO:{ level: 'wallet',       target: 'SYS_PROMO' },
    BANK:        { level: 'wallet',       target: 'SYS_BANK'  },
  };
  return mapping[val] || { level: 'wallet', target: val };
}

/**
 * Xây dựng mảng glSteps từ các AccountingCard của Officer.
 */
function _buildGlSteps(accountingSteps) {
  return accountingSteps.map((step, i) => ({
    order: i,
    amount: step.amountVar,
    debit: _mapGlTarget(step.from),
    credit: _mapGlTarget(step.to),
  }));
}

// ─── Controller Actions ───────────────────────────────────────────────────────

module.exports = {

  // Lấy danh sách các dịch vụ hiện tại từ Database
  list: async function (req, res) {
    try {
      const { page = 1, limit = 20 } = req.body;
      const skip = (page - 1) * limit;

      const services = await Service.find({ skip, limit }).sort('createdAt DESC');
      const total = await Service.count();

      return res.ok({ items: services, total, page, limit }, 'Lấy danh sách dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi lấy danh sách dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // API nhận data từ màn hình Wizard 4 bước và lưu vào 5 bảng DB
  create: async function (req, res) {
    try {
      const { serviceInfo, fields, rules, accountingSteps } = req.body;

      // Kiểm tra tên biến Officer không trùng với biến hệ thống
      const conflict = _findReservedNameConflict(fields);
      if (conflict) {
        return res.error('BAD_REQUEST',
          `Tên biến "${conflict}" đã được hệ thống sử dụng. Vui lòng chọn tên khác.`
        );
      }

      const fieldBuilder = _buildFieldBuilder(fields, serviceInfo);
      const glSteps = _buildGlSteps(accountingSteps);
      // Tên biến số tiền lấy từ bút toán đầu tiên (Officer tự đặt: AMOUNT, SOTIEN...)
      const amountField = (glSteps.length > 0 && glSteps[0].amount) ? glSteps[0].amount : 'AMOUNT';

      // ACID Transaction: lưu vào 4 bảng cùng lúc, all-or-nothing
      const client = sails.getDatastore().manager.client;
      const db = client.db();
      const session = client.startSession();

      try {
        await session.withTransaction(async () => {
          // 1. Tạo record Service
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
            updatedAt: Date.now(),
          }, { session });

          const serviceId = serviceResult.insertedId.toString();

          // 2. Tạo các TransField records
          const transFields = _buildTransFields(fields, serviceId, serviceInfo);
          if (transFields.length > 0) {
            await db.collection('transfield').insertMany(transFields, { session });
          }

          // 3. Tạo các TransValidation records
          const validations = _buildValidations(rules, serviceId, amountField);
          if (validations.length > 0) {
            await db.collection('transvalidation').insertMany(validations, { session });
          }

          // 4. Tạo TransDefinition (glSteps + amountField)
          await db.collection('transdefinition').insertOne({
            service: serviceId,
            glSteps: glSteps,
            amountField: amountField, // lưu tên biến số tiền để Engine dùng nhất quán
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }, { session });
        });
      } finally {
        await session.endSession();
      }

      return res.ok(null, 'Lưu cấu hình Dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi lưu cấu hình dịch vụ:', error);

      // MongoDB duplicate key (code: 11000) khi dùng native driver
      if (error.code === 11000) {
        return res.error('BAD_REQUEST', 'Mã Dịch vụ (Code) này đã tồn tại!');
      }
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // Xem chi tiết Dịch vụ — dùng để load lại Form Edit
  detail: async function (req, res) {
    try {
      const { id } = req.body;
      if (!id) return res.error('BAD_REQUEST', 'Thiếu ID dịch vụ.');

      const service = await Service.findOne({ id });
      if (!service) return res.error('NOT_FOUND', 'Dịch vụ không tồn tại.');

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
          actionParams: service.actionParams || {},
          status: service.status,
        },
        fields: fields,
        validations: validations,
        accountingSteps: definition ? definition.glSteps : [],
      }, 'Lấy chi tiết dịch vụ thành công.');
    } catch (error) {
      sails.log.error('Lỗi lấy chi tiết dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // Cập nhật Dịch vụ — chỉ cho phép khi service đang INACTIVE (Maintenance Mode)
  update: async function (req, res) {
    try {
      const { id, serviceInfo, fields, rules, accountingSteps } = req.body;
      if (!id) return res.error('BAD_REQUEST', 'Thiếu ID dịch vụ.');

      // Kiểm tra tên biến Officer không trùng với biến hệ thống
      const conflict = _findReservedNameConflict(fields);
      if (conflict) {
        return res.error('BAD_REQUEST',
          `Tên biến "${conflict}" đã được hệ thống sử dụng. Vui lòng chọn tên khác.`
        );
      }

      // ── Maintenance Mode Guard ──────────────────────────────────────────────
      // Officer phải tắt dịch vụ trước khi được phép sửa cấu hình.
      const existingService = await Service.findOne({ id });
      if (!existingService) return res.error('NOT_FOUND', 'Dịch vụ không tồn tại.');

      if (existingService.status === 'active') {
        return res.error('BAD_REQUEST',
          'Dịch vụ đang hoạt động. Vui lòng tạm ngưng dịch vụ trước khi chỉnh sửa cấu hình.'
        );
      }
      // ───────────────────────────────────────────────────────────────────────

      const fieldBuilder = _buildFieldBuilder(fields, serviceInfo);
      const glSteps = _buildGlSteps(accountingSteps);

      const client = sails.getDatastore().manager.client;
      const db = client.db();
      const session = client.startSession();
      const { ObjectId } = require('mongodb');

      try {
        await session.withTransaction(async () => {
          // Xóa toàn bộ config cũ (delete-then-insert strategy)
          await db.collection('transfield').deleteMany({ service: id }, { session });
          await db.collection('transvalidation').deleteMany({ service: id }, { session });
          await db.collection('transdefinition').deleteMany({ service: id }, { session });

          // Cập nhật bảng Service (giữ nguyên status = inactive)
          await db.collection('service').updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                name: serviceInfo.serviceName,
                action: serviceInfo.action || 'none',
                actionParams: serviceInfo.actionParams || {},
                auth: { method: serviceInfo.authMethod },
                fee: { type: serviceInfo.feeType, value: Number(serviceInfo.feeValue) || 0 },
                fieldBuilder: fieldBuilder,
                updatedAt: Date.now(),
              }
            },
            { session }
          );

          // Tạo lại TransField
          const transFields = _buildTransFields(fields, id, serviceInfo);
          if (transFields.length > 0) {
            await db.collection('transfield').insertMany(transFields, { session });
          }

          // Tạo lại TransValidation
          const validations = _buildValidations(rules, id);
          if (validations.length > 0) {
            await db.collection('transvalidation').insertMany(validations, { session });
          }

          // Tạo lại TransDefinition
          await db.collection('transdefinition').insertOne({
            service: id,
            glSteps: glSteps,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }, { session });
        });
      } finally {
        await session.endSession();
      }

      return res.ok(null, 'Cập nhật cấu hình Dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi cập nhật cấu hình dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

  // Bật / Tắt trạng thái dịch vụ (Maintenance Mode)
  toggleStatus: async function (req, res) {
    try {
      const { id } = req.body;
      if (!id) return res.error('BAD_REQUEST', 'Thiếu ID dịch vụ.');

      const service = await Service.findOne({ id });
      if (!service) return res.error('NOT_FOUND', 'Dịch vụ không tồn tại.');

      const newStatus = service.status === 'active' ? 'inactive' : 'active';

      await Service.updateOne({ id }).set({ status: newStatus, updatedAt: Date.now() });

      const message = newStatus === 'inactive'
        ? 'Dịch vụ đã được tạm ngưng. Bạn có thể chỉnh sửa cấu hình.'
        : 'Dịch vụ đã được kích hoạt trở lại.';

      return res.ok({ id, status: newStatus }, message);
    } catch (error) {
      sails.log.error('Lỗi toggle trạng thái dịch vụ:', error);
      return res.error('SERVER_ERROR', 'Hệ thống đang bận.');
    }
  },

};
