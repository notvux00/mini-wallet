module.exports = {

  attributes: {

    code: {
      type: 'string',
      required: true,
      unique: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    action: {
      type: 'string',
      isIn: ['none', 'billerTrans'],
      defaultsTo: 'none',
    },
    actionParams: {
      type: 'json',
      defaultsTo: {},
    },
    fieldBuilder: {
      type: 'json',
      defaultsTo: {},
    },
    fee: {
      type: 'json',
      defaultsTo: {},
    },
    auth: {
      type: 'json',
      defaultsTo: {},
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active',
    }

  },

};

