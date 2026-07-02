module.exports = {
  /**
   * Thực hiện giao dịch — endpoint DUY NHẤT cho mọi loại service.
   * Engine tự đọc service.auth.method để quyết định luồng:
   *   - auth = 'NONE' → Request + Verify luôn (không cần PIN)
   *   - auth = 'PIN'  → Chỉ Request, trả transRefId để client xác thực PIN riêng
   */
  execute: async function (req, res) {
    try {
      const { serviceId, transData } = req.body;
      const userId = req.user.id;

      // Đọc cấu hình xác thực từ Service
      const service = await Service.findOne({ id: serviceId });
      if (!service) return res.badRequest({ message: 'Không tìm thấy dịch vụ.' });

      const authMethod = service.auth && service.auth.method ? service.auth.method : 'NONE';

      // Bước 1: Request — luôn chạy
      const reqResult = await TransactionEngine.engineRequestTransaction({
        serviceId,
        transData,
        userId,
        clientType: 'officer'
      });

      // Nếu auth = NONE → tự động chạy luôn Bước 3 (Verify)
      if (authMethod === 'NONE') {
        const verifyResult = await TransactionEngine.engineVerifyTransaction({
          transRefId: reqResult.transRefId,
          authCode: 'NONE',
          userId,
          clientType: 'officer'
        });
        return res.ok(verifyResult);
      }

      // Nếu auth = PIN → trả về preview, đợi client gọi /verify với mã PIN
      return res.ok({
        requireAuth: true,
        authMethod: authMethod,
        transRefId: reqResult.transRefId,
        preview: reqResult.preview
      });

    } catch (error) {
      sails.log.error(error);
      return res.badRequest({ message: error.message });
    }
  },

  /**
   * Xác thực giao dịch sau khi có mã PIN (gọi sau execute khi requireAuth = true)
   */
  verify: async function (req, res) {
    try {
      const { transRefId, authCode } = req.body;
      const userId = req.user.id;

      const verifyResult = await TransactionEngine.engineVerifyTransaction({
        transRefId,
        authCode,
        userId,
        clientType: 'officer'
      });

      return res.ok(verifyResult);
    } catch (error) {
      sails.log.error(error);
      return res.badRequest({ message: error.message });
    }
  },

  /**
   * Lấy danh sách giao dịch cho Officer
   */
  list: async function (req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const transRefIdFilter = req.body.transRefId;
      const serviceIdFilter = req.body.serviceId;

      const whereClause = {};
      if (transRefIdFilter) {
        whereClause.transRefId = transRefIdFilter;
      }
      if (serviceIdFilter) {
        whereClause.serviceId = { contains: serviceIdFilter };
      }

      const total = await Transaction.count(whereClause);
      const items = await Transaction.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách giao dịch thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerTransactionController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};