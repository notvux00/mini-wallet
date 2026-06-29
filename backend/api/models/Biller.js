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
    }

  },

};

