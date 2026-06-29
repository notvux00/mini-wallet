/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …
  
  // Lấy từ biến môi trường (máy chủ thật), nếu chạy ở máy dev thì dùng chuỗi dự phòng
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  
  pocketSalt: process.env.POCKET_SALT || 'MINIWALLET_SECRET_2026',
  
  jwtSecret: process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY_2026',

};
