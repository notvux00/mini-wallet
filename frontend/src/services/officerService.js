import axios from '../utils/axios';

const officerService = {
  // 1. Dashboard
  getDashboardStats: async () => {
    const response = await axios.post('/api/officer/dashboard/stats');
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải thống kê');
  },

  // 2. Customers
  getCustomers: async (params) => {
    const response = await axios.post('/api/officer/customers/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải danh sách khách hàng');
  },

  // 3. Pockets
  getPockets: async (params) => {
    const response = await axios.post('/api/officer/pockets/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải danh sách két');
  },

  createPocket: async (data) => {
    const response = await axios.post('/api/officer/pockets/create', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tạo két');
  },

  togglePocketStatus: async (data) => {
    const response = await axios.post('/api/officer/pockets/toggle-status', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi đổi trạng thái két');
  },

  // 4. Services
  getServices: async (params) => {
    const response = await axios.post('/api/officer/services/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải danh sách dịch vụ');
  },

  getServiceDetail: async (params) => {
    const response = await axios.post('/api/officer/services/detail', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải chi tiết dịch vụ');
  },

  createService: async (data) => {
    const response = await axios.post('/api/officer/services/create', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data;
    throw new Error(response.data.msg || 'Lỗi tạo dịch vụ');
  },

  updateService: async (data) => {
    const response = await axios.post('/api/officer/services/update', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data;
    throw new Error(response.data.msg || 'Lỗi cập nhật dịch vụ');
  },

  toggleServiceStatus: async (data) => {
    const response = await axios.post('/api/officer/services/toggle-status', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi thay đổi trạng thái dịch vụ');
  },

  // 5. Billers
  getBillers: async (params) => {
    const response = await axios.post('/api/officer/billers/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải danh sách biller');
  },

  createBiller: async (data) => {
    const response = await axios.post('/api/officer/billers/create', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tạo biller');
  },

  updateBiller: async (data) => {
    const response = await axios.post('/api/officer/billers/update', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi cập nhật biller');
  },

  toggleBillerStatus: async (data) => {
    const response = await axios.post('/api/officer/billers/toggle-status', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi cập nhật trạng thái biller');
  },

  // 6. Banks
  getBanks: async (params) => {
    const response = await axios.post('/api/officer/banks/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải danh sách ngân hàng');
  },

  createBank: async (data) => {
    const response = await axios.post('/api/officer/banks/create', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tạo ngân hàng');
  },

  // 7. Transactions
  getTransactions: async (params) => {
    const response = await axios.post('/api/officer/transactions/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải giao dịch');
  },

  executeTransaction: async (data) => {
    const response = await axios.post('/api/officer/transactions/execute', data);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi thực thi giao dịch');
  },

  // 8. Trails & Entries
  getTrails: async (params) => {
    const response = await axios.post('/api/officer/trails/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải dấu vết giao dịch');
  },

  getPocketEntries: async (params) => {
    const response = await axios.post('/api/officer/pocket-entries/list', params);
    if (response.data.err === 0 || response.data.err === 200) return response.data.data;
    throw new Error(response.data.msg || 'Lỗi tải sổ phụ két');
  }
};

export default officerService;
