module.exports = {
  list: async function(req, res) {
    try {
      const cacheKey = 'CACHE:CUSTOMER:BILLERS';
      
      // Thử lấy từ cache trước
      const cached = await RedisService.get(cacheKey);
      if (cached) {
        try {
          return res.ok(JSON.parse(cached), 'Lấy danh sách Nhà cung cấp thành công! (Cached)');
        } catch (e) {
          sails.log.warn('Lỗi parse JSON cache Biller, sẽ fetch lại từ DB.');
        }
      }

      // Chỉ lấy các Biller đang active
      const billers = await Biller.find({
        where: { status: 'active' }
      });

      // Lưu vào cache với TTL = 3600 giây (1 giờ)
      await RedisService.set(cacheKey, JSON.stringify(billers), 3600);

      return res.ok(billers, 'Lấy danh sách Nhà cung cấp thành công!');
    } catch (error) {
      sails.log.error('Lỗi CustomerBillerController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};