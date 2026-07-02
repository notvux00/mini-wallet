module.exports = {
  /**
   * BƯỚC 1: REQUEST TRANSACTION
   * @param {Object} input
   * @param {String} input.serviceId
   * @param {Object} input.transData - Dữ liệu client gửi lên (payload)
   * @param {String} input.userId - ID của user/officer thực hiện
   * @param {String} input.clientType - 'customer' | 'officer'
   * @param {String} input.pocketId - (Optional) Pocket ID của user/officer thao tác
   */
  engineRequestTransaction: async function (input) {
    sails.log.info('TransactionEngine.engineRequestTransaction started', { serviceId: input.serviceId, userId: input.userId });
    input.TRANSTEP = 1;
    return await NeonMessage.routeProcess(input);
  },

  /**
   * BƯỚC 2: CONFIRM TRANSACTION
   * @param {Object} input
   * @param {String} input.transRefId
   * @param {String} input.userId
   * @param {String} input.clientType
   */
  engineConfirmTransaction: async function (input) {
    sails.log.info('TransactionEngine.engineConfirmTransaction started', { transRefId: input.transRefId });
    input.TRANSTEP = 2;
    return await NeonMessage.routeProcess(input);
  },

  /**
   * BƯỚC 3: VERIFY TRANSACTION
   * @param {Object} input
   * @param {String} input.transRefId
   * @param {String} input.authCode - (PIN / OTP)
   * @param {String} input.userId
   * @param {String} input.clientType
   */
  engineVerifyTransaction: async function (input) {
    sails.log.info('TransactionEngine.engineVerifyTransaction started', { transRefId: input.transRefId });
    input.TRANSTEP = 3;
    return await NeonMessage.routeProcess(input);
  }
};
