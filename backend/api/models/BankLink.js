/**
 * BankLink.js
 *
 * @description :: Hồ sơ Thẻ Ngân hàng đã liên kết của Khách hàng
 */

module.exports = {
  attributes: {
    customer: {
      model: 'customer',
      required: true
    },
    bank: {
      model: 'bank',
      required: true
    },
    cardNumber: {
      type: 'string',
      required: true
    },
    cardHolder: {
      type: 'string',
      required: true
    },
    status: {
      type: 'string',
      isIn: ['pending_otp', 'linked', 'unlinked'],
      defaultsTo: 'pending_otp'
    }
  }
};
