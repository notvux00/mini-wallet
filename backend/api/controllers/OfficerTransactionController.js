module.exports = {
  list: async function(req, res) {
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
        sort: 'createdAt DESC', // Xếp mới nhất lên đầu
        skip: skip,
        limit: limit
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Biên lai Giao dịch thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerTransactionController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};