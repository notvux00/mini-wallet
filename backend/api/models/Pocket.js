module.exports = {

  attributes: {

    user: {
      type: 'string',
      allowNull: true,
    },
    client: {
      type: 'string',
      isIn: ['customer', 'biller', 'system', 'bank'],
      required: true,
    },
    currency: {
      type: 'string',
      required: true,
    },
    balance: {
      type: 'number',
      defaultsTo: 0,
    },
    checksum: {
      type: 'string',
      allowNull: true,
    },
    state: {
      type: 'string',
      isIn: ['active', 'inProgress'],
      defaultsTo: 'active',
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    }
    
  },

};

