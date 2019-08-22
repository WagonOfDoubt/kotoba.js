/**
 * Model of report
 * @module models/report
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Int32 = require('mongoose-int32');
const crypto = require('crypto');

const reflinkSchema = require('./schema/reflink');
const useragentSchema = require('./schema/useragent');


const reportSchema = Schema({
  /**
   * READ ONLY. Date of reporting.
   * @type {Date}
   */
  timestamp:           { type: Date, default: Date.now },
  /**
   * READ ONLY. Poster IP. Users are required to have role on post's board
   *    with permission.
   * @type {String}
   */
  ip:                  { type: String, required: true },
  /**
   * READ ONLY. Poster IP md5 hash with salt. Users are required to have role
   *    on post's board with permission.
   * @type {String}
   */
  iphash:              { type: String, required: true },
  /**
   * READ ONLY. Parsed useragent of poster.
   * @see models/schema/useragent
   * @type {UseragentSchema}
   */
  useragent:           { type: useragentSchema, required: true },
  /**
   * INPUT. Refs to posts that are reported.
   * @see models/schema/reflink
   * @type {Array[ReflinkSchema]}
   */
  reflinks:          [ reflinkSchema ],
  /**
   * INPUT. Report text written by complainant. Plain Text.
   * @type {String}
   */
  reason:              { type: String, default: '', maxlength: 280 },
  /**
   * Deleted flag. Can be set/unset by user with corresponding permission.
   * @type {Boolean}
   */
  isDeleted:           { type: Boolean, default: false },
});


reportSchema.virtual('posts', {
  ref: 'Post',
  localField: 'reflinks.src',
  foreignField: '_id',
  justOne: false,
  options: { sort: { timestamp: 1 } }
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


const report = module.exports = mongoose.model('Report', reportSchema);
