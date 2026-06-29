module.exports = {

  attributes: {

    service: {
      type: 'string',
      required: true,
    },
    fieldName: {
      type: 'string',
      required: true,
    },
    fieldFormat: {
      type: 'string',
      isIn: ['string', 'number', 'objectId'],
    },
    minLength: {
      type: 'number',
      allowNull: true,
    },
    maxLength: {
      type: 'number',
      allowNull: true,
    },
    regex: {
      type: 'string',
      allowNull: true,
    },
    isRequired: {
      type: 'boolean',
      defaultsTo: true,
    },
    needSecured: {
      type: 'boolean',
      defaultsTo: false,
    },
    order: {
      type: 'number',
      required: true,
    },
    errorCode: {
      type: 'string',
      required: true,
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    }

  },

};

