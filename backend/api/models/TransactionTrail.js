module.exports = {

  attributes: {

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

