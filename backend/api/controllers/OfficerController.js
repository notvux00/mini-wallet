module.exports = {

  login: async function(req, res) {
    try {
      const { username, password } = req.body;

      // 1. Tìm Officer theo username
      const officer = await Officer.findOne({ username: username });
      if (!officer) {
        return res.error(respCode.INVALID_CREDENTIALS, 'Tài khoản hoặc mật khẩu không đúng!');
      }

      // 2. So sánh mật khẩu
      const isMatch = await SecurityUtil.compareText(password, officer.passwordHash);
      if (!isMatch) {
        return res.error(respCode.INVALID_CREDENTIALS, 'Tài khoản hoặc mật khẩu không đúng!');
      }

      // 3. Ký Token với thẻ là 'officer'
      const payload = {
        id: officer.id,
        role: 'officer' // Đóng dấu cấp bậc Admin!
      };
      const token = SecurityUtil.generateToken(payload);

      // 4. Trả về đúng quy tắc: (data, message)
      return res.ok(
        { 
          token: token, 
          user: {
            id: officer.id,
            username: officer.username,
            role: 'officer' } 
        },
        'Đăng nhập quản trị viên thành công!'
      );

    } catch (error) {
      sails.log.error('Lỗi Officer Login:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  // Lấy thông tin Officer (Phương thức POST)
  getMe: async function(req, res) {
    try {
      const userId = req.user.id;
      
      const userData = await Officer.findOne({ id: userId });
      if (!userData) {
        return res.error(respCode.NOT_FOUND, 'Không tìm thấy thông tin quản trị viên!');
      }

      return res.ok({
        id: userData.id,
        username: userData.username,
        role: 'officer'
      }, 'Lấy thông tin thành công!');

    } catch (error) {
      sails.log.error('Lỗi getMe Officer:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }

};