const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const fs = require('fs');
if (fs.existsSync('.env')) {
    const envConfig = fs.readFileSync('.env', 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
}

// Lấy POCKET_SALT giống hệt như trong custom.js
const POCKET_SALT = (() => {
    if (!process.env.POCKET_SALT) {
        if (process.env.NODE_ENV === 'production') throw new Error('FATAL: POCKET_SALT environment variable is missing.');
        return 'MINIWALLET_DEV_SALT_ONLY'; 
    }
    return process.env.POCKET_SALT;
})();

function generatePocketChecksum(balance, userId) {
    const salt = POCKET_SALT;
    const balanceStr = Number(balance).toString();
    const userStr = userId ? String(userId) : 'SYSTEM_WALLET';
    
    return crypto.createHash('md5').update(`${balanceStr}_${userStr}_${salt}`).digest('hex');
}

async function run() {
    console.log('Đang kết nối database...');
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('mini-wallet');
    
    console.log('Đang cập nhật lại Checksum cho toàn bộ ví (Pocket) với POCKET_SALT hiện tại...');
    
    const pockets = await db.collection('pocket').find({}).toArray();
    let updatedCount = 0;

    for (let pocket of pockets) {
        // user trong model Pocket lưu objectID hoặc chuỗi, lấy ra để tính
        const userId = pocket.user ? pocket.user.toString() : null;
        const newChecksum = generatePocketChecksum(pocket.balance, userId);
        
        if (newChecksum !== pocket.checksum) {
            await db.collection('pocket').updateOne(
                { _id: pocket._id },
                { $set: { checksum: newChecksum } }
            );
            updatedCount++;
            console.log(`- Đã sửa ví ${pocket._id} (Balance: ${pocket.balance})`);
        }
    }
    
    console.log(`✅ Cập nhật thành công ${updatedCount} ví bị sai Checksum.`);
    await client.close();
}

run().catch(console.error);
