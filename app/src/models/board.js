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

const boardSchema = Schema({
  uri: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minlength: 1,
    validate: uriValidators
  },
  name:                { type: String, default: '' },
  desc:                { type: String, default: '' },
  header:              { type: String, default: '' },
  navbar:              { type: String, default: '' },
  imageUri:            { type: String, default: '' },
  faviconUri:          { type: String, default: '' },
  maxFileSize:         { type: Number, default: 10485760 },
  maxFilesPerPost:     { type: Number, default: 4 },
  maxThreadsOnPage:    { type: Number, default: 10 },
  maxPages:            { type: Number, default: 10 },
  autosage:            { type: Number, default: 500 },
  showReplies:         { type: Number, default: 5 },
  showRepliesSticky:   { type: Number, default: 1 },
  maxMessageLength:    { type: Number, default: 9001 },
  createdDate:         { type: Date, default: Date.now },
  defaultPosterName:   { type: String, default: 'Anonymous' },
  isLocked:            { type: Boolean, default: false },
  isHidden:            { type: Boolean, default: false },
  isForcedAnon:        { type: Boolean, default: false },
  defaultStyle:        { type: String, default: '' },
  locale:              {
    type: String,
    default: 'en',
    validate: localeValidators,
  },
  newThreadsRequired:  {
    files:      { type: Boolean, default: false },
    message:    { type: Boolean, default: false },
    subject:    { type: Boolean, default: false },
  },
  allowRepliesSubject: { type: Boolean, default: true },
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
  features: {
    reporting:     { type: Boolean, default: true },
    archive:       { type: Boolean, default: true },
    catalog:       { type: Boolean, default: true },
    sage:          { type: Boolean, default: true },
    permanentSage: { type: Boolean, default: false },
  },
  /**
   * @todo
   * @type {Array}
   */
  filetypes: [{
    type: Schema.Types.ObjectId,
  }],
  /**
   * Post counter
   * @type {Number}
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
   */
  uniquePosts: {
    type: Number,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    min: 0
  },
});

boardSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(boardSchema.obj);
};

/**
 * Find boards by mongo document _id.
 * @param {Array<ObjectId>} ids - Array of ObjectId.
 */
boardSchema.statics.findBoardsByIds = (ids) => {
  return Board.find({ _id: { $in: ids } });
};

boardSchema.statics.findBoards = (boardUri, inclHidden = true) => {
  const q = {};
  if (!inclHidden) {
    q.isHidden = { $ne: true };
  }
  if (boardUri) {
    q.uri = boardUri;
    return Board.findOne(q);
  }
  return Board.find(q);
};

boardSchema.statics.findBoard = (boardUri) => {
  return Board.findOne({ uri: boardUri });
};


const Board = module.exports = mongoose.model('Board', boardSchema);
