/**
 * MockBillerController
 *
 * @description :: Server-side actions for handling incoming requests from Biller API (MOCK).
 */

module.exports = {
  
  /**
   * Giả lập API tra cứu hóa đơn
   * Nhận: billerCode, customerCode
   * Trả về: Thông tin hóa đơn giả định
   */
  inquiry: async function (req, res) {
    try {
      const { billerCode, customerCode } = req.body;

      if (!billerCode || !customerCode) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing billerCode or customerCode'
        });
      }

      // Giả lập số tiền nợ (từ 50.000 đến 1.000.000)
      const mockAmount = Math.floor(Math.random() * 20) * 50000 + 50000;
      
      // Giả lập mã hóa đơn
      const mockBillRef = `BILL_${billerCode}_${Date.now()}`;

      // Giả lập trả về
      return res.json({
        status: 'success',
        data: {
          billerCode: billerCode,
          customerCode: customerCode,
          customerName: `MOCK CUSTOMER ${customerCode}`,
          amountOwed: mockAmount,
          billRef: mockBillRef,
          period: '07/2026'
        },
        message: 'Inquiry successful'
      });

    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  },

  /**
   * Giả lập API gạch nợ (Thanh toán)
   * Nhận: billerCode, customerCode, amount, billRef
   */
  pay: async function (req, res) {
    try {
      const { customerCode, amount, billRef } = req.body;

      if (!customerCode || !amount || !billRef) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields for payment'
        });
      }

      // Giả lập luôn thành công
      return res.json({
        status: 'success',
        data: {
          transactionId: `MOCK_TRANS_${Date.now()}`,
          receipt: `RECEIPT_${billRef}`
        },
        message: 'Payment received successfully'
      });

    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

};
