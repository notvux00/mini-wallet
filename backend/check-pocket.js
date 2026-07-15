const sails = require('sails');

sails.lift({ port: 1338 }, async (err) => {
  if (err) {
    console.error(err);
    return;
  }
  try {
    const pocketId = '6a545491bc2ace1f4a09da8a';
    const p = await Pocket.findOne({ id: pocketId });
    console.log('--- THÔNG TIN VÍ ---');
    console.log(p);
    
    if (p) {
        console.log('Checksum hiện tại trong DB:', p.checksum);
        const chk1 = SecurityUtil.generatePocketChecksum(p.balance, p.user);
        console.log('Checksum nếu tính bằng pocket.user:', chk1);
        
        const customer = await Customer.findOne({ id: p.user });
        console.log('--- THÔNG TIN KHÁCH HÀNG SỞ HỮU ---');
        console.log(customer);
        if (customer) {
            const chk2 = SecurityUtil.generatePocketChecksum(p.balance, customer.id);
            console.log('Checksum nếu tính bằng customer.id:', chk2);
        }
    }
  } catch(e) {
    console.error(e);
  } finally {
    sails.lower();
  }
});
