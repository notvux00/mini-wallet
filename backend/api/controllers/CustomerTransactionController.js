module.exports = {
  history: async function(req, res) {
    try {
      const customerId = req.user.id;
      const customer = await Customer.findOne({ id: customerId });
      
      if (!customer) {
        return res.error(respCode.NOT_FOUND, 'Không tìm thấy thông tin khách hàng!');
      }

      const customerPhone = customer.phone;

      // Phân trang (mặc định trang 1, 10 item)
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;

      const transactions = await Transaction.find({
        where: {
          or: [
            { sender: customerPhone },
            { receiver: customerPhone }
          ]
        },
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      const formattedTransactions = transactions.map(tx => {
        const isIncome = (tx.receiver === customerPhone);
        return {
          id: tx.transRefId, // Trả về mã ref để hiển thị
          type: tx.serviceId, // P2P_TRANSFER, BILL_PAYMENT
          amount: isIncome ? tx.amount : -tx.totalAmount, // Thu dương, Chi âm
          date: new Date(tx.createdAt).toLocaleString('vi-VN'),
          status: tx.status,
          desc: isIncome ? `Received from ${tx.sender}` : `Transfer to ${tx.receiver}`
        };
      });

      return res.ok(formattedTransactions, 'Lấy lịch sử giao dịch thành công!');
    } catch (error) {
      sails.log.error('Lỗi CustomerTransactionController.history:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};
