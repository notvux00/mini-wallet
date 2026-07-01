module.exports = {

  attributes: {

    service: {
      type: 'string',
      required: true,
    },
    validateFunc: {
      type: 'string',
      required: true,
    },
    validateFields: {
      type: 'string',
      required: true,
    },
    order: {
      type: 'number',
      required: true,
    },
    errorCode: {
      type: 'number',
      required: true,
    },
    errorMessage: {
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

