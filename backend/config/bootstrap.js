module.exports.bootstrap = async function() {

  // Kiểm tra xem đã có Officer nào trong DB chưa
  const count = await Officer.count();
  if (count === 0) {
    // Nếu chưa có, nhờ Máy soi băm cái mật khẩu mặc định
    const defaultPassword = await sails.services.securityutil.hashText('admin123'); // sails tự biến file thành chữ thường
    
    await Officer.create({
      username: 'admin',
      passwordHash: defaultPassword,
      status: 'active'
    });
    sails.log.info('Đã khởi tạo tài khoản Officer mặc định: admin / admin123');
  }

};
