module.exports = {

  attributes: {

    service: {
      type: 'string',
      required: true,
      unique: true,
    },
    glSteps: {
      type: 'json',
      defaultsTo: [],
    },
    amountField: {
      type: 'string',
      defaultsTo: 'AMOUNT',
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    }

  },

};
