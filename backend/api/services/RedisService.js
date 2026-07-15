const Redis = require('ioredis');

let redisClient = null;
let fakeRedisStore = {};

function checkIsTest() {
  return process.env.NODE_ENV === 'test' || (global.sails && sails.config && sails.config.environment === 'test');
}

module.exports = {
  getClient: function () {
    if (checkIsTest()) return 'FAKE_CLIENT';
    
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

  get: async function (key) {
    if (checkIsTest()) {
      const entry = fakeRedisStore[key];
      if (!entry) return null;
      if (entry.expireAt && Date.now() > entry.expireAt) {
        delete fakeRedisStore[key];
        return null;
      }
      return entry.value;
    }
    
    const client = this.getClient();
    if (!client) return null;
    try { return await client.get(key); } catch (e) { return null; }
  },

  ttl: async function (key) {
    if (checkIsTest()) {
      const entry = fakeRedisStore[key];
      if (!entry) return -2;
      if (entry.expireAt && Date.now() > entry.expireAt) {
        delete fakeRedisStore[key];
        return -2;
      }
      if (!entry.expireAt) return -1;
      return Math.ceil((entry.expireAt - Date.now()) / 1000);
    }
    
    const client = this.getClient();
    if (!client) return -2;
    try { return await client.ttl(key); } catch (e) { return -2; }
  },

  set: async function (key, value, ttlSeconds) {
    if (checkIsTest()) {
      fakeRedisStore[key] = {
        value: value,
        expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
      };
      return true;
    }
    
    const client = this.getClient();
    if (!client) return false;
    try {
      if (ttlSeconds) await client.set(key, value, 'EX', ttlSeconds);
      else await client.set(key, value);
      return true;
    } catch (e) { return false; }
  },

  incr: async function (key) {
    if (checkIsTest()) {
      const entry = fakeRedisStore[key];
      if (!entry || (entry.expireAt && Date.now() > entry.expireAt)) {
        fakeRedisStore[key] = { value: 1, expireAt: null };
        return 1;
      }
      fakeRedisStore[key].value = Number(entry.value) + 1;
      return fakeRedisStore[key].value;
    }
    
    const client = this.getClient();
    if (!client) return 1;
    try { return await client.incr(key); } catch (e) { return 1; }
  },

  del: async function (key) {
    if (checkIsTest()) {
      delete fakeRedisStore[key];
      return true;
    }
    
    const client = this.getClient();
    if (!client) return false;
    try { await client.del(key); return true; } catch (e) { return false; }
  },

  setnx: async function (key, value, ttlSeconds = 60) {
    if (checkIsTest()) {
      const existing = fakeRedisStore[key];
      if (existing && (!existing.expireAt || Date.now() <= existing.expireAt)) {
        return false; // Key already exists and not expired
      }
      fakeRedisStore[key] = {
        value: value,
        expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
      };
      return true;
    }
    
    const client = this.getClient();
    if (!client) return false;
    
    try {
      const result = await client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (e) { 
      sails.log.error('Lỗi setnx Redis:', e);
      return false; 
    }
  },

  expire: async function (key, ttlSeconds) {
    if (checkIsTest()) {
      const entry = fakeRedisStore[key];
      if (!entry || (entry.expireAt && Date.now() > entry.expireAt)) return false;
      entry.expireAt = Date.now() + ttlSeconds * 1000;
      return true;
    }
    
    const client = this.getClient();
    if (!client) return false;
    try { await client.expire(key, ttlSeconds); return true; } catch (e) { return false; }
  },
  
  // Dành cho test: reset fake store
  _resetFakeStore: function() {
    fakeRedisStore = {};
  }
};
