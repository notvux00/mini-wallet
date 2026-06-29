module.exports = {

  register: async function(req, res) {
    try {
      const { phone, name, password, pin } = req.body;
      
      // 1. Kiểm tra đầu vào: Số điện thoại đã tồn tại chưa?
      const existingUser = await Customer.findOne({ phone: phone });
      if (existingUser) {
        return res.error(respCode.BAD_REQUEST, 'Số điện thoại đã được đăng ký!');
      }

      // 2. Băm mật khẩu và mã PIN (Không bao giờ lưu đồ chưa băm xuống DB)
      const passwordHash = await SecurityUtil.hashText(password);
      const pinHash = await SecurityUtil.hashText(pin);

      // 3. Tạo một cái Ví rỗng trước (Lúc này chưa có userId nên checksum để tạm)
      const newPocket = await Pocket.create({
        client: 'customer',
        currency: 'VND',
        balance: 0,
        checksum: 'TEMP' // Sẽ tính lại ngay bước sau
      }).fetch();

      // 4. Tạo User và móc cái ID của Ví vừa tạo vào
      const newCustomer = await Customer.create({
        phone: phone,
        name: name,
        passwordHash: passwordHash,
        pinHash: pinHash,
        pocket: newPocket.id
      }).fetch();

      // 5. Cập nhật lại cái Ví: Điền ID User vào và tính Checksum xịn
      const validChecksum = SecurityUtil.generatePocketChecksum(0, newCustomer.id);
      await Pocket.updateOne({ id: newPocket.id }).set({
        user: newCustomer.id,
        checksum: validChecksum
      });

      // 6. Thành công! Trả về data (Chú ý: Giấu nhẹm passwordHash và pinHash đi)
      return res.ok({
        id: newCustomer.id,
        phone: newCustomer.phone,
        name: newCustomer.name,
        pocketId: newPocket.id
      }, 'Đăng ký tài khoản thành công!');

    } catch (error) {
      // Log ra console để Dev đọc, còn Frontend thì chỉ nhận lỗi chung chung 500
      sails.log.error('Lỗi API Register:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận, vui lòng thử lại sau.');
    }
  },

  login: async function(req, res) {
    try {
      const { phone, password } = req.body;

      // 1. Tìm xem khách có tồn tại không
      const customer = await Customer.findOne({ phone: phone });
      
      // Khúc này dùng trick bảo mật: Khách sai số điện thoại hay sai mật khẩu 
      // thì đều báo chung 1 câu lỗi "INVALID_CREDENTIALS". 
      // Đừng báo "Số điện thoại không tồn tại", Hacker sẽ biết để rà xem số nào có đăng ký ví.
      if (!customer) {
        return res.error(respCode.INVALID_CREDENTIALS, 'Số điện thoại hoặc mật khẩu không đúng!');
      }

      // 2. Lôi máy soi bcrypt ra so sánh mật khẩu khách nhập với cái Hash trong DB
      const isMatch = await SecurityUtil.compareText(password, customer.passwordHash);
      if (!isMatch) {
        return res.error(respCode.INVALID_CREDENTIALS, 'Số điện thoại hoặc mật khẩu không đúng!');
      }

      // 3. Đúng người rồi! Gói thông tin lại và đóng dấu niêm phong (Ký Token)
      const payload = {
        id: customer.id,
        role: 'customer' // Lưu lại role để biết đây là Khách, không phải Officer
      };
      
      const token = SecurityUtil.generateToken(payload);

      // 4. Trả thẻ thông hành về cho khách
      return res.ok({
        token: token,
        user: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          role: 'customer',
        }
      }, 'Đăng nhập thành công!');

    } catch (error) {
      sails.log.error('Lỗi API Login:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận, vui lòng thử lại sau.');
    }
  },

  // Lấy thông tin Customer
  getMe: async function(req, res) {
    try {
      const userId = req.user.id;
      
      const userData = await Customer.findOne({ id: userId });
      if (!userData) {
        return res.error(respCode.NOT_FOUND, 'Không tìm thấy thông tin khách hàng!');
      }

      return res.ok({
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: 'customer'
      }, 'Lấy thông tin thành công!');

    } catch (error) {
      sails.log.error('Lỗi getMe Customer:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }

};