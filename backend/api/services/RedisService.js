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
        maxRetriesPerRequest: 3
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
    return await client.get(key);
  },

  /**
   * Lấy thời gian sống còn lại của key (TTL) theo giây
   */
  ttl: async function (key) {
    const client = this.getClient();
    if (!client) return -2;
    return await client.ttl(key);
  },

  /**
   * Set giá trị cho 1 key với TTL (tùy chọn) theo giây
   */
  set: async function (key, value, ttlSeconds) {
    const client = this.getClient();
    if (!client) return false;
    
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  },

  /**
   * Tăng giá trị của key lên 1 (Dùng cho đếm số lần sai)
   */
  incr: async function (key) {
    const client = this.getClient();
    if (!client) return 0;
    return await client.incr(key);
  },

  /**
   * Xóa một hoặc nhiều key
   */
  del: async function (key) {
    const client = this.getClient();
    if (!client) return false;
    await client.del(key);
    return true;
  }
};
