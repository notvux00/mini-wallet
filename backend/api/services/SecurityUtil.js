const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = {

  // 1. NHÓM HÀM XỬ LÝ MẬT KHẨU / PIN (BCRYPT)
  // Băm mật khẩu hoặc mã PIN gốc thành chuỗi không thể dịch ngược
  hashText: async function(plainText) {
    const rounds = sails.config.custom.bcryptSaltRounds;
    return await bcrypt.hash(plainText.toString(), rounds);
  },

  // So sánh mật khẩu khách nhập vào với chuỗi hash trong DB
  compareText: async function(plainText, hashedText) {
    return await bcrypt.compare(plainText.toString(), hashedText);
  },


  // 2. NHÓM HÀM CHECKSUM VÍ (BẢO VỆ SỐ DƯ)
  // Tạo mã MD5 bảo vệ số dư ví.
  generatePocketChecksum: function(balance, userId) {
    const salt = sails.config.custom.pocketSalt;
    const balanceStr = Number(balance).toString();
    const userStr = userId ? String(userId) : 'SYSTEM_WALLET';
    
    return crypto.createHash('md5').update(`${balanceStr}_${userStr}_${salt}`).digest('hex');
  },


  // 3. NHÓM HÀM JSON WEB TOKEN (ĐĂNG NHẬP)
  // Ký và tạo ra một JWT Token khi đăng nhập thành công
  generateToken: function(payload) {
    const secret = sails.config.custom.jwtSecret;
    return jwt.sign(payload, secret, { expiresIn: '1d' });
  },

  //Dịch ngược Token gửi lên từ Client xem có hợp lệ hay không
  verifyToken: function(token) {
    const secret = sails.config.custom.jwtSecret;
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('INVALID_TOKEN');
    }
  }

};