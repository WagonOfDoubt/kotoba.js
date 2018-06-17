const _ = require('lodash');
const User = require('../models/user');


/**
 * Create new user.
 * @returns {Promise}
 */
module.exports.createUser = async (data) => {
  // TODO
};


/**
 * Remove user from database.
 * @param {ObjectId} userId - Id of user in MongoDB.
 * @returns {Promise}
 */
module.exports.removeUser = (userId) => {
  return User.findById(userId).remove().exec();
};


/**
 * Change user parameters. Only user-accessable parameters will be changed.
 * This does not change user password.
 * @param {ObjectId} userId - Id of user in MongoDB.
 * @param {Object} data - Dictionary of new values.
 * @returns {Promise} Updated user mongoose document.
 */
module.exports.updateUser = (userId, data = {}) => {
  // pick only fields that can be changed by user
  const updateData = _.pick(data, [
      'contacts',
      'displayname',
    ]);
  const promise = User
    .findOneAndUpdate({ _id: userId }, updateData, { new: true })
    .exec();
  return promise;
};


/**
 * Change user password.
 * All validation must happen before this. Passwords is saved in DB as md5 hash.
 * @param {String} newPassword - New password (plain string, not md5 hash).
 * @returns {Promise} User mongoose document (without password field).
 */
module.exports.changeUserPassword = async (userId, newPassword) => {
  const passwordHash = await User.hashPassword(newPassword);
  return User
    .findByIdAndUpdate(userId, { password: passwordHash })
    .exec();
};
