/**
 * User model module
 * @module models/user
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const bcrypt = require('bcrypt');
const config = require('../json/config.json');


/**
 * User Mongoose model
 * @class User
 * @extends external:Model
 */
const userSchema = Schema({
  /**
   * User's login
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   */
  login:               { type: String, required: true },
  /**
   * Salted md5 hash of password
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   */
  password:            { type: String, required: true, select: false },
  /**
   * User contacts list, like e-mail and others with no particular format
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   */
  contacts:            { type: String },
  /**
   * When user was created
   * @type {Date}
   * @memberOf module:models/user~User#
   * @instance
   */
  addedon:             { type: Date, default: Date.now},
  /**
   * Last login date
   * @type {Date}
   * @memberOf module:models/user~User#
   * @instance
   */
  lastactive:          { type: Date, default: Date.now},
  /**
   * User's name to show instead of login
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   */
  displayname:         { type: String, default: '' },
  /**
   * User's authority
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   */
  authority:           { type: String, required: true, enum: ['admin', 'staff-member', 'guest'] },
  /**
   * User's roles on each board
   * @type {Map<String,module:models/role~Role>}
   * @memberOf module:models/user~User#
   * @instance
   * @see module:models/role~Role
   */
  boardRoles:          { type: Map, of: { type: ObjectId, ref: 'Role' } },
  /**
   * User's site preferences
   * @type {String}
   * @memberOf module:models/user~User#
   * @instance
   * @todo Not implemented
   */
  settings:            { type: String }
});


userSchema.pre('save', async function(next) {
  this.password = await bcrypt.hash(this.password, config.salt_rounds);
  next();
});


/**
 * Compare unencrypted password entered by user with stored hash
 * @async
 * @param {String} password Unencrypted password
 * @returns {Boolean} True, if password matches
 * @memberOf module:models/user~User#
 * @name checkPassword
 * @function
 * @instance
 */
userSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


/**
 * Encrypt password
 * @type {String}
 * @param {String} password Unencrypted password
 * @returns {String} Encrypted password
 * @memberOf module:models/user~User#
 * @name hashPassword
 * @function
 * @instance
 */
userSchema.statics.hashPassword = async function(password) {
  return await bcrypt.hash(password, config.salt_rounds);
};

const User = module.exports = mongoose.model('User', userSchema);
