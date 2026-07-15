const { URL } = require('url');
const dns = require('dns').promises;

function isPrivateIp(ip) {
  // Block IPv4-mapped IPv6 addresses entirely to avoid hex bypasses like ::ffff:7f00:1
  if (ip.startsWith('::ffff:')) return true;

  // IPv4 Private & Loopback
  if (/^127\./.test(ip)) return true; // 127.0.0.0/8 (including 127.0.0.2)
  if (/^0\./.test(ip)) return true; // 0.0.0.0/8
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip)) return true; // CGNAT
  
  // IPv6 Loopback & Private
  if (ip === '::1' || ip === '::') return true;
  if (/^[fF][cdCD]/.test(ip)) return true; // Unique Local
  if (/^[fF][eE][89abAB]/.test(ip)) return true; // Link-local

  return false;
}

async function isValidBillerUrl(urlString) {
  try {
    if (!urlString) return true; // Let missing fields pass here if they are optional, though in this case they might be required. We assume they are checked elsewhere or required.
    const url = new URL(urlString);
    
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return false;
    }

    if (process.env.NODE_ENV === 'production') {
      const hostname = url.hostname.toLowerCase();
      // Resolve DNS
      let addresses;
      try {
        addresses = await dns.lookup(hostname, { all: true });
      } catch (e) {
        return false; // Cannot resolve
      }
      
      for (const addr of addresses) {
        if (isPrivateIp(addr.address)) {
          return false;
        }
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  list: async function(req, res) {
    try {
      const page = req.body.page || 1;
      const limit = req.body.limit || 10;
      const skip = (page - 1) * limit;
      const statusFilter = req.body.status; // Admin có thể lọc Biller đang active/inactive
      const searchKeyword = req.body.search;

      // Điều kiện tìm kiếm
      const whereClause = {};
      if (statusFilter) {
        whereClause.status = statusFilter; 
      }
      if (searchKeyword) {
        whereClause.or = [
          { code: { contains: searchKeyword } },
          { name: { contains: searchKeyword } }
        ];
      }

      const total = await Biller.count(whereClause);
      const items = await Biller.find({
        where: whereClause,
        sort: 'createdAt DESC',
        skip: skip,
        limit: limit
      });

      return res.ok({ items, total, page, limit }, 'Lấy danh sách Nhà cung cấp thành công!');
    } catch (error) {
      sails.log.error('Lỗi OfficerBillerController.list:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  create: async function(req, res) {
    try {
        const {
          code, name, inquiryUrl, paymentUrl,
          inqReqKeyCustomer, inqReqKeyBiller, inquiryResMappingAmount, inquiryResMappingBillRef,
          payReqKeyCustomer, payReqKeyAmount, payReqKeyBillRef, payResMappingStatus, payResMappingSuccessValue
        } = req.body;
        // 1. Kiểm tra mã Biller đã tồn tại chưa
        const existingBiller = await Biller.findOne({ code: code });
        if (existingBiller) {
            return res.error(respCode.BAD_REQUEST, 'Mã Biller này đã tồn tại!');
        }

        if (inquiryUrl && !(await isValidBillerUrl(inquiryUrl))) {
            return res.error(respCode.BAD_REQUEST, 'Inquiry URL không hợp lệ hoặc chứa địa chỉ không an toàn!');
        }
        if (paymentUrl && !(await isValidBillerUrl(paymentUrl))) {
            return res.error(respCode.BAD_REQUEST, 'Payment URL không hợp lệ hoặc chứa địa chỉ không an toàn!');
        }

        // 2. Tạo một Pocket rỗng cho Biller này trước
        const newPocket = await Pocket.create({
            client: 'biller',
            currency: 'VND',
            balance: 0,
            checksum: 'TEMP'
        }).fetch();

        const newBiller = await Biller.create({
            code: code,
            name: name,
            inquiryUrl: inquiryUrl,
            paymentUrl: paymentUrl,
            pocket: newPocket.id,
            status: 'active',
            inqReqKeyCustomer, inqReqKeyBiller, inquiryResMappingAmount, inquiryResMappingBillRef,
            payReqKeyCustomer, payReqKeyAmount, payReqKeyBillRef, payResMappingStatus, payResMappingSuccessValue
        }).fetch();

        // 4. Cập nhật lại Pocket bao gồm user và checksum
        const validChecksum = SecurityUtil.generatePocketChecksum(0, newBiller.id);
        await Pocket.updateOne({ id: newPocket.id }).set({
            user: newBiller.id,
            checksum: validChecksum,
        });

        return res.ok(newBiller, 'Tạo Biller thành công!');
    } catch (error) {
        sails.log.error('Lỗi OfficerBillerController.create:', error);
      return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  toggleStatus: async function(req, res) {
    try {
        const { id } = req.body;

        const biller = await Biller.findOne({ id: id });
        if (!biller) {
            return res.error(respCode.NOT_FOUND, 'Không tìm thấy Biller này!');
        }

        // Đảo ngược trạng thái
        const newStatus = biller.status === 'active' ? 'inactive' : 'active';

        // 1. Cập nhật trạng thái biller
        await Biller.updateOne({ id: id }).set({ status: newStatus });

        // 2. Cập nhật luôn trạng thái của Pocket đi theo Biller đó
        if (biller.pocket) {
            await Pocket.updateOne({ id: biller.pocket }).set({ status: newStatus });
        }

        return res.ok({ status: newStatus }, `Đã đổi trạng thái thành ${newStatus.toUpperCase()}`);
    } catch (error) {
        sails.log.error('Lỗi OfficerBillerController.toggleStatus:', error);
        return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  },

  update: async function(req, res) {
    try {
        const {
          id, name, inquiryUrl, paymentUrl,
          inqReqKeyCustomer, inqReqKeyBiller, inquiryResMappingAmount, inquiryResMappingBillRef,
          payReqKeyCustomer, payReqKeyAmount, payReqKeyBillRef, payResMappingStatus, payResMappingSuccessValue
        } = req.body;

        const biller = await Biller.findOne({ id: id });
        if (!biller) {
            return res.error(respCode.NOT_FOUND, 'Không tìm thấy Biller này!');
        }

        if (inquiryUrl && !(await isValidBillerUrl(inquiryUrl))) {
            return res.error(respCode.BAD_REQUEST, 'Inquiry URL không hợp lệ hoặc chứa địa chỉ không an toàn!');
        }
        if (paymentUrl && !(await isValidBillerUrl(paymentUrl))) {
            return res.error(respCode.BAD_REQUEST, 'Payment URL không hợp lệ hoặc chứa địa chỉ không an toàn!');
        }

        const updatedBiller = await Biller.updateOne({ id: id }).set({
            name, inquiryUrl, paymentUrl,
            inqReqKeyCustomer, inqReqKeyBiller, inquiryResMappingAmount, inquiryResMappingBillRef,
            payReqKeyCustomer, payReqKeyAmount, payReqKeyBillRef, payResMappingStatus, payResMappingSuccessValue
        });

        return res.ok(updatedBiller, 'Cập nhật Biller thành công!');
    } catch (error) {
        sails.log.error('Lỗi OfficerBillerController.update:', error);
        return res.error(respCode.SERVER_ERROR, 'Hệ thống đang bận.');
    }
  }
};