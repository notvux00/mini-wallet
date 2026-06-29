module.exports = function(req, res, next) {
  // 1. Lấy token từ header mà người dùng gửi lên
  let token = req.headers.authorization;

  // Nếu khách đi tay không
  if (!token) {
    return res.error(respCode.UNAUTHORIZED, 'Không tìm thấy Token. Vui lòng đăng nhập!');
  }

  // 2. Cắt bỏ chữ "Bearer " để lấy đúng cái mã.
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  try {
    // 3. Đưa mã token cho "Máy soi" kiểm tra
    const decodedPayload = SecurityUtil.verifyToken(token);

    // 4. Dán bảng tên (thông tin user) lên người khách (req.user)
    req.user = decodedPayload;

    // 5. Mở barie cho khách đi tiếp!
    return next();

  } catch (error) {
    // Nếu token giả/hết hạn -> Dùng thẳng hàm res.error() của bạn
    return res.error(respCode.UNAUTHORIZED, 'Token không hợp lệ hoặc đã hết hạn!');
  }
};