module.exports = function(req, res, next) {
  // Policy này được cấu hình để chạy SAU isAuthorized, 
  // nên lúc này hệ thống đã lấy được thông tin người dùng từ Token và gán vào req.user rồi.
  
  // Kiểm tra cái "chức vụ" (role) được đóng dấu trong Token
  if (req.user && req.user.role === 'officer') {
    return next(); // Đúng là Sếp, mời đi tiếp!
  }

  // Nếu là Customer (hoặc role khác) đi lạc vào
  return res.error(respCode.FORBIDDEN, 'Truy cập bị từ chối! Chức năng này chỉ dành cho Quản trị viên.');
};
