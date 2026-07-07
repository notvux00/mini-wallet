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
    sender: {
      type: 'string',
      required: true,
    },
    receiver: {
      type: 'string',
      required: true,
    },
    amount: {
      type: 'number',
      required: true,
    },
    fee: {
      type: 'number',
      defaultsTo: 0,
    },
    totalAmount: {
      type: 'number',
      required: true,
    },
    billerRefId: {
      type: 'string',
      allowNull: true,
    },
    status: {
      type: 'string',
      defaultsTo: 'done',
    },
    description: {
      type: 'string',
      allowNull: true,
    }

  },

  afterCreate: function (newlyCreatedRecord, proceed) {
    if (sails.sockets) {
      sails.sockets.broadcast('officer_room', 'transaction_updated', { transaction: newlyCreatedRecord });
      if (newlyCreatedRecord.sender) sails.sockets.broadcast(`pocket_room_${newlyCreatedRecord.sender}`, 'transaction_updated', { transaction: newlyCreatedRecord });
      if (newlyCreatedRecord.receiver) sails.sockets.broadcast(`pocket_room_${newlyCreatedRecord.receiver}`, 'transaction_updated', { transaction: newlyCreatedRecord });
    }
    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    if (sails.sockets) {
      sails.sockets.broadcast('officer_room', 'transaction_updated', { transaction: updatedRecord });
      if (updatedRecord.sender) sails.sockets.broadcast(`pocket_room_${updatedRecord.sender}`, 'transaction_updated', { transaction: updatedRecord });
      if (updatedRecord.receiver) sails.sockets.broadcast(`pocket_room_${updatedRecord.receiver}`, 'transaction_updated', { transaction: updatedRecord });
    }
    return proceed();
  }

};

