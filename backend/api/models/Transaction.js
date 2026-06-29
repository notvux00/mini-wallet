module.exports = {

  attributes: {

    transRefId: {
      type: 'string',
      required: true,
      unique: true,
    },
    serviceId: {
      type: 'string',
      required: true,
    },
    sender: {
      type: 'string',
      required: true,
    },
    receiver: {
      type: 'string',
      required: true,
    },
    amount: {
      type: 'number',
      required: true,
    },
    fee: {
      type: 'number',
      defaultsTo: 0,
    },
    totalAmount: {
      type: 'number',
      required: true,
    },
    billerRefId: {
      type: 'string',
      allowNull: true,
    },
    status: {
      type: 'string',
      defaultsTo: 'done',
    },

  },

};

