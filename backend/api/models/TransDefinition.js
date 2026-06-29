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
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    }

  },

};

