/**
 * SocketController
 *
 * @description :: Server-side actions for handling socket subscriptions
 */

module.exports = {

  officerSubscribe: function (req, res) {
    if (!req.isSocket) {
      return res.error(sails.services.respcode.BAD_REQUEST, 'Only socket requests are allowed');
    }
    
    // Join the officer room
    sails.sockets.join(req, 'officer_room');
    
    return res.json({ message: 'Subscribed to officer_room' });
  },

  customerSubscribe: async function (req, res) {
    if (!req.isSocket) {
      return res.error(sails.services.respcode.BAD_REQUEST, 'Only socket requests are allowed');
    }
    
    const customerId = req.user.id; // From isAuthorized policy
    const roomName = `customer_room_${customerId}`;
    sails.sockets.join(req, roomName);

    // Join pocket room too
    const pocket = await Pocket.findOne({ user: customerId });
    if (pocket) {
      sails.sockets.join(req, `pocket_room_${pocket.id}`);
    }
    
    return res.json({ message: `Subscribed to ${roomName} and pocket room` });
  }

};
