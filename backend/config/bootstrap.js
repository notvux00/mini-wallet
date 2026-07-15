module.exports.bootstrap = async function() {

  // Khởi tạo CronService (Tắt trong lúc chạy Test để tránh lỗi rò rỉ bộ nhớ & Consistency violation)
  const isTest = process.env.NODE_ENV === 'test' || (sails.config && sails.config.environment === 'test');
  if (sails.services.cronservice && !isTest) {
    sails.services.cronservice.init();
  }

  // Kiểm tra xem đã có Officer nào trong DB chưa
  const count = await Officer.count();
  if (count === 0) {
    const crypto = require('crypto');
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
    const defaultPassword = await sails.services.securityutil.hashText(initialPassword);
    
    await Officer.create({
      username: 'admin',
      passwordHash: defaultPassword,
      status: 'active'
    });
    
    if (process.env.INITIAL_ADMIN_PASSWORD) {
      sails.log.info('Đã khởi tạo tài khoản Officer mặc định: admin / (Mật khẩu từ biến môi trường INITIAL_ADMIN_PASSWORD)');
    } else {
      sails.log.warn('===============================================================');
      sails.log.warn('!!! KHỞI TẠO TÀI KHOẢN ADMIN VỚI MẬT KHẨU NGẪU NHIÊN !!!');
      sails.log.warn(`Username: admin`);
      sails.log.warn(`Password: ${initialPassword}`);
      sails.log.warn('VUI LÒNG ĐỔI MẬT KHẨU HOẶC LƯU LẠI MẬT KHẨU NÀY NGAY LẬP TỨC!');
      sails.log.warn('===============================================================');
    }
  }

};
