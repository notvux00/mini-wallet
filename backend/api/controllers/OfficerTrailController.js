module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const statusFilter = req.body.status; 
      const transRefIdFilter = req.body.transRefId;
      const serviceIdFilter = req.body.serviceId;

      const whereClause = {};
      if (statusFilter) {
        whereClause.status = statusFilter;
      }
      if (transRefIdFilter) {
        whereClause.id = transRefIdFilter;
      }
      if (serviceIdFilter) {
        whereClause.serviceId = { contains: serviceIdFilter };
      }

      const total = await TransactionTrail.count(whereClause);
      const items = await TransactionTrail.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      const serviceIds = [...new Set(items.map(item => String(item.serviceId)))];
      const services = await Service.find({ id: serviceIds });
      const serviceMap = {};
      services.forEach(s => { serviceMap[String(s.id)] = s.code; });

      const formattedItems = items.map(item => {
        const obj = item.toJSON ? item.toJSON() : item;
        return {
          ...obj,
          serviceId: serviceMap[String(obj.serviceId)] || obj.serviceId
        };
      });

      return res.ok({ items: formattedItems, total, page, limit }, 'Lấy danh sách Dấu vết giao dịch thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerTrailController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};