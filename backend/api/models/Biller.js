module.exports = {

  attributes: {

    code: {
      type: 'string',
      required: true,
      unique: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    inquiryUrl: {
      type: 'string',
      required: true,
    },
    paymentUrl: {
      type: 'string',
      required: true,
    },
    pocket: {
      type: 'string',
      allowNull: true,
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    },
    inqReqKeyCustomer: {
      type: 'string',
      defaultsTo: 'customerCode',
    },
    inqReqKeyBiller: {
      type: 'string',
      defaultsTo: 'billerCode',
    },
    inquiryResMappingAmount: {
      type: 'string',
      defaultsTo: 'data.amountOwed',
    },
    inquiryResMappingBillRef: {
      type: 'string',
      defaultsTo: 'data.billRef',
    },
    payReqKeyCustomer: {
      type: 'string',
      defaultsTo: 'customerCode',
    },
    payReqKeyAmount: {
      type: 'string',
      defaultsTo: 'amount',
    },
    payReqKeyBillRef: {
      type: 'string',
      defaultsTo: 'billRef',
    },
    payResMappingStatus: {
      type: 'string',
      defaultsTo: 'status',
    },
    payResMappingSuccessValue: {
      type: 'string',
      defaultsTo: 'success',
    }

  },

};
