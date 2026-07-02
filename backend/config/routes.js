/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': { view: 'pages/homepage' },

  // 1. Nhóm API Xác thực cho Khách hàng
  'POST /api/auth/register': 'AuthController.register',
  'POST /api/auth/login': 'AuthController.login',
  'POST /api/auth/me': 'AuthController.getMe',

  // 2. Nhóm API Xác thực cho Quản trị viên
  'POST /api/officer/login': 'OfficerController.login',
  'POST /api/officer/me': 'OfficerController.getMe',

  // 3. API lấy số dư và lịch sử giao dịch của Customer
  'POST /api/customer/dashboard': 'CustomerController.dashboard',
  'POST /api/customer/billers/list': 'CustomerBillerController.list',
  'POST /api/customer/transactions/history': 'CustomerTransactionController.history',
  'POST /api/customer/services/list': 'CustomerServiceController.list', // Danh sách service active cho Customer
  'POST /api/customer/transaction/request': 'CustomerTransactionController.request',
  'POST /api/customer/transaction/confirm': 'CustomerTransactionController.confirm',
  'POST /api/customer/transaction/verify': 'CustomerTransactionController.verify',

  // 4. Nhóm API CMS cho Officer
  'POST /api/officer/customers/list': 'OfficerCustomerController.list', // Danh sách Customer
  'POST /api/officer/billers/list': 'OfficerBillerController.list', // Danh sách Biller cho Officer
  'POST /api/customer/billers/list': 'CustomerBillerController.list', // Danh sách Biller cho Customer
  'POST /api/officer/billers/create': 'OfficerBillerController.create', // Tạo mới Biller
  'POST /api/officer/billers/toggle-status': 'OfficerBillerController.toggleStatus', // Khóa/Mở khóa Biller
  'POST /api/officer/pockets/list': 'OfficerPocketController.list', // Danh sách Pocket
  'POST /api/officer/pockets/toggle-status': 'OfficerPocketController.toggleStatus', // Khóa/Mở khóa Ví
  'POST /api/officer/pockets/create': 'OfficerPocketController.create', // Tạo mới Ví (System/Bank)
  'POST /api/officer/transactions/list': 'OfficerTransactionController.list',   // Danh sách toàn bộ giao dịch
  'POST /api/officer/trails/list': 'OfficerTrailController.list',               // Danh sách Trail
  'POST /api/officer/transactions/execute': 'OfficerTransactionController.execute', // Thực hiện giao dịch (mọi loại)
  'POST /api/officer/transactions/verify': 'OfficerTransactionController.verify',   // Xác thực PIN (nếu cần)
  
  // APIs cho Service Configurator (Luồng Cấu Hình Động)
  'POST /api/officer/services/list': 'OfficerServiceController.list',
  'POST /api/officer/services/create': 'OfficerServiceController.create',
  'POST /api/officer/services/detail': 'OfficerServiceController.detail',
  'POST /api/officer/services/update': 'OfficerServiceController.update',
  'POST /api/officer/services/toggle-status': 'OfficerServiceController.toggleStatus',

  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/


};
