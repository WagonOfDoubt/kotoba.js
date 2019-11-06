/**
 * Model of report
 * @module models/report
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

const reflinkSchema = require('./schema/reflink');
const useragentSchema = require('./schema/useragent');


/**
 * Report Mongoose model
 * @class Report
 * @extends external:Model
 */
const reportSchema = Schema({
  /**
   * Date of reporting.
   * @type {Date}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  createdAt:           { type: Date, default: Date.now, immutable: true },
  /**
   * Poster IP
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  ip:                  { type: String, required: true, immutable: true },
  /**
   * Poster IP md5 hash with salt
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  iphash:              { type: String, required: true, immutable: true },
  /**
   * Parsed useragent of poster.
   * @see models/schema/useragent
   * @type {Useragent}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  useragent:           { type: useragentSchema, required: true, immutable: true },
  /**
   * INPUT. Refs to posts that are reported.
   * @see models/schema/reflink
   * @type {Array<module:models/schema/reflink~Reflink>}
   * @memberOf module:models/report~Report
   * @instance
   */
  reflinks:          [ reflinkSchema ],
  /**
   * INPUT. Report text written by complainant. Plain Text.
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   */
  reason:              { type: String, default: '', maxlength: 280 },
  /**
   * Deleted flag. Can be set/unset by user with corresponding permission.
   * @type {Boolean}
   * @memberOf module:models/report~Report
   * @instance
   * @default false
   */
  isDeleted:           { type: Boolean, default: false },
});


/**
 * Array of reported posts documents
 * @type {Array<Post>}
 * @memberOf module:models/report~Report
 * @alias module:models/report~Report#posts
 * @instance
 */
reportSchema.virtual('posts', {
  ref: 'Post',
  localField: 'reflinks.src',
  foreignField: '_id',
  justOne: false,
  options: { sort: { createdAt: 1 } }
});


reportSchema.pre('validate', function(next) {
  if (this.isNew) {
    this.iphash = crypto
      .createHmac('md5', process.env.RANDOM_SEED)
      .update(this.ip)
      .digest('hex');
  }
  next();
});


module.exports = mongoose.model('Report', reportSchema);
