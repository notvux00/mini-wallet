module.exports = {
  friendlyName: 'Migrate checksum',
  description: 'Migrate checksum to HMAC-SHA-256',
  fn: async function() {
    sails.log.info('Bắt đầu migrate checksum cho toàn bộ Ví...');
    const pockets = await Pocket.find();
    let count = 0;
    
    for (let pocket of pockets) {
      const newChecksum = SecurityUtil.generatePocketChecksum(pocket.balance, pocket.user);
      await Pocket.updateOne({ id: pocket.id }).set({ checksum: newChecksum });
      count++;
    }
    
    sails.log.info(`Đã cập nhật checksum thành công cho ${count} ví.`);
  }
};
