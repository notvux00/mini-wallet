
const crypto = require('crypto');


module.exports = {
  requestLink: async function(req, res) {
    try {
      const { bankId, cardNumber, cardHolder } = req.body;
      const customerId = req.user.id;

      if (!bankId || !cardNumber || !cardHolder) {
        return res.error(respCode.BAD_REQUEST, 'Vui lòng nhập đủ thông tin thẻ');
      }

      // Check if already linked
      const existing = await BankLink.findOne({
        customer: customerId,
        bank: bankId,
        cardNumber: cardNumber,
        status: ['linked', 'pending_otp']
      });

      if (existing && existing.status === 'linked') {
        return res.error(respCode.BAD_REQUEST, 'Thẻ này đã được liên kết!');
      }

      let linkId;
      if (existing && existing.status === 'pending_otp') {
        linkId = existing.id;
      } else {
        const newLink = await BankLink.create({
          customer: customerId,
          bank: bankId,
          cardNumber: cardNumber,
          cardHolder: cardHolder,
          status: 'pending_otp'
        }).fetch();
        linkId = newLink.id;
      }

      // Giả lập gửi OTP
      return res.ok({ linkId: linkId }, 'Yêu cầu liên kết thành công. Vui lòng nhập OTP (123456).');
    } catch (error) {
      sails.log.error('Lỗi requestLink:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  verifyLink: async function(req, res) {
    try {
      const { linkId, otp } = req.body;
      const customerId = req.user.id;

      if (otp !== '123456') {
        return res.error(respCode.BAD_REQUEST, 'Mã OTP không chính xác!');
      }

      const link = await BankLink.findOne({ id: linkId, customer: customerId });
      if (!link) {
        return res.error(respCode.NOT_FOUND, 'Không tìm thấy yêu cầu liên kết');
      }

      await BankLink.updateOne({ id: linkId }).set({ status: 'linked' });
      return res.ok({}, 'Liên kết thẻ thành công!');
    } catch (error) {
      sails.log.error('Lỗi verifyLink:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  list: async function(req, res) {
    try {
      const customerId = req.user.id;
      const links = await BankLink.find({ customer: customerId, status: 'linked' }).populate('bank');
      const banks = await Bank.find({ status: 'active' });

      return res.ok({ links, banks }, 'Thành công');
    } catch (error) {
      sails.log.error('Lỗi list links:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  unlink: async function(req, res) {
    try {
      const { linkId } = req.body;
      const customerId = req.user.id;
      await BankLink.updateOne({ id: linkId, customer: customerId }).set({ status: 'unlinked' });
      return res.ok({}, 'Đã hủy liên kết thẻ');
    } catch (error) {
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};
