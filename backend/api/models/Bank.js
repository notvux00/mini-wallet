/**
 * Bank.js
 *
 * @description :: Danh mục Ngân hàng đối tác trên hệ thống. 
 *                 Khi tạo một Bank, hệ thống sẽ tự sinh ra 1 Pocket với client='bank' 
 *                 để phục vụ Kế toán.
 */

module.exports = {
  attributes: {
    code: {
      type: 'string',
      required: true,
      unique: true,
      description: 'Mã Ngân hàng (VD: VCB, TCB)'
    },
    name: {
      type: 'string',
      required: true,
      description: 'Tên Ngân hàng (VD: Vietcombank)'
    },
    pocket: {
      model: 'pocket',
      description: 'Pocket của Ngân hàng dùng để đối soát'
    },
    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    }
  }
};
