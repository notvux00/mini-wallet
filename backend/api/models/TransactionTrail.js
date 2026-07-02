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
    transStep: {
      type: 'number',
      required: true,
    },
    status: {
      type: 'string',
      isIn: ['init', 'pending', 'done', 'failed'],
      defaultsTo: 'init',
    },
    createdBy: {
      type: 'string',
    },
    clientType: {
      type: 'string',
    },
    totalAmount: {
      type: 'number',
    },
    inputMessage: {
      type: 'json',
      defaultsTo: {},
    },
    outputMessage: {
      type: 'json',
      defaultsTo: {},
    },
    transStepLog: {
      type: 'json',
      defaultsTo: [],
    }
  },

};

