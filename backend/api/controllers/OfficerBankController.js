module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;

      const total = await Bank.count();
      const items = await Bank.find({
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      }).populate('pocket');

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Ngân hàng thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerBankController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  create: async function(req, res) {
    try {
      const { code, name } = req.body;
      
      if (!code || !name) {
        return res.error(respCode.BAD_REQUEST, 'Vui lòng nhập Mã và Tên Ngân hàng');
      }

      // 1. Kiểm tra tồn tại
      const existing = await Bank.findOne({ code: code });
      if (existing) {
        return res.error(respCode.BAD_REQUEST, 'Mã Ngân hàng này đã tồn tại!');
      }

      // 2. Tạo một Pocket cho Ngân hàng
      const newPocket = await Pocket.create({
        client: 'bank',
        currency: 'VND',
        balance: 0,
        checksum: 'TEMP' // Sẽ được cập nhật sau nếu có logic
      }).fetch();

      // Fix checksum for the new pocket
      const crypto = require('crypto');
      const hashStr = `${newPocket.id}|${newPocket.client}|${newPocket.currency}|${newPocket.balance}`;
      const checksum = crypto.createHash('md5').update(hashStr).digest('hex');
      await Pocket.updateOne({ id: newPocket.id }).set({ checksum: checksum });

      // 3. Tạo Bank map với Pocket
      const newBank = await Bank.create({
        code: code,
        name: name,
        pocket: newPocket.id
      }).fetch();

      return res.ok(newBank, 'Tạo Ngân hàng mới thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerBankController.create:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};
