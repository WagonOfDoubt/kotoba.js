/**
 * Mongoose model for board
 * @module models/board
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const schemaUtils = require('../utils/schema');
const boardparams = require('../json/boardparams');
const locales = require('../json/locales.json');
const localeCodes = locales.map(([t, c]) => c);


const uriValidators = [
  {
    validator: function(v) {
      return !boardparams.uriBlacklist.includes(v);
    },
    message: 'Illegal value for board uri'
  },
  {
    validator: function(v) {
      return /^[a-z0-9_]*$/.test(v);
    },
    message: 'board uri can contain only letters and numbers'
  },
];

const localeValidators = [
  {
    validator: function(v) {
      return localeCodes.includes(v);
    },
    message: 'Invalid locale',
  }
];


/**
 * Board Mongoose model
 * @class Board
 * @extends external:Model
 */
const boardSchema = Schema({
  /**
   * Board uri defines path where board is located. Must be unique.
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   * @readOnly
   */
  uri: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minlength: 1,
    validate: uriValidators,
    immutable: true,
  },
  /**
   * Board title
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  name:                { type: String, default: '' },
  /**
   * Board description (used in meta tag)
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  desc:                { type: String, default: '' },
  /**
   * HTML under board title in page header
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  header:              { type: String, default: '' },
  /**
   * HTML of additional navigation menu under top links
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  navbar:              { type: String, default: '' },
  /**
   * Overrides the header image set in site settings
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  imageUri:            { type: String, default: '' },
  /**
   * Board favicon. Overrides default favicon.
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  faviconUri:          { type: String, default: '' },
  /**
   * Maximum size of uploaded images, in bytes
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 10485760
   */
  maxFileSize:         { type: Number, default: 10485760 },
  /**
   * Maximum uploads in post. 0 forbids any uploads making board text only.
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 4
   */
  maxFilesPerPost:     { type: Number, default: 4 },
  /**
   * How many threads are displayed on page
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 10
   */
  maxThreadsOnPage:    { type: Number, default: 10 },
  /**
   * Number of pages on board
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 10
   */
  maxPages:            { type: Number, default: 10 },
  /**
   * The number of replies a thread can have before autosaging. Also known as
   *    bump limit.
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 500
   */
  autosage:            { type: Number, default: 500 },
  /**
   * Number of replies to show on a board page.
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 5
   */
  showReplies:         { type: Number, default: 5 },
  /**
   * Number of replies to show on a board page when the thread set as sticky
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   * @default 1
   */
  showRepliesSticky:   { type: Number, default: 1 },
  /**
   * Maximum number of characters in post
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   */
  maxMessageLength:    { type: Number, default: 9001 },
  /**
   * When board was created
   * @type {Date}
   * @memberOf module:models/board~Board
   * @instance
   * @readOnly
   */
  createdAt:           { type: Date, default: Date.now, immutable: true },
  /**
   * Name to display when a name is not attached to a post
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   * @default "Anonymous"
   */
  defaultPosterName:   { type: String, default: 'Anonymous' },
  /**
   * Whether or not to keep original file name for attachments. If false,
   *    random numbers will be used as file name.
   * @type {Boolean}
   * @memberOf module:models/board~Board
   * @instance
   * @default true
   */
  keepOriginalFileName:{ type: Boolean, default: true },
  /**
   * If true, only moderators of the board and admin can make new
   *    threads or replies
   * @type {Boolean}
   * @memberOf module:models/board~Board
   * @instance
   * @default false
   */
  isLocked:            { type: Boolean, default: false },
  /**
   * If true, this board will not be displayed in navigation menu (but can
   *    still be accessed by direct link)
   * @type {Boolean}
   * @memberOf module:models/board~Board
   * @instance
   * @default false
   */
  isHidden:            { type: Boolean, default: false },
  /**
   * If true, users will not be allowed to enter a name, forcing to use
   *    default instead
   * @type {Boolean}
   * @memberOf module:models/board~Board
   * @instance
   * @default false
   */
  isForcedAnon:        { type: Boolean, default: false },
  /**
   * The style which will be set when the user first visits the board
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   */
  defaultStyle:        { type: String, default: '' },
  /**
   * Locale to use on this board (overrides locale defined in site settings)
   * @type {String}
   * @memberOf module:models/board~Board
   * @instance
   * @default "en"
   */
  locale:              {
    type: String,
    default: 'en',
    validate: localeValidators,
  },
  /**
   * Object with boolean values representing which fields are required for new
   *    threads
   * @type {Object}
   * @memberOf module:models/board~Board
   * @instance
   * @property {Boolean} [files=false]   If true, new threads will require at least one attachment
   * @property {Boolean} [message=false] If true, new threads will require message
   * @property {Boolean} [subject=false] If true, new threads will require subject
   */
  newThreadsRequired:  {
    files:      { type: Boolean, default: false },
    message:    { type: Boolean, default: false },
    subject:    { type: Boolean, default: false },
  },
  /**
   * Display subject field in form for replying in thread
   * @type {Boolean}
   * @memberOf module:models/board~Board
   * @instance
   * @default true
   */
  allowRepliesSubject: { type: Boolean, default: true },
  /**
   * Captcha options
   * @type {Object}
   * @memberOf module:models/board~Board
   * @instance
   * @property {Boolean} [enabled=false] Enable captcha
   * @property {Boolean} [unsolvedExpireTime=0] Number of minutes until
   *    unsolved captcha is removed and need to be refreshed
   * @property {Boolean} [replyExpireTime=0] Number of minutes when solved
   *    captcha is still valid after reply
   * @property {Boolean} [threadExpireTime=0] Number of minutes when solved
   *    captcha is still valid after creating new thread
   * @property {Boolean} [provider="wakabtcha"] Captcha provider. Currently
   *    supported is: "wakabtcha" - default captcha from Wakaba
   */
  captcha: {
    enabled:            { type: Boolean, default: false },
    unsolvedExpireTime: { type: Number, default: 10 },
    replyExpireTime:    { type: Number, default: 0 },
    threadExpireTime:   { type: Number, default: 0 },
    provider:           {
      type: String,
      enum: ['wakabtcha'],
      default: 'wakabtcha'
    },
  },
  /**
   * Object with boolean values representing which features on board turned on
   *    or off
   * @type {Object}
   * @memberOf module:models/board~Board
   * @instance
   * @property {Boolean} [reporting=true] Allow users to report posts.
   * @property {Boolean} [archive=true] Enable/disable thread archiving.
   * @property {Boolean} [catalog=true] Generate catalog.html.
   * @property {Boolean} [sage=true] Allow users to reply to threads without
   *    bumping them.
   * @property {Boolean} [permanentSage=false] If true, poster can only sage
   *    thread once. After that, they no longer can post in threads they
   *    saged.
   * @property {Boolean} [attachmentSpoiler=true] Allow to mark attachments as
   *    Spoiler
   * @property {Boolean} [attachmentNSFW=true] Allow to mark attachments as
   *    NSFW
   */
  features: {
    reporting:     { type: Boolean, default: true },
    archive:       { type: Boolean, default: true },
    catalog:       { type: Boolean, default: true },
    sage:          { type: Boolean, default: true },
    permanentSage: { type: Boolean, default: false },
    attachmentSpoiler: { type: Boolean, default: true },
    attachmentNSFW:    { type: Boolean, default: true },
  },
  /**
   * @todo Implement custom file types
   * @type {Map}
   * @memberOf module:models/board~Board
   * @instance
   */
  filetypes: {
    type: Map,
  },
  /**
   * Post counter that increments on each new post
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   */
  postcount: {
    type: Number,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    min: 0
  },
  /**
   * Number of unique posts for a board.
   * This is stored in DB for performance reasons to avoid unnecessary queries.
   * @type {Number}
   * @memberOf module:models/board~Board
   * @instance
   */
  uniquePosts: {
    type: Number,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    min: 0
  },
});


/**
 * Get default values for board parameters
 * @return {Object} Object with default board properties
 * @alias module:models/board~Board.defaults
 * @memberOf module:models/board~Board
 * @static
 */
boardSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(boardSchema.obj);
};


/**
 * Find boards by mongo document _id.
 * @param {Array<ObjectId>} ids - Array of ObjectId.
 * @alias module:models/board~Board.findBoardsByIds
 * @memberOf module:models/board~Board
 * @static
 */
boardSchema.statics.findBoardsByIds = (ids) => {
  return Board.find({ _id: { $in: ids } });
};


/**
 * Find all boards
 * @param {Boolean} [inclHidden=true] Include boards where isHidden flag is set
 * @return {external:Query} Mongoose query
 * @alias module:models/board~Board.findBoards
 * @memberOf module:models/board~Board
 * @static
 */
boardSchema.statics.findBoards = (inclHidden = true) => {
  const q = {};
  if (!inclHidden) {
    q.isHidden = { $ne: true };
  }
  return Board.find(q);
};


/**
 * Find one board by uri
 * @param  {String} boardUri Board uri
 * @return {external:Query}           Mongoose query
 * @alias module:models/board~Board.findBoard
 * @memberOf module:models/board~Board
 * @static
 */
boardSchema.statics.findBoard = (boardUri) => {
  return Board.findOne({ uri: boardUri });
};


const Board = module.exports = mongoose.model('Board', boardSchema);
