const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const schemaUtils = require('../utils/schema');

const boardSchema = Schema({
  uri: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minlength: 1,
    validate: {
      validator: function(v) {
        return /^[a-z0-9_]*$/.test(v);
      },
      message: 'board uri can contain only letters and numbers'
    }
  },
  name:                { type: String, default: '' },
  desc:                { type: String, default: '' },
  header:              { type: String, default: '' },
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
  isForcedAnon:        { type: Boolean, default: false },
  defaultStyle:        { type: String, default: '' },
  locale:              { type: String, default: 'en' },
  allowNoFilesOp:      { type: Boolean, default: false },
  allowNoMessageOp:    { type: Boolean, default: false },
  enableReporting:     { type: Boolean, default: true },
  enableCaptcha:       { type: Boolean, default: false },
  enableArchiving:     { type: Boolean, default: true },
  enableCatalog:       { type: Boolean, default: true },
  enableSage:          { type: Boolean, default: true },
  permanentSage:       { type: Boolean, default: false },
  isHidden:            { type: Boolean, default: false },
  filetypes: [{
    type: Schema.Types.ObjectId,
    ref: 'Filetype'
  }],
  postcount: {
    type: Number,
    default: 0,
    get: v => Math.round(v),
    set: v => Math.round(v),
    min: 0
  }
});

boardSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(boardSchema.obj);
};

boardSchema.statics.findBoards = (boardUri, inclHidden = true) => {
  const q = {};
  if (!inclHidden) {
    q.isHidden = { $ne: true };
  }
  if (boardUri) {
    q.uri = boardUri;
  }
  const query = boardUri
    ? Board.findOne(q)
    : Board.find(q);
  return query.select({
    uri: 1,
    name: 1,
    desc: 1,
    imageUri: 1,
    maxFileSize: 1,
    maxFilesPerPost: 1,
    maxPages: 1,
    maxThreadsOnPage: 1,
    autosage: 1,
    showReplies: 1,
    showRepliesSticky: 1,
    maxMessageLength: 1,
    createdDate: 1,
    defaultPosterName: 1,
    isLocked: 1,
    isForcedAnon: 1,
    isTrial: 1,
    isPopular: 1,
    defaultStyle: 1,
    locale: 1,
    allowNoFilesOp: 1,
    allowNoMessageOp: 1,
    enableReporting: 1,
    enableCaptcha: 1,
    enableArchiving: 1,
    enableCatalog: 1,
    enableSage: 1
  });
};

const Board = module.exports = mongoose.model('Board', boardSchema);
