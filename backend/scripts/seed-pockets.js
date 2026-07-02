module.exports = {
  friendlyName: 'Seed Pockets',
  description: 'Khởi tạo các ví mặc định cho hệ thống (System, Bank) sau khi drop DB.',

  fn: async function () {
    sails.log('Bắt đầu khởi tạo ví mặc định...');

    // Tạo Ví Hệ thống (Thu phí)
    const sysFee = await Pocket.create({
      user: 'system_admin',
      client: 'system',
      name: 'Ví Phí Hệ Thống',
      currency: 'VND',
      balance: 0,
      checksum: 'fake_checksum_sys_fee',
      status: 'active'
    }).fetch();
    sails.log('Đã tạo Ví Hệ Thống:', sysFee.id);

    // Tạo Ví Ngân Hàng (Cash-in)
    const vcbBank = await Pocket.create({
      user: 'vcb_admin',
      client: 'bank',
      name: 'Ví Ngân Hàng VCB',
      currency: 'VND',
      balance: 1000000000, // 1 tỷ
      checksum: 'fake_checksum_vcb',
      status: 'active'
    }).fetch();
    sails.log('Đã tạo Ví Ngân Hàng:', vcbBank.id);

    sails.log('Khởi tạo hoàn tất!');
  }
};
