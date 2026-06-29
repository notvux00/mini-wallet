module.exports = {

  attributes: {

    phone: {
      type: 'string',
      required: true,
      unique: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    passwordHash: {
      type: 'string',
      required: true,
    },
    pinHash: {
      type: 'string',
      required: true,
    },
    pocket: {
      type: 'string',
      required: true,
    }
    
  },

};

