import axios from '../utils/axios';

const transactionService = {
  // Lấy danh sách dịch vụ (P2P, Topup, Bill...)
  getServices: async (actionType = 'none') => {
    const response = await axios.post('/api/customer/services/list', { action: actionType });
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải danh sách dịch vụ');
  },

  // Lấy danh sách Billers
  getBillers: async () => {
    const response = await axios.post('/api/customer/billers/list');
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải danh sách nhà cung cấp');
  },

  // Yêu cầu tạo giao dịch mới (Step 1)
  requestTransaction: async (data) => {
    const response = await axios.post('/api/customer/transaction/request', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tạo giao dịch');
  },

  // Xác nhận lấy thông tin preview (Step 2)
  confirmTransaction: async (transRefId) => {
    const response = await axios.post('/api/customer/transaction/confirm', { transRefId });
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi xác nhận giao dịch');
  },

  // Xác thực PIN/OTP (Step 3)
  verifyTransaction: async ({ transRefId, authCode }) => {
    const response = await axios.post('/api/customer/transaction/verify', { transRefId, authCode });
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Xác thực thất bại');
  },

  // Lịch sử giao dịch
  getHistory: async ({ page, limit, type }) => {
    const body = { page, limit };
    if (type) body.type = type;
    const response = await axios.post('/api/customer/history', body);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải lịch sử giao dịch');
  },

  // Lấy danh sách ngân hàng liên kết
  getLinkedBanks: async () => {
    const response = await axios.post('/api/customer/banks');
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải danh sách ngân hàng');
  },

  // Liên kết / Hủy liên kết ngân hàng
  linkBank: async (data) => {
    const response = await axios.post('/api/customer/banks/link', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi liên kết ngân hàng');
  },
  
  unlinkBank: async (bankId) => {
    const response = await axios.post('/api/customer/banks/unlink', { bankId });
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi hủy liên kết ngân hàng');
  }
};

export default transactionService;
