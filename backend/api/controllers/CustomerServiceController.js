/**
 * CustomerServiceController
 * Cung cấp danh sách service active cho Customer App.
 * Customer chỉ thấy service đang active, không thấy config nội bộ.
 */
module.exports = {

  /**
   * Lấy danh sách service active cho Customer chọn khi giao dịch.
   * Có thể filter theo action type (VD: action=none cho P2P, action=billerTrans cho Bill).
   */
  list: async function (req, res) {
    try {
      const { action } = req.body; // optional filter

      const whereClause = { status: 'active' };
      if (action !== undefined) whereClause.action = action;

      const services = await Service.find(whereClause).sort('name ASC');

      // Chỉ trả về thông tin cần thiết, không expose fieldBuilder nội bộ
      const result = services.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        action: s.action,
        authMethod: s.auth && s.auth.method ? s.auth.method : 'NONE',
        fee: s.fee,
      }));

      return res.ok(result, 'Lấy danh sách dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi CustomerServiceController.list:', error);
      return res.badRequest({ message: 'Không thể lấy danh sách dịch vụ.' });
    }
  }

};
