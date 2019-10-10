/**
 * Mongoose model for posts on board
 * @module models/post
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Int32 = require('mongoose-int32');
const bcrypt = require('bcrypt');
const config = require('../json/config.json');
const reflinkSchema = require('./schema/reflink');
const attachmentSchema = require('./schema/attachment');
const useragentSchema = require('./schema/useragent');
const { createRegExpFromArray, regExpTester } = require('../utils/regexp');


/**
 * Post Mongoose model
 * @class Post
 * @extends external:Model
 */
const postSchema = Schema({
  /**
   * Sequential number of post unique to post's board.
   * @type {Int32}
   * @memberOf module:models/post~Post
   * @instance
   */
  postId: {
    type: Int32,
    index: true,
    default: 1,
    min: 1,
  },
  /**
   * Sequential number of parent thread unique to thread's board.
   * @type {Int32}
   * @memberOf module:models/post~Post
   * @instance
   */
  threadId: { type: Int32 },
  /**
   * Uri of board this post is posted on.
   * @see  module:models/board
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  boardUri:            {
    type: String,
    required: true,
    index: true,
  },
  /**
   * REPLY ONLY. Ref to parent thread.
   * @type {ObjectId}
   * @memberOf module:models/post~Post
   * @instance
   */
  parent: {
    type: ObjectId,
    ref: 'Post'
  },
  /**
   * Date of post creation.
   * @type {Date}
   * @memberOf module:models/post~Post
   * @instance
   */
  timestamp:           { type: Date, default: Date.now },
  /**
   * OP ONLY. Date of last non-sage reply to thread for sorting threads.
   * @type {Date}
   * @memberOf module:models/post~Post
   * @instance
   */
  bumped:              { type: Date, default: Date.now },
  /**
   * INPUT. Poster name. Can be edited by original poster with password or by
   *    user with role with permission to edit other's posts.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  name:                { type: String, default: '' },
  /**
   * INPUT. Poster tripcode.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  tripcode:            { type: String, default: '' },
  /**
   * INPUT. Poster link or e-mail. Can be edited by original poster with
   *    password or by user with role with permission to edit other's posts.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  email:               { type: String, default: '' },
  /**
   * INPUT. Post subject. Can be edited by original poster with password or by
   *    user with role with permission to edit other's posts.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  subject:             { type: String, default: '' },
  /**
   * INPUT. Unparsed original post body as it was written by poster. Can be
   *    edited by original poster with password or by user with role with
   *    permission to edit other's posts.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  body:                { type: String, default: '' },
  /**
   * Intermediate parsing result with HTML strings and token objects. Post can
   *    be re-parsed to update references to moved posts.
   * @type {Array<String|Object>}
   * @memberOf module:models/post~Post
   * @instance
   */
  parsed:              [ ],
  /**
   * Refs to posts that are referencing this post. Replies are
   *    reflinks on separate line, and therefore can be used to divide post
   *    into sections.
   * @see module:models/schema/reflink
   * @type {Array<module:models/schema/reflink~Reflink>}
   * @memberOf module:models/post~Post
   * @instance
   */
  replies:             [ reflinkSchema ],
  /**
   * Refs to posts that are referencing this post. References are inline
   *    reflinks.
   * @see module:models/schema/reflink
   * @type {Array<module:models/schema/reflink~Reflink>}
   * @memberOf module:models/post~Post
   * @instance
   */
  references:          [ reflinkSchema ],
  /**
   * INPUT. Array of post's attachments.
   * @see models/schema/attachment
   * @type {Array<module:models/schema/attachment~Attachment>}
   * @memberOf module:models/post~Post
   * @instance
   */
  attachments:         [ attachmentSchema ],
  /**
   * Is this post a thread-starting. Can be changed by user who have role with
   *    permission to merge threads.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default false
   */
  isOp:                { type: Boolean, default: false },
  /**
   * OP ONLY. Is thread always on top. This field can be changed by user with
   *    role with write permission which assigned on board to which this posts
   *    belongs.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default false
   */
  isSticky:            { type: Boolean, default: false },
  /**
   * OP ONLY. Is thread closed for posting. This field can be changed by user
   *    with role with write permission which assigned on board to which this
   *    posts belongs.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default false
   */
  isClosed:            { type: Boolean, default: false },
  /**
   * INPUT. Do not bump thread. This field can be changed by user with role
   *    with write permission which assigned on board to which this posts
   *    belongs or by password.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default false
   */
  isSage:              { type: Boolean, default: false },
  /**
   * Poster IP. Users are required to have role on post's board with
   *    permission.
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  ip:                  { type: String, required: true },
  /**
   * Hash of poster posting password (for edition/deletion)
   * @type {String}
   * @memberOf module:models/post~Post
   * @instance
   */
  password:            { type: String, default: '' },
  /**
   * INPUT. Parsed useragent of poster.
   * @see models/schema/useragent
   * @type {module:models/schema/useragent~Useragent}
   * @memberOf module:models/post~Post
   * @instance
   */
  useragent:           { type: useragentSchema, required: true },
  /**
   * Reserved for future use. This field can be changed by user with role with
   *    write permission which assigned on board to which this post belongs.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default true
   */
  isApproved:          { type: Boolean, default: true },
  /**
   * Is post marked as deleted. Deleted posts are not shown and can be either
   *    restored by changing this flag or be deleted permanently. This field
   *    can be changed by user with role with write permission which assigned
   *    on board to which this posts belongs or by password.
   * @type {Boolean}
   * @memberOf module:models/post~Post
   * @instance
   * @default false
   */
  isDeleted:           { type: Boolean, default: false },
  /**
   * Priorities for previous changes to lock property from changing by user
   *    with lower priority. Object contains paths as keys and values are
   *    Int32.
   * @type {Object}
   * @memberOf module:models/post~Post
   * @instance
   */
  changes:             { type: Object }
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
 * Compares this post's password hash with supplied password
 * @param {String} password Raw, unencrypted password
 * @returns {boolean} True, if password is correct
 * @memberOf module:models/post~Post
 * @alias module:models/post~Post#checkPassword
 * @instance
 */
postSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


/**
 * Create reflink that references this post
 * @returns {Object} Reflink to this post
 * @memberOf module:models/post~Post
 * @alias module:models/post~Post#toReflink
 * @instance
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


/**
 * Find all reflinks to selected posts
 * @param  {Array.<Object>} postsQueryList Array of MongoDB matches for posts
 * @return {external:Query}                         Mongoose query
 * @memberOf module:models/post~Post
 * @alias module:models/post~Post.findRefs
 * @static
 */
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

const attachmentFields = [
  // attachments
  'attachments.$[n].isDeleted', 'attachments.$[n].isNSFW', 'attachments.$[n].isSpoiler'
];


const postFields = [
  // threads
  'isSticky', 'isClosed',
  // posts
  'isSage', 'isApproved', 'isDeleted',
];


const allEditableFields = [...postFields, ...attachmentFields];

/**
 * Check if property is post field
 * @param {String} key Property name or path
 * @alias module:models/post~Post.isPostField
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {Boolean} True, if key is post field
 */
postSchema.statics.isPostField = regExpTester(createRegExpFromArray(postFields));
/**
 * Check if property is attachment field
 * @param {String} key Property name or path
 * @alias module:models/post~Post.isAttachmentField
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {Boolean} True, if key is attachment field
 */
postSchema.statics.isAttachmentField = regExpTester(createRegExpFromArray(attachmentFields));
/**
 * Check if property is editable post field
 * @param {String} key Property name or path
 * @alias module:models/post~Post.isEditablePostField
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {Boolean} True, if key is editable post field
 */
postSchema.statics.isEditablePostField = regExpTester(createRegExpFromArray(allEditableFields));
/**
 * Convert post to string like "post-${boardUri}-${postId}" that can be used
 *    as id attribute in template
 * @alias module:models/post~Post.toKey
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {String} "post-${boardUri}-${postId}"
 */
postSchema.statics.toKey = ({boardUri, postId}) => `post-${boardUri}-${postId}`;


/**
 * Get number of unique IP addresses of posters on a board
 * @param {String} boardUri Board uri
 * @returns {Number} Number of unique IP addresses of posters on given board
 * @alias module:models/post~Post.getNumberOfUniqueUserPosts
 * @memberOf module:models/post~Post
 * @static
 * @function
 */
postSchema.statics.getNumberOfUniqueUserPosts = async (boardUri) => {
  const queryResult = await Post.aggregate([
    {
      $match: {
        boardUri: boardUri,
        isDeleted: false,
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
  return queryResult[0].unique;
};


/**
 * Find all threads that match any query filter document in an array. Typical
 *    usage is to find threads by boardUri and postId.
 * @param {Array<Object>} array Array of mongo query filter documents
 * @alias module:models/post~Post.findThreads
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
 */
postSchema.statics.findThreads = (array) => {
  return Post.find({ $or: array, isOp: true });
};


/**
 * Find all posts that match any query filter document in an array. Typical
 *    usage is to find posts by boardUri and postId.
 * @param {Array<Object>} array Array of mongo query filter documents.
 * @alias module:models/post~Post.findPosts
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
 */
postSchema.statics.findPosts = (array) => {
  return Post.find({ $or: array });
};


/**
 * Find posts by mongo document _id
 * @param {Array<ObjectId>} ids Array of ObjectId
 * @alias module:models/post~Post.findPostsByIds
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
 */
postSchema.statics.findPostsByIds = (ids) => {
  return Post.find({ _id: { $in: ids } });
};

/**
 * Find threads by mongo document _id
 * @param {Array<ObjectId>} ids Array of ObjectId
 * @alias module:models/post~Post.findThreadsByIds
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
 */
postSchema.statics.findThreadsByIds = (ids) => {
  return Post.find({ _id: { $in: ids }, isOp: true });
};

/**
 * Find one thread by it's boardUri and postId.
 * @param {String} boardUri Board uri
 * @param {Number} postId   Op post id
 * @alias module:models/post~Post.findThread
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
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
 * @alias module:models/post~Post.findPost
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {external:Query} Mongoose query
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
 * Find all threads on board sorted by bump order
 * @param {Document} board board mongoose document
 * @async
 * @alias module:models/post~Post.getSortedThreads
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {Array<Post>} Array of Post documents with children field
 *    populated
 */
postSchema.statics.getSortedThreads = async (board) => {
  const posts = await Post
    .find({
      boardUri: board.uri,
      parent: { $exists: false },
      isDeleted: false
    })
    .sort({ isSticky: -1, bumped: -1})
    .limit(board.maxPages * board.maxThreadsOnPage)
    .populate('children');
  // populate each post with same board document, because mongoose populate will
  // create one instance of board per post, and there will be unnecessary
  // queries to database
  posts.forEach(p => p.board = board);
  return posts;
};


/**
 * Get number of attachments across all posts in thread
 * @readOnly
 * @alias module:models/post~Post.numberOfAttachmentsInThread
 * @memberOf module:models/post~Post
 * @static
 * @function
 * @returns {Number} Number of attachments
 */
postSchema.virtual('numberOfAttachmentsInThread').get(function () {
  if (!this.children.length) {
    return 0;
  }
  return this.children.reduce((acc, child) => {
    return acc + (child.attachments ? child.attachments.length : 0);
  }, 0);
});


/**
 * OP ONLY. Array of replies in thread.
 * @type {Array<Post>}
 * @readOnly
 * @alias module:models/post~Post#children
 * @memberOf module:models/post~Post
 * @instance
 */
postSchema.virtual('children', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'parent',
  justOne: false,
  options: { sort: { timestamp: 1 } }
});


/**
 * Post's board document
 * @type {Board}
 * @readOnly
 * @alias module:models/post~Post#board
 * @memberOf module:models/post~Post
 * @instance
 */
postSchema.virtual('board', {
  ref: 'Board',
  localField: 'boardUri',
  foreignField: 'uri',
  justOne: true,
});

const Post = module.exports = mongoose.model('Post', postSchema);
