/**
 * CustomerServiceController
 * Cung cấp danh sách service active cho Customer App.
 * Customer chỉ thấy service đang active, không thấy config nội bộ.
 */
module.exports = {

  /**
   * Lấy danh sách service active cho Customer chọn khi giao dịch.
   * Có thể filter theo action type (VD: action=none cho P2P, action=billerTrans cho Bill).
   */
  list: async function (req, res) {
    try {
      const { action } = req.body; // optional filter

      const whereClause = { status: 'active' };
      if (action !== undefined) whereClause.action = action;

      const services = await Service.find(whereClause).sort('name ASC');
      
      const definitions = await TransDefinition.find({ service: services.map(s => s.id) });
      const defMap = {};
      for (const def of definitions) {
        defMap[def.service] = def;
      }

      // Chỉ trả về thông tin cần thiết, không expose fieldBuilder nội bộ
      const result = services.map(s => {
        const def = defMap[s.id];
        let amountField = 'AMOUNT';
        if (s.fieldBuilder) {
          const amountFb = s.fieldBuilder.find(f => f.name === 'AMOUNT' && f.source === 'parameters') 
                        || s.fieldBuilder.find(f => f.datatype === 'number' && f.source === 'parameters');
          if (amountFb) {
            amountField = amountFb.variable;
          }
        }
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          action: s.action,
          authMethod: s.auth && s.auth.method ? s.auth.method : 'NONE',
          fee: s.fee,
          amountField: amountField,
          bankLinkField: def && def.bankLinkMapping ? def.bankLinkMapping : 'BANK_LINK_ID',
          actionParams: s.actionParams || {},
          receiverPhoneField: s.actionParams?.receiverPhoneField || 'RECEIVERPHONE',
          discount: s.fieldBuilder?.find(f => f.name === 'DISCOUNT' && f.rule === 'math' && f.mathOp === 'percent')?.percentValue || 0,
        };
      });

      return res.ok(result, 'Lấy danh sách dịch vụ thành công!');
    } catch (error) {
      sails.log.error('Lỗi CustomerServiceController.list:', error);
      return res.badRequest({ message: 'Không thể lấy danh sách dịch vụ.' });
    }
  }

};
