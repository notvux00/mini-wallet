const Redis = require('ioredis');

let redisClient = null;

module.exports = {
  /**
   * Khởi tạo kết nối Redis khi app khởi động (hoặc khi gọi lần đầu)
   */
  getClient: function () {
    if (!redisClient) {
      const redisUrl = sails.config.custom.redisUrl;
      if (!redisUrl) {
        sails.log.warn('⚠️ redisUrl không được cấu hình trong config/custom.js. Bỏ qua RedisService.');
        return null;
      }
      redisClient = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: 3,
        commandTimeout: 3000,
        enableOfflineQueue: false
      });

      redisClient.on('connect', () => {
        sails.log.info('✅ Kết nối thành công tới Redis Cloud (Upstash)!');
      });

      redisClient.on('error', (err) => {
        sails.log.error('❌ Lỗi kết nối Redis:', err.message);
      });
    }
    return redisClient;
  },

  /**
   * Lấy giá trị của 1 key
   */
  get: async function (key) {
    const client = this.getClient();
    if (!client) return null;
    try { return await client.get(key); } catch (e) { return null; }
  },

  ttl: async function (key) {
    const client = this.getClient();
    if (!client) return -2;
    try { return await client.ttl(key); } catch (e) { return -2; }
  },

  set: async function (key, value, ttlSeconds) {
    const client = this.getClient();
    if (!client) return false;
    try {
      if (ttlSeconds) await client.set(key, value, 'EX', ttlSeconds);
      else await client.set(key, value);
      return true;
    } catch (e) { return false; }
  },

  incr: async function (key) {
    const client = this.getClient();
    if (!client) return 1; // bypass if no redis
    try { return await client.incr(key); } catch (e) { return 1; }
  },

  del: async function (key) {
    const client = this.getClient();
    if (!client) return false;
    try { await client.del(key); return true; } catch (e) { return false; }
  },

  setnx: async function (key, value, ttlSeconds) {
    const client = this.getClient();
    if (!client) return true; // Bypass nếu không có Redis
    try {
      const result = await client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (e) { return true; } // bypass lock
  },

  expire: async function (key, ttlSeconds) {
    const client = this.getClient();
    if (!client) return false;
    try { await client.expire(key, ttlSeconds); return true; } catch (e) { return false; }
  }
};
