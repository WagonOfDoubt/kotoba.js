const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Int32 = require('mongoose-int32');
const bcrypt = require('bcrypt');
const config = require('../config.json');
const reflinkSchema = require('./schema/reflink');
const attachmentSchema = require('./schema/attachment');
const useragentSchema = require('./schema/useragent');


const postSchema = Schema({
  /* primary key for post, autoincrement, unique for each board */
  postId: {                                               // generated
    type: Int32,
    index: true,
    default: 1,
    min: 1,
  },
  /* postId of parent thread on same board (if this post not OP) */
  threadId: { type: Int32 },                               // filled by poster
  /* board string */
  boardUri:            { type: String, required: true },   // filled by poster
  /* ref to board */
  board: {                                                 // generated
    type: ObjectId,
    required: true,
    ref: 'Board'
  },
  /* ref to parent thread (if this post is not OP) */
  parent: {                                                // generated (not OP)
    type: ObjectId,
    ref: 'Post'
  },
  /* refs to child posts (if this post is OP) */
  children: [{                                             // generated (OP only)
    type: ObjectId,
    ref: 'Post'
  }],
  timestamp:           { type: Date, default: Date.now },  // generated
  bumped:              { type: Date, default: Date.now },  // generated (OP only)
  name:                { type: String, default: '' },      // filled by poster
  tripcode:            { type: String, default: '' },      // filled by poster
  email:               { type: String, default: '' },      // filled by poster
  subject:             { type: String, default: '' },      // filled by poster
  /* unparsed post body as it was sent by user */
  body:                { type: String, default: '' },      // filled by poster
  /* parsed post body as HTML, ready for template */
  rawHtml:             { type: String, default: '' },      // generated
  /* parsed post body with token objects to maintain references */
  parsed:              [ ],                                // generated
  replies:             [ reflinkSchema ],                  // generated
  references:          [ reflinkSchema ],                  // generated
  attachments:         [ attachmentSchema ],               // filled by poster
  isOp:                { type: Boolean, default: false },  // can be changed by mod when merging threads
  // op only
  isSticky:            { type: Boolean, default: false },  // can be changed by mod
  isClosed:            { type: Boolean, default: false },  // can be changed by mod
  // replies only
  isSage:              { type: Boolean, default: false },  // filled by poster
  // private fields
  ip:                  { type: String, required: true },   // immutable
  password:            { type: String, default: '' },      // immutable
  useragent:           { type: useragentSchema, required: true },   // immutable
  isApproved:          { type: Boolean, default: true },   // can be changed by mod
  isDeleted:           { type: Boolean, default: false }   // can be changed by mod
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


/**
 * Compares this post's password hash with supplied password.
 * @param {String} password - raw, unencripted password
 * @returns {boolean} true, if password is correct
 */
postSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


/**
 * @returns {Object} Reflink to this post
 */
postSchema.methods.toReflink = function() {
  return {
    src: this._id,
    boardUri: this.boardUri,
    postId: this.postId,
    threadId: this.threadId,
    isOp: this.isOp,
  };
};


postSchema.statics.findRefs = (postsQueryList) => {
  return Post
    .aggregate([
      {
        $match: {
          $or: postsQueryList
        }
      },
      {
        $project: {
          src: '$_id',
          _id: 0,
          postId: 1,
          boardUri: 1,
          isOp: 1,
          threadId: 1
        }
      }
    ]);
};


const cachedUniqueUserPosts = {};

/**
 * Get number of qnique ip addresses of posters on a board.
 * @param {String} boardUri
 * @returns {Number} Number of unique ip addresses of posters on given board.
 */
postSchema.statics.getNumberOfUniqueUserPosts = async (boardUri) => {
  if (cachedUniqueUserPosts.hasOwnProperty(boardUri)) {
    return cachedUniqueUserPosts[boardUri];
  }

  const queryResult = await Post.aggregate([
    {
      $match: {
        boardUri: boardUri
      }
    },
    {
      $group: {
        _id: "$ip"
      }
    },
    {
      $group: {
        _id: 1,
        unique: {
          $sum: 1
        }
      }
    }
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


/**
 * Find all threads that match any query filter document in an array.
 * Typical usage is to find threads by boardUri and postId.
 * @param {Array<Object>} array - Array of mongo query filter documents.
 */
postSchema.statics.findThreads = (array) => {
  return Post.find({ $or: array, isOp: true });
};

/**
 * Find all posts that match any query filter document in an array.
 * Typical usage is to find posts by boardUri and postId.
 * @param {Array<Object>} array - Array of mongo query filter documents.
 */
postSchema.statics.findPosts = (array) => {
  return Post.find({ $or: array });
};


/**
 * Find posts by mongo document _id.
 * @param {Array<ObjectId>} ids - Array of ObjectId.
 */
postSchema.statics.findPostsByIds = (ids) => {
  return Post.find({ _id: { $in: ids } });
}

/**
 * Find threads by mongo document _id.
 * @param {Array<ObjectId>} ids - Array of ObjectId.
 */
postSchema.statics.findThreadsByIds = (ids) => {
  return Post.find({ _id: { $in: ids }, isOp: true });
}

/**
 * Find one thread by it's boardUri and postId.
 * @param {String} boardUri
 * @param {Number} postId
 */
postSchema.statics.findThread = (boardUri, postId) => {
  return Post.findOne({
    boardUri: boardUri,
    postId: postId,
    isOp: true
  });
};

/**
 * Find one post by it's boardUri and postId.
 * @param {String} boardUri
 * @param {Number} postId
 */
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


/**
 * Find one post by it's boardUri and postId.
 * @param {String} boardUri
 * @param {Object} board - board mongoose document. It must have uri, maxPages
 * and maxThreadsOnPage fields.
 * @returns {Array<Object>} Array of mongoose documents.
 */
postSchema.statics.getSortedThreads = (board) =>
  Post
    .find({
      boardUri: board.uri,
      parent: { $exists: false },
      isDeleted: false
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
