/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */
require('dotenv').config();

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …
  
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  
  pocketSalt: (() => {
    if (!process.env.POCKET_SALT) {
      if (process.env.NODE_ENV === 'production') throw new Error('FATAL: POCKET_SALT environment variable is missing.');
      return 'MINIWALLET_DEV_SALT_ONLY'; // Fallback an toàn, dễ lộ nhưng chỉ cho dev
    }
    return process.env.POCKET_SALT;
  })(),
  
  jwtSecret: (() => {
    if (!process.env.JWT_SECRET) {
      if (process.env.NODE_ENV === 'production') throw new Error('FATAL: JWT_SECRET environment variable is missing.');
      return 'MINIWALLET_DEV_JWT_SECRET_ONLY';
    }
    return process.env.JWT_SECRET;
  })(),

  redisUrl: (() => {
    if (!process.env.REDIS_URL) {
      if (process.env.NODE_ENV === 'production') throw new Error('FATAL: REDIS_URL environment variable is missing.');
      // Trỏ về local redis thay vì một Upstash instance thực tế để tránh lọt thông tin credential
      return 'redis://127.0.0.1:6379'; 
    }
    return process.env.REDIS_URL;
  })(),

};
