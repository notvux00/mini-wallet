module.exports = {
  list: async function(req, res) {
    try {
      // Chỉ lấy các Biller đang active
      const billers = await Biller.find({
        where: { status: 'active' }
      });

      return res.ok(billers, 'Lấy danh sách Nhà cung cấp thành công!');
    } catch (error) {
      sails.log.error('Lỗi CustomerBillerController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};