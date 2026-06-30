module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const statusFilter = req.body.status; // Admin có thể lọc Biller đang active/inactive
      const searchKeyword = req.body.search;

      // Điều kiện tìm kiếm
      const whereClause = {};
      if (statusFilter) {
        whereClause.status = statusFilter; 
      }
      if (searchKeyword) {
        whereClause.or = [
          { code: { contains: searchKeyword } },
          { name: { contains: searchKeyword } }
        ];
      }

      const total = await Biller.count(whereClause);
      const items = await Biller.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Nhà cung cấp thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerBillerController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  create: async function(req, res) {
    try {
        const {code, name, inquiryUrl, paymentUrl} = req.body;

        // 1. Kiểm tra mã Biller đã tồn tại chưa
        const existingBiller = await Biller.findOne({ code: code });
        if (existingBiller) {
            return res.error(respCode.BAD_REQUEST, 'Mã Biller này đã tồn tại!');
        }

        // 2. Tạo một Pocket rỗng cho Biller này trước
        const newPocket = await Pocket.create({
            client: 'biller',
            currency: 'VND',
            balance: 0,
            checksum: 'TEMP'
        }).fetch();

        // 3. Tạo record Biller, móc ID của pocket vừa tạo vào
        const newBiller = await Biller.create({
            code: code,
            name: name,
            inquiryUrl: inquiryUrl,
            paymentUrl: paymentUrl,
            pocket: newPocket.id,
            status: 'active'
        }).fetch();

        // 4. Cập nhật lại Pocket bao gồm user và checksum
        const validChecksum = SecurityUtil.generatePocketChecksum(0, newBiller.id);
        await Pocket.updateOne({ id: newPocket.id }).set({
            user: newBiller.id,
            checksum: validChecksum,
        });

        return res.ok(newBiller, 'Tạo Biller thành công!');
    } catch (error) {
        sails.log.error('Lỗi OfficerBillerController.create:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  toggleStatus: async function(req, res) {
    try {
        const { id } = req.body;

        const biller = await Biller.findOne({ id: id });
        if (!biller) {
            return res.error(respCode.NOT_FOUND, 'Không tìm thấy Biller này!');
        }

        // Đảo ngược trạng thái
        const newStatus = biller.status === 'active' ? 'inactive' : 'active';

        // 1. Cập nhật trạng thái biller
        await Biller.updateOne({ id: id }).set({ status: newStatus });

        // 2. Cập nhật luôn trạng thái của Pocket đi theo Biller đó
        if (biller.pocket) {
            await Pocket.updateOne({ id: biller.pocket }).set({ status: newStatus });
        }

        return res.ok({ status: newStatus }, `Đã đổi trạng thái thành ${newStatus.toUpperCase()}`);
    } catch (error) {
        sails.log.error('Lỗi OfficerBillerController.toggleStatus:', error);
        return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};