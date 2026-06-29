/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  '*': false,

  // Người dùng đăng nhập và đăng ký tài khoản thì không cần token, nên mở barie cho 2 action này
  'AuthController': {
    'register': true,
    'login': true,
    'getMe': 'isAuthorized'
  },

  // Đăng nhập cho quản trị viên thì cũng không cần token, nên mở barie cho action này
  'OfficerController': {
    'login': true,
    'getMe': 'isAuthorized'
  }

};
