module.exports = {
  testBroadcast: async function(req, res) {
    if (sails.sockets) {
      sails.sockets.broadcast('officer_room', 'transaction_updated', { msg: 'Test from backend', transaction: { status: 'done' } });
      return res.json({ success: true });
    }
    return res.json({ success: false });
  }
};
