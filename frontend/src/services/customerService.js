import axios from '../utils/axios';

const customerService = {
  getDashboard: async () => {
    const response = await axios.post('/api/customer/dashboard');
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải dữ liệu dashboard');
  },
  
  getLinkedBanks: async () => {
    const response = await axios.post('/api/customer/bank/list');
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi khi tải danh sách thẻ liên kết');
  },

  requestLinkBank: async (data) => {
    const response = await axios.post('/api/customer/bank/request-link', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi gửi yêu cầu liên kết');
  },

  verifyLinkBank: async (data) => {
    const response = await axios.post('/api/customer/bank/verify-link', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Mã OTP không đúng');
  },

  unlinkBank: async (data) => {
    const response = await axios.post('/api/customer/bank/unlink', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Lỗi hủy liên kết');
  },

  getHistory: async (params) => {
    const response = await axios.post('/api/customer/transactions/history', params);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || 'Không thể tải lịch sử giao dịch.');
  }
};

export default customerService;
