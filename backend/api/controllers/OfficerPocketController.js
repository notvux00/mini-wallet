module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const clientFilter = req.body.client;

      // Điều kiện tìm kiếm
      const whereClause = {};
      if (clientFilter) {
        whereClause.client = clientFilter; 
      }

      const total = await Pocket.count(whereClause);
      const items = await Pocket.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });



      return res.ok({ items, total, page, limit }, 'Lấy danh sách Ví điện tử thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerPocketController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  create: async function(req, res) {
    try {
        const { client, currency, balance, name } = req.body;

        // 1. Chỉ cho phép tạo loại ví system qua giao diện này (Ví bank sẽ được tạo tự động khi thêm Ngân hàng)
        if (client !== 'system') {
            return res.error(respCode.BAD_REQUEST, 'Chỉ được phép tạo ví Hệ thống (Ví Ngân hàng sẽ tự sinh khi bạn tạo Ngân hàng)!');
        }

        // 2. Tính checksum bảo mật (vì ví này không có User, ta dùng chính chữ 'system' hoặc 'bank' làm mã định danh phụ)
        const validChecksum = SecurityUtil.generatePocketChecksum(balance, client);

        // 3. Tạo ví trong database
        const newPocket = await Pocket.create({
            name: name,
            client: client,
            currency: currency,
            balance: balance,
            checksum: validChecksum,
            user: null, // Ví bank và hệ thống không có user cụ thể nào
            state: 'active',
            status: 'active',
        }).fetch();

        return res.ok(newPocket, 'Tạo Ví thành công!');
    } catch (error) {
        sails.log.error('Lỗi OfficerPocketController.create:', error);
        return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  toggleStatus: async function(req, res) {
    try {
        const { id } = req.body;

        const pocket = await Pocket.findOne({ id: id });

        if (!pocket) {
            return res.error(respCode.NOT_FOUND, 'Không tìm thấy Ví này!');
        }

        // Đảo ngược trạng thái
        const newStatus = pocket.status === 'active' ? 'inactive' : 'active';

        await Pocket.updateOne({ id: id }).set({ status: newStatus });

        return res.ok({ status: newStatus }, `Đã chuyển trạng thái Ví sang ${newStatus.toUpperCase()}`);
    } catch (error) {
        sails.log.error('Lỗi OfficerPocketController.toggleStatus:', error);
        return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  } 
};