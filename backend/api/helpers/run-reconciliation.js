const SecurityUtil = require('../services/SecurityUtil');

module.exports = {
  friendlyName: 'Run reconciliation',
  description: 'Thực hiện kiểm tra tính toàn vẹn (đối soát) trên toàn bộ các ví trong hệ thống.',

  inputs: {
    triggerBy: {
      type: 'string',
      defaultsTo: 'SYSTEM',
      description: 'SYSTEM hoặc ID của Officer'
    }
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function (inputs) {
    try {
      const pockets = await Pocket.find();
      
      let totalCustomerBalance = 0;
      let totalSystemBalance = 0;
      let totalBankBalance = 0;
      
      let sumBalance = 0;
      const tamperedPockets = [];

      for (const pocket of pockets) {
        sumBalance += pocket.balance;
        
        if (pocket.client === 'customer') {
          totalCustomerBalance += pocket.balance;
        } else if (pocket.client === 'system') {
          totalSystemBalance += pocket.balance;
        } else if (pocket.client === 'bank') {
          totalBankBalance += pocket.balance;
        }

        // Verify Checksum
        const expectedChecksum = SecurityUtil.generatePocketChecksum(pocket.balance, pocket.user);
        const isValid = (expectedChecksum === pocket.checksum);
        if (!isValid) {
          tamperedPockets.push(pocket.id);
        }
      }

      const discrepancy = sumBalance;
      const status = (discrepancy === 0 && tamperedPockets.length === 0) ? 'SUCCESS' : 'FAILED';

      const report = await ReconciliationReport.create({
        runAt: Date.now(),
        totalCustomerBalance,
        totalSystemBalance,
        totalBankBalance,
        discrepancy,
        tamperedPockets,
        status,
        triggerBy: inputs.triggerBy
      }).fetch();

      // Nếu có lỗi nghiêm trọng, có thể log riêng hoặc gửi thông báo.
      if (status === 'FAILED') {
        sails.log.error('!!! RECONCILIATION FAILED !!!', report);
      } else {
        sails.log.info('--- RECONCILIATION SUCCESS ---', report);
      }

      return report;
    } catch (error) {
      sails.log.error('Lỗi khi chạy đối soát:', error);
      throw error;
    }
  }
};
