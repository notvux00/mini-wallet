module.exports = {

  attributes: {
    name: {
      type: 'string',
    },
    username: {
      type: 'string',
      required: true,
      unique: true,
    },
    passwordHash: {
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

