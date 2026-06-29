module.exports = function serverError(data, message = 'Lỗi hệ thống') {
    var res = this.res;

    return res.status(200).json({
        err: sails.services.respcode.SERVER_ERROR,
        message: message,
        data: {}
    });
};