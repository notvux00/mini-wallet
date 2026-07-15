/**
 * ReconciliationReport.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  tableName: 'reconciliationreport',
  attributes: {
    runAt: {
      type: 'number',
      required: true,
      description: 'Thời điểm chạy đối soát (timestamp)'
    },
    totalCustomerBalance: {
      type: 'number',
      defaultsTo: 0,
      description: 'Tổng tiền trong ví Khách hàng'
    },
    totalSystemBalance: {
      type: 'number',
      defaultsTo: 0,
      description: 'Tổng tiền phí hệ thống đã thu'
    },
    totalBankBalance: {
      type: 'number',
      defaultsTo: 0,
      description: 'Tổng tiền trong ví Ngân hàng'
    },
    discrepancy: {
      type: 'number',
      defaultsTo: 0,
      description: 'Độ lệch (Nên là 0)'
    },
    tamperedPockets: {
      type: 'json',
      defaultsTo: [],
      description: 'Danh sách các ID ví bị sai Checksum'
    },
    status: {
      type: 'string',
      isIn: ['SUCCESS', 'FAILED'],
      defaultsTo: 'FAILED'
    },
    triggerBy: {
      type: 'string',
      defaultsTo: 'SYSTEM',
      description: 'SYSTEM hoặc ID của Officer'
    }
  },
};
