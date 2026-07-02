module.exports = {
  /**
   * BƯỚC 1: Gọi từ Customer App để tạo Giao dịch (Preview)
   */
  request: async function (req, res) {
    try {
      const { serviceId, transData } = req.body;
      const userId = req.user.id; // Từ JWT

      const result = await TransactionEngine.engineRequestTransaction({
        serviceId,
        transData,
        userId,
        clientType: 'customer'
      });

      return res.ok(result);
    } catch (error) {
      sails.log.error(error);
      return res.badRequest({ message: error.message });
    }
  },

  /**
   * BƯỚC 2: Gọi từ Customer App để xác nhận và nhận yêu cầu Auth
   */
  confirm: async function (req, res) {
    try {
      const { transRefId } = req.body;
      const userId = req.user.id;

      const result = await TransactionEngine.engineConfirmTransaction({
        transRefId,
        userId,
        clientType: 'customer'
      });

      return res.ok(result);
    } catch (error) {
      sails.log.error(error);
      return res.badRequest({ message: error.message });
    }
  },

  /**
   * BƯỚC 3: Gọi từ Customer App để điền mã PIN và thực thi
   */
  verify: async function (req, res) {
    try {
      const { transRefId, authCode } = req.body;
      const userId = req.user.id;

      const result = await TransactionEngine.engineVerifyTransaction({
        transRefId,
        authCode,
        userId,
        clientType: 'customer'
      });

      return res.ok(result);
    } catch (error) {
      sails.log.error(error);
      return res.badRequest({ message: error.message });
    }
  },

  /**
   * Lấy lịch sử giao dịch của Customer
   */
  history: async function (req, res) {
    try {
      const userId = req.user.id;
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;

      const pocket = await Pocket.findOne({ user: userId });
      if (!pocket) {
        return res.ok({ items: [], total: 0, page, limit }, 'Chưa có giao dịch');
      }

      const whereClause = {
        or: [
          { sender: pocket.id },
          { receiver: pocket.id }
        ]
      };

      const total = await Transaction.count(whereClause);
      const rawItems = await Transaction.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      // Lấy tên service cho từng giao dịch
      const items = await Promise.all(rawItems.map(async tx => {
        let serviceName = 'Unknown Service';
        if (tx.serviceId) {
          const service = await Service.findOne({ id: tx.serviceId });
          if (service) {
            serviceName = service.name;
          }
        }
        return {
          ...tx,
          serviceName
        };
      }));

      return res.ok({ items, total, page, limit });
    } catch (error) {
      sails.log.error('Lỗi CustomerTransactionController.history:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};
