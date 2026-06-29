module.exports = {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401, // Thiếu token hoặc token hết hạn
    FORBIDDEN: 403, // Sai quyền truy cập
    NOT_FOUND: 404, // Không tìm thấy tài nguyên
    SERVER_ERROR: 500,

    INVALID_PIN: 4001, // Sai mã PIN
    TRANSACTION_LOCKED: 4002,  // Ví đang bị khoá (inProgress) bởi một giao dịch khác
    INACTIVE_SERVICE: 4003,    // Service hiện đang inactive
    INVALID_CREDENTIALS: 4004, // Sai username, password hoặc số điện thoại
};