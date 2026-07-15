const sails = require('sails');

sails.lift({
  port: 1338, // Tránh xung đột cổng với app đang chạy
  environment: process.env.NODE_ENV || 'development'
}, async (err) => {
  if (err) {
    console.error('Lỗi khi khởi động Sails:', err);
    return;
  }
  
  try {
    console.log('--- Đang quét toàn bộ Ví (Pocket) ---');
    const pockets = await Pocket.find({});
    let updatedCount = 0;
    
    for (const pocket of pockets) {
      // Dùng chính hàm SecurityUtil của Sails để đảm bảo thuật toán và SALT giống 100%
      const newChecksum = SecurityUtil.generatePocketChecksum(pocket.balance, pocket.user);
      
      if (newChecksum !== pocket.checksum) {
        await Pocket.updateOne({ id: pocket.id }).set({ checksum: newChecksum });
        updatedCount++;
        console.log(`- Đã sửa ví ${pocket.id} (Balance: ${pocket.balance})`);
      }
    }
    
    console.log(`✅ Hoàn tất! Đã sửa thành công ${updatedCount} ví.`);
  } catch (e) {
    console.error('Lỗi trong quá trình sửa ví:', e);
  } finally {
    sails.lower();
  }
});
