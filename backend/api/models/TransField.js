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
    isRequired: {
      type: 'boolean',
      defaultsTo: true,
    },
    order: {
      type: 'number',
      required: true,
    },
    errorCode: {
      type: 'number',
      allowNull: true,
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


