module.exports = {
  /**
   * Cash-in (Nạp tiền): Gọi từ Officer App
   * Vì Cash-in không cần mã PIN khách hàng, Officer thực hiện gom luôn Bước 1 và Bước 3.
   */
  cashin: async function (req, res) {
    try {
      const { serviceId, transData } = req.body;
      const userId = req.user.id; // ID của Officer từ JWT

      // Bước 1: Request
      const reqResult = await TransactionEngine.engineRequestTransaction({
        serviceId,
        transData,
        userId,
        clientType: 'officer'
      });

      const verifyResult = await TransactionEngine.engineVerifyTransaction({
        transRefId: reqResult.transRefId,
        authCode: 'NONE',
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