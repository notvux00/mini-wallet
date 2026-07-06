module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const statusFilter = req.body.status; 
      const transRefIdFilter = req.body.transRefId;
      const debitFilter = req.body.debit;
      const creditFilter = req.body.credit;

      const whereClause = {};
      if (statusFilter) {
        whereClause.status = statusFilter;
      }
      if (transRefIdFilter) {
        whereClause.transRefId = transRefIdFilter;
      }
      if (debitFilter) {
        whereClause.debit = { contains: debitFilter };
      }
      if (creditFilter) {
        whereClause.credit = { contains: creditFilter };
      }

      const total = await PocketEntry.count(whereClause);
      const items = await PocketEntry.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Bút toán (Pocket Entries) thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerPocketEntryController.list:', error);
      return res.error(500, 'Hệ thống đang bận.');
    }
  }
};
