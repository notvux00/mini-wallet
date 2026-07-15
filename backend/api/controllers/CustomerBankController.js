
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

      // Tạo OTP ngẫu nhiên 6 số
      const otp = SecurityUtil.generateRandomNumber(6);
      
      // Lưu vào Redis (TTL = 5 phút)
      const otpKey = `bank_otp:${linkId}`;
      const lockSuccess = await RedisService.setnx(otpKey, otp, 300);
      if (!lockSuccess) {
        throw new Error('Hệ thống bận hoặc mã OTP của yêu cầu này vẫn còn hiệu lực. Vui lòng thử lại sau.');
      }
      
      // Gửi OTP (Giả lập in ra console)
      sails.log.info(`[SMS-MOCK] OTP liên kết thẻ ${cardNumber} của user ${customerId} là: ${otp}`);

      return res.ok({ linkId: linkId, _devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined }, 'Yêu cầu liên kết thành công. Vui lòng nhập mã OTP vừa được gửi đến số điện thoại của bạn.');
    } catch (error) {
      sails.log.error('Lỗi requestLink:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  verifyLink: async function(req, res) {
    try {
      const { linkId, otp } = req.body;
      const customerId = req.user.id;

      // Xác thực ownership trước khi đụng vào OTP
      const link = await BankLink.findOne({ id: linkId, customer: customerId });
      if (!link || link.status !== 'pending_otp') {
        return res.error(respCode.NOT_FOUND, 'Không tìm thấy yêu cầu liên kết hợp lệ!');
      }

      const otpKey = `bank_otp:${linkId}`;
      const failKey = `bank_otp_fail:${linkId}`;
      
      const result = await RedisService.verifyOtpAtomic(otpKey, failKey, otp, 5);

      if (result === 'NOT_FOUND' || result === 'ERROR') {
        return res.error(respCode.BAD_REQUEST, 'Mã OTP không chính xác hoặc đã hết hạn!');
      }

      if (result === 'EXCEEDED') {
        return res.error(respCode.BAD_REQUEST, 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy, vui lòng yêu cầu mã mới.');
      }

      if (result === 'MISMATCH') {
        return res.error(respCode.BAD_REQUEST, 'Mã OTP không chính xác hoặc đã hết hạn!');
      }

      // result === 'MATCH'

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
