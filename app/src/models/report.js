/**
 * Model of report
 * @module models/report
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');
const _ = require('lodash');

const reflinkSchema = require('./schema/reflink');
const useragentSchema = require('./schema/useragent');
const { createApiQueryHandler } = require('../utils/model');
const { AuthRequiredError } = require('../errors');


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
  createdAt: { type: Date, default: Date.now, immutable: true },
  /**
   * Poster IP
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  ip: { type: String, required: true, immutable: true },
  /**
   * Poster IP md5 hash with salt
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  iphash: { type: String, required: true, immutable: true },
  /**
   * Parsed useragent of poster.
   * @see models/schema/useragent
   * @type {Useragent}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  useragent: { type: useragentSchema, required: true, immutable: true },
  /**
   * INPUT. Refs to posts that are reported. All posts must be on same board.
   * @see models/schema/reflink
   * @type {Array<module:models/schema/reflink~Reflink>}
   * @memberOf module:models/report~Report
   * @instance
   */
  reflinks: [ reflinkSchema ],
  /**
   * Board of reported posts
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   * @readOnly
   */
  boardUri: { type: String, required: true, immutable: true },
  /**
   * INPUT. Report text written by complainant. Plain Text.
   * @type {String}
   * @memberOf module:models/report~Report
   * @instance
   */
  reason: { type: String, default: '', maxlength: 280 },
  /**
   * Deleted flag. Can be set/unset by user with corresponding permission.
   * @type {Boolean}
   * @memberOf module:models/report~Report
   * @instance
   * @default false
   */
  isDeleted: { type: Boolean, default: false },
  /**
   * Priorities for previous changes to lock property from changing by user
   *    with lower priority. Object contains paths as keys and values are
   *    Int32.
   * @type {Object}
   * @memberOf module:models/report~Report
   * @instance
   */
  changes:             { type: Object }
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


reportSchema.statics.apiQuery = createApiQueryHandler(
  {
    _id: {
      selectByDefault: true,
      filter: true,
    },
    createdAt: {
      selectByDefault: true,
      filter: true,
    },
    'posts': {
      selectByDefault: false,
      alias: [
        'posts.postId',
        'posts.boardUri',
        'posts.createdAt',
        'posts.name',
        'posts.staffStatus',
        'posts.staffStatusDisplay',
        'posts.tripcode',
        'posts.email',
        'posts.subject',
        'posts.parsed',
        'posts.replies.postId',
        'posts.replies.threadId',
        'posts.replies.boardUri',
        'posts.replies.isOp',
        'posts.references.postId',
        'posts.references.threadId',
        'posts.references.boardUri',
        'posts.references.isOp',
        'posts.attachments.name',
        'posts.attachments.file',
        'posts.attachments.width',
        'posts.attachments.height',
        'posts.attachments.thumb',
        'posts.attachments.thumbWidth',
        'posts.attachments.thumbHeight',
        'posts.attachments.duration',
        'posts.attachments.type',
        'posts.attachments.size',
        'posts.attachments.isDeleted',
        'posts.attachments.isNSFW',
        'posts.attachments.isSpoiler',
        'posts.isSage',
        'posts.isApproved',
        'posts.isDeleted',
        'posts.threadId',
        'posts.bumpedAt',
        'posts.isSticky',
        'posts.isClosed',
      ],
    },
    'posts.postId': {
      selectByDefault: false,
      populate: ['posts', 'postId'],
      dependsOn: ['reflinks.src'],
    },
    'posts.boardUri': {
      selectByDefault: false,
      populate: ['posts', 'boardUri'],
      dependsOn: ['reflinks.src'],
    },
    'posts.createdAt': {
      selectByDefault: false,
      populate: ['posts', 'createdAt'],
      dependsOn: ['reflinks.src'],
    },
    'posts.name': {
      selectByDefault: false,
      populate: ['posts', 'name'],
      dependsOn: ['reflinks.src'],
    },
    'posts.staffStatus': {
      selectByDefault: false,
      populate: ['posts', 'staffStatus'],
      dependsOn: ['reflinks.src'],
    },
    'posts.staffStatusDisplay': {
      selectByDefault: false,
      populate: ['posts', 'staffStatusDisplay'],
      dependsOn: ['reflinks.src'],
    },
    'posts.tripcode': {
      selectByDefault: false,
      populate: ['posts', 'tripcode'],
      dependsOn: ['reflinks.src'],
    },
    'posts.email': {
      selectByDefault: false,
      populate: ['posts', 'email'],
      dependsOn: ['reflinks.src'],
    },
    'posts.subject': {
      selectByDefault: false,
      populate: ['posts', 'subject'],
      dependsOn: ['reflinks.src'],
    },
    'posts.parsed': {
      selectByDefault: false,
      populate: ['posts', 'parsed'],
      dependsOn: ['reflinks.src'],
    },
    'posts.replies': {
      selectByDefault: false,
      alias: [
        'posts.replies.postId',
        'posts.replies.threadId',
        'posts.replies.boardUri',
        'posts.replies.isOp',
      ],
    },
    'posts.references': {
      selectByDefault: false,
      alias: [
        'posts.references.postId',
        'posts.references.threadId',
        'posts.references.boardUri',
        'posts.references.isOp',
      ],
    },
    'posts.replies.postId': {
      selectByDefault: false,
      populate: ['posts', 'replies'],
      dependsOn: ['reflinks.src'],
    },
    'posts.references.postId': {
      selectByDefault: false,
      populate: ['posts', 'references'],
      dependsOn: ['reflinks.src'],
    },
    'posts.replies.threadId': {
      selectByDefault: false,
      populate: ['posts', 'replies'],
      dependsOn: ['reflinks.src'],
    },
    'posts.references.threadId': {
      selectByDefault: false,
      populate: ['posts', 'references'],
      dependsOn: ['reflinks.src'],
    },
    'posts.replies.boardUri': {
      selectByDefault: false,
      populate: ['posts', 'replies'],
      dependsOn: ['reflinks.src'],
    },
    'posts.references.boardUri': {
      selectByDefault: false,
      populate: ['posts', 'references'],
      dependsOn: ['reflinks.src'],
    },
    'posts.replies.isOp': {
      selectByDefault: false,
      populate: ['posts', 'replies'],
      dependsOn: ['reflinks.src'],
    },
    'posts.references.isOp': {
      selectByDefault: false,
      populate: ['posts', 'references'],
      dependsOn: ['reflinks.src'],
    },
    'posts.attachments': {
      selectByDefault: false,
      alias: [
        'posts.attachments.name',
        'posts.attachments.file',
        'posts.attachments.width',
        'posts.attachments.height',
        'posts.attachments.thumb',
        'posts.attachments.thumbWidth',
        'posts.attachments.thumbHeight',
        'posts.attachments.duration',
        'posts.attachments.type',
        'posts.attachments.size',
        'posts.attachments.isDeleted',
        'posts.attachments.isNSFW',
        'posts.attachments.isSpoiler',
      ],
    },
    'posts.attachments.hash': {
      selectByDefault: false,
      populate: ['posts', 'attachments.hash'],
    },
    'posts.attachments.name': {
      selectByDefault: false,
      populate: ['posts', 'attachments.name'],
    },
    'posts.attachments.file': {
      selectByDefault: false,
      populate: ['posts', 'attachments.file'],
    },
    'posts.attachments.width': {
      selectByDefault: false,
      populate: ['posts', 'attachments.width'],
    },
    'posts.attachments.height': {
      selectByDefault: false,
      populate: ['posts', 'attachments.height'],
    },
    'posts.attachments.thumb': {
      selectByDefault: false,
      populate: ['posts', 'attachments.thumb'],
    },
    'posts.attachments.thumbWidth': {
      selectByDefault: false,
      populate: ['posts', 'attachments.thumbWidth'],
    },
    'posts.attachments.thumbHeight': {
      selectByDefault: false,
      populate: ['posts', 'attachments.thumbHeight'],
    },
    'posts.attachments.duration': {
      selectByDefault: false,
      populate: ['posts', 'attachments.duration'],
    },
    'posts.attachments.type': {
      selectByDefault: false,
      populate: ['posts', 'attachments.type'],
    },
    'posts.attachments.size': {
      selectByDefault: false,
      populate: ['posts', 'attachments.size'],
    },
    'posts.attachments.isDeleted': {
      selectByDefault: false,
      populate: ['posts', 'attachments.isDeleted'],
    },
    'posts.attachments.isNSFW': {
      selectByDefault: false,
      populate: ['posts', 'attachments.isNSFW'],
    },
    'posts.attachments.isSpoiler': {
      selectByDefault: false,
      populate: ['posts', 'attachments.isSpoiler'],
    },
    'posts.isSage': {
      selectByDefault: false,
      populate: ['posts', 'isSage'],
      dependsOn: ['reflinks.src'],
    },
    'posts.isApproved': {
      selectByDefault: false,
      populate: ['posts', 'isApproved'],
      dependsOn: ['reflinks.src'],
    },
    'posts.isDeleted': {
      selectByDefault: false,
      populate: ['posts', 'isDeleted'],
      dependsOn: ['reflinks.src'],
    },
    'posts.threadId': {
      selectByDefault: false,
      populate: ['posts', 'threadId'],
      dependsOn: ['reflinks.src'],
    },
    'posts.bumpedAt': {
      selectByDefault: false,
      populate: ['posts', 'bumpedAt'],
      dependsOn: ['reflinks.src'],
    },
    'posts.isSticky': {
      selectByDefault: false,
      populate: ['posts', 'isSticky'],
      dependsOn: ['reflinks.src'],
    },
    'posts.isClosed': {
      selectByDefault: false,
      populate: ['posts', 'isClosed'],
      dependsOn: ['reflinks.src'],
    },
    'reflinks': {
      alias: [
        'reflinks.boardUri',
        'reflinks.threadId',
        'reflinks.postId',
        'reflinks.isOp',
      ]
    },
    'reflinks.boardUri': {
      selectByDefault: true,
    },
    'reflinks.threadId': {
      selectByDefault: true,
    },
    'reflinks.postId': {
      selectByDefault: true,
    },
    'reflinks.isOp': {
      selectByDefault: true,
    },
    reason: {
      selectByDefault: true,
    },
    boardUri: {
      selectByDefault: true,
      filter: true,
    },
    isDeleted: {
      selectByDefault: false,
      filter: true,
    },
  },
  (user, userRoles, { conditions = {}, projection = {}, options = {}, populate = {} } = {}) => {
    if (!user || !userRoles) {
      throw new AuthRequiredError();
    }
    // if (user.authority === 'admin') {
    //   return { conditions, projection, options, populate };
    // }
    const canViewReports = ([b, r]) => _.get(r, 'reportActions.canViewReports', false);
    const boardsAvailable = _.map(_.filter(_.toPairs(userRoles), canViewReports), _.head);
    conditions.$and = [
      {
        boardUri: { $in: boardsAvailable }
      }
    ];
    projection.isDeleted = 0;
    return { conditions, projection, options, populate };
  }
);


module.exports = mongoose.model('Report', reportSchema);
