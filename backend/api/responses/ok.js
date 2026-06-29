module.exports = function ok(data, message = 'Thành công') {
    var res = this.res;

    return res.status(200).json({
        err: sails.services.respcode.SUCCESS,
        message: message,
        data: data || {}
    });
};