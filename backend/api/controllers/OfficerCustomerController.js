module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const phoneFilter = req.body.phone; // Admin có thể tìm khách theo SĐT

      // Điều kiện tìm kiếm
      const whereClause = {};
      if (phoneFilter) {
        whereClause.phone = { contains: phoneFilter }; 
      }

      // Đếm tổng số lượng để Frontend làm phân trang
      const total = await Customer.count(whereClause);
      
      // Truy vấn dữ liệu thực tế
      const items = await Customer.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      // Join dữ liệu ví thủ công (vì thuộc tính pocket định dạng string)
      const pocketIds = items.map(item => item.pocket).filter(id => id);
      const pockets = await Pocket.find({ id: pocketIds });
      
      items.forEach(item => {
        const pocketObj = pockets.find(p => p.id === item.pocket);
        item.pocket = pocketObj || { id: item.pocket, balance: 0 };
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Khách hàng thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerCustomerController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};