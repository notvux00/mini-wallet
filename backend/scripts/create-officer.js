module.exports = {

  friendlyName: 'Tạo tài khoản Officer',
  description: 'Công cụ CLI để khởi tạo nhanh tài khoản vận hành.',

  // Khai báo các tham số bắt buộc phải gõ vào Terminal
  inputs: {
    username: {
      type: 'string',
      required: true
    },
    password: {
      type: 'string',
      required: true
    }
  },

  // Hàm thực thi chính khi gõ lệnh
  fn: async function(inputs) {
    sails.log.info(`Bắt đầu quy trình tạo Officer: ${inputs.username}...`);

    // 1. Kiểm tra xem username bị trùng không
    const existingOfficer = await Officer.findOne({ username: inputs.username });
    if (existingOfficer) {
      sails.log.error(`Thất bại! Tài khoản "${inputs.username}" đã tồn tại trong Database.`);
      // Thoát script ngay lập tức
      return;
    }

    // 2. Nhờ máy soi băm mật khẩu
    // Lưu ý: Trong scripts, gọi các file ở services phải qua object toàn cục `sails.services.tênfileviếtthường`
    const hashedPassword = await sails.services.securityutil.hashText(inputs.password);

    // 3. Ném vào DB
    await Officer.create({
      username: inputs.username,
      passwordHash: hashedPassword,
      status: 'active'
    });

    sails.log.info(`✅ Thành công! Đã cấp phát tài khoản: ${inputs.username}`);
  }

};

// sails run create-officer --username=ketoan01 --password=matkhau123 để tạo