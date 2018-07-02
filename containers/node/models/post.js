const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Int32 = require('mongoose-int32');
const bcrypt = require('bcrypt');
const config = require('../config.json');


const attachmentSchema = Schema({
  /* uploaded file md5 hash (hex string) */
  hash:                { type: String, index: true },
  /* original file name */
  name:                { type: String },
  /* origina file */
  file:                { type: String },  // path to file
  width:               { type: Number },  // pixels
  height:              { type: Number },  // pixels
  /* thumbnail */
  thumb:               { type: String },  // path to file
  thumbWidth:          { type: Number },  // pixels
  thumbHeight:         { type: Number },  // pixels
  /* duration in seconds for video and audio files */
  duration:            { type: Number },
  /* attachment type (image, video, etc) */
  type:                { type: String, enum: ['image', 'video', 'audio', 'document', 'archive', 'unknown'] },
  /* attachment file size in bytes */
  size:                { type: Number },
  isDeleted:           { type: Boolean, default: false },
  isNSFW:              { type: Boolean, default: false },
  isSpoiler:           { type: Boolean, default: false },
});

const reflinkSchema = Schema({
  src: {
    type: ObjectId,
    ref: 'Post'
  },
  boardUri: { type: String },
  postId: { type: Int32 },
  threadId: { type: Int32 },
  isOp:     { type: Boolean },
});

const postSchema = Schema({
  /* primary key for post, autoincrement, unique for each board */
  postId: {
    type: Int32,
    index: true,
    default: 1,
    min: 1,
  },
  /* postId of parent thread on same board (if this post not OP) */
  threadId: { type: Int32 },
  /* board string */
  boardUri:            { type: String, required: true },
  /* ref to board */
  board: {
    type: ObjectId,
    required: true,
    ref: 'Board'
  },
  /* ref to parent thread (if this post is not OP) */
  parent: {
    type: ObjectId,
    ref: 'Post'
  },
  /* refs to child posts (if this post is OP) */
  children: [{
    type: ObjectId,
    ref: 'Post'
  }],
  timestamp:           { type: Date, default: Date.now },
  bumped:              { type: Date, default: Date.now },
  name:                { type: String, default: '' },
  tripcode:            { type: String, default: '' },
  email:               { type: String, default: '' },
  subject:             { type: String, default: '' },
  /* unparsed post body as it was sent by user */
  body:                { type: String, default: '' },
  /* parsed post body as HTML, ready for template */
  rawHtml:             { type: String, default: '' },
  /* parsed post body with token objects to maintain references */
  parsed:              [ ],
  replies:             [ reflinkSchema ],
  references:          [ reflinkSchema ],
  attachments:         [ attachmentSchema ],
  isOp:                { type: Boolean, default: false },
  // op only
  isSticky:            { type: Boolean, default: false },
  isClosed:            { type: Boolean, default: false },
  // replies only
  isSage:              { type: Boolean, default: false },
  // private fields for administrator eyes only
  ip:                  { type: String, required: true },
  password:            { type: String, default: '' },
  isApproved:          { type: Boolean, default: true },
  isDeleted:           { type: Boolean, default: false }
});


postSchema.pre('save', async function(next) {
  if (this.isNew) {
    // put replies and references to other posts
    const refToThis = {
      src: this._id,
      boardUri: this.boardUri,
      threadId: this.threadId,
      postId: this.postId,
      isOp: this.isOp
    };

    const matchQueries = type =>
      this.parsed
        .filter(el => el.type === type && el.resolved)
        .map(el => ({_id: el.resolved.src}));
    const selectQuery = type => ({ $or: matchQueries(type) });
    const updateQuery = key => ({ $addToSet: { [key]: refToThis } });
    const updateMany = (type, key) => {
      const sel = selectQuery(type);
      if (!sel.$or.length) {
        return null;
      }
      return Post.updateMany(sel, updateQuery(key));
    };

    const [replies, references, password] = await Promise.all([
      // put replies to posts this post has links to
      updateMany('reply', 'replies'),
      // put references to posts this post has links to
      updateMany('reference', 'references'),
      // replace password with hash
      bcrypt.hash(this.password, config.salt_rounds)
    ]);

    this.password = password;
  }
  next();
});


postSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


postSchema.statics.findRefs = (postsQueryList) => {
  return Post
    .aggregate({ $match: { $or: postsQueryList } })
    .project({
        src: '$_id',
        _id: 0,
        postId: 1,
        boardUri: 1,
        isOp: 1,
        threadId: 1
      });
};


const cachedUniqueUserPosts = {};

postSchema.statics.getNumberOfUniqueUserPosts = async (boardUri) => {
  if (cachedUniqueUserPosts.hasOwnProperty(boardUri)) {
    return cachedUniqueUserPosts[boardUri];
  }

  const queryResult = await Post.aggregate([
    { $match: {boardUri: boardUri} },
    { $group: { _id: "$ip"} },
    { $group: { _id: 1, unique: { $sum: 1 } } }
  ]);
  if (!queryResult.length || !queryResult[0].unique) {
    return 0;
  }
  cachedUniqueUserPosts[boardUri] = queryResult[0].unique;
  return cachedUniqueUserPosts[boardUri];
};

postSchema.pre('save', function(next) {
  delete cachedUniqueUserPosts[this.boardUri];
  next();
});


postSchema.statics.findThreads = (array) => {
  return Post.find({ $or: array, isOp: true });
};


postSchema.statics.findThread = (boardUri, postId) => {
  return Post.findOne({
    boardUri: boardUri,
    postId: postId,
    isOp: true
  });
};


postSchema.statics.findPost = (boardUri, postId) => {
  const q = {
    isApproved: true,
    isDeleted: false
  };
  if (boardUri) {
    q.boardUri = boardUri;
  }
  if (postId) {
    q.postId = postId;
  }
  return Post
    .find(q)
    .select({
      _id: 0,
      postId: 1,
      timestamp: 1,
      name: 1,
      tripcode: 1,
      email: 1,
      subject: 1,
      parsed: 1,
      isSage: 1,
      isOp: 1,
      threadId: 1,
      replies: 1,
      references: 1
    });
};


postSchema.statics.getSortedThreads = (board) =>
  Post
    .find({
      boardUri: board.uri,
      parent: { $exists: false }
    })
    .sort({ isSticky: -1, bumped: -1})
    .limit(board.maxPages * board.maxThreadsOnPage);


postSchema.virtual('numberOfAttachmentsInThread').get(function () {
  if (!this.children.length) {
    return 0;
  }
  return this.children.reduce((acc, child) => {
    return acc + (child.attachments ? child.attachments.length : 0);
  }, 0);
});



const Post = module.exports = mongoose.model('Post', postSchema);
