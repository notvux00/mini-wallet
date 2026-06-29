module.exports = function badRequest(data, message = 'Dữ liệu không hợp lệ',) {
    var res = this.res;

    return res.status(200).json({
        err: sails.services.respcode.BAD_REQUEST,
        message: message,
        data: data || {}
    });
};