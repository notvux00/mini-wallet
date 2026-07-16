const cron = require('node-cron');

module.exports.bootstrap = async function() {

  // Setup system wallets
  const sysPocketCount = await Pocket.count({ client: 'system' });
  if (sysPocketCount === 0) {
    const checksum = SecurityUtil.generatePocketChecksum(0, 'SYS_FEE');
    await Pocket.create({ user: 'SYS_FEE', client: 'system', name: 'System Fee', currency: 'VND', balance: 0, checksum, status: 'active' });
  }

  // Setup cronjob cho Đối soát tự động (Chạy vào 23:59:59 hàng ngày)
  cron.schedule('59 59 23 * * *', async () => {
    try {
      sails.log.info('Bắt đầu chạy Cronjob Đối soát Tự động...');
      await sails.helpers.runReconciliation.with({ triggerBy: 'SYSTEM' });
    } catch (err) {
      sails.log.error('Lỗi Cronjob Đối soát:', err);
    }
  });

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
