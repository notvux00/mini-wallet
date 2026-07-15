import axios from '../utils/axios';

const authService = {
  customerLogin: async (data) => {
    const response = await axios.post('/api/auth/login', data);
    // Có thể API trả về code = 200 hoặc code = 0 là success
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || response.data.message || 'Lỗi đăng nhập');
  },

  customerRegister: async (data) => {
    const response = await axios.post('/api/auth/register', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || response.data.message || 'Lỗi đăng ký');
  },

  officerLogin: async (data) => {
    const response = await axios.post('/api/officer/login', data);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || response.data.message || 'Lỗi đăng nhập');
  },

  getMe: async (role) => {
    const url = role === 'officer' ? '/api/officer/me' : '/api/auth/me';
    const response = await axios.post(url);
    if (response.data.err === 0 || response.data.err === 200) {
      return response.data.data;
    }
    throw new Error(response.data.msg || response.data.message || 'Lỗi lấy thông tin user');
  }
};

export default authService;
