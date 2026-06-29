module.exports = function error(errCode, message = 'Có lỗi xảy ra', data) {
    var res = this.res;

    return res.status(200).json({
        err: errCode,
        message: message,
        data: data || {}
    });
};