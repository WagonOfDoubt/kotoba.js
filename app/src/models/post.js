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


const postSchema = Schema({
  /**
   * READ ONLY. Sequential number of post unique to post's board.
   * @type {Int32}
   */
  postId: {
    type: Int32,
    index: true,
    default: 1,
    min: 1,
  },
  /**
   * READ ONLY. Sequential number of parent thread unique to thread's board.
   * @type {Int32}
   */
  threadId: { type: Int32 },
  /**
   * Uri of board this post is posted on.
   * @see  models/board
   * @type {String}
   */
  boardUri:            { type: String, required: true },
  // todo redundant. delete?
  board: {
    type: ObjectId,
    required: true,
    ref: 'Board'
  },
  /**
   * READ ONLY. REPLY ONLY. Ref to parent thread.
   * @type {ObjectId}
   */
  parent: {
    type: ObjectId,
    ref: 'Post'
  },
  /**
   * READ ONLY. OP ONLY. Ref to replies to thread.
   * @type {Array[ObjectId]}
   */
  children: [{
    type: ObjectId,
    ref: 'Post'
  }],
  /**
   * READ ONLY. Date of post creation.
   * @type {Date}
   */
  timestamp:           { type: Date, default: Date.now },
  /**
   * OP ONLY. READ ONLY. Date of last non-sage reply to thread for sorting
   * threads.
   * @type {Date}
   */
  bumped:              { type: Date, default: Date.now },
  /**
   * INPUT. Poster name. Can be edited by original poster with password or by
   * user with role with permission to edit other's posts.
   * @type {String}
   */
  name:                { type: String, default: '' },
  /**
   * INPUT. Poster tripcode.
   * @type {String}
   */
  tripcode:            { type: String, default: '' },
  /**
   * INPUT. Poster link or e-mail. Can be edited by original poster with
   * password or by user with role with permission to edit other's posts.
   * @type {String}
   */
  email:               { type: String, default: '' },
  /**
   * INPUT. Post subject. Can be edited by original poster with password or by
   * user with role with permission to edit other's posts.
   * @type {String}
   */
  subject:             { type: String, default: '' },
  /**
   * INPUT. Unparsed original post body as it was written by poster. Can be
   * edited by original poster with password or by user with role with
   * permission to edit other's posts.
   * @type {String}
   */
  body:                { type: String, default: '' },
  /**
   * READ ONLY. Parsed post body for using in resulting template.
   * @type {String}
   */
  rawHtml:             { type: String, default: '' },
  /**
   * READ ONLY. Intermediate parsing result with HTML strirngs and token
   * objects. Post can be re-parsed to update references to moved posts.
   * @type {Array[String, Object]}
   */
  parsed:              [ ],
  /**
   * READ ONLY. Refs to posts that are referencing this post. Replies
   * are reflinks on separate line, and therefore can be used to divide post
   * into sections.
   * @see models/schema/reflink
   * @type {Array[ReflinkSchema]}
   */
  replies:             [ reflinkSchema ],
  /**
   * READ ONLY. Refs to posts that are referencing this post. References are
   * inline reflinks.
   * @see models/schema/reflink
   * @type {Array[ReflinkSchema]}
   */
  references:          [ reflinkSchema ],
  /**
   * INPUT. Array of post's attachments.
   * @see models/schema/attachment
   * @type {Array[AttachmentSchema]}
   */
  attachments:         [ attachmentSchema ],
  /**
   * READ ONLY. Is this post a thread-starting. Can be changed by user who
   * have role with permission to merge threads.
   * @type {Boolean}
   */
  isOp:                { type: Boolean, default: false },
  /**
   * OP ONLY. Is thread always on top. This field can be changed by user with
   * role with write permission which assigned on board to which this posts
   * belongs.
   * @type {Boolean}
   */
  isSticky:            { type: Boolean, default: false },
  /**
   * OP ONLY. Is thread closed for posting. This field can be changed by user
   * with role with write permission which assigned on board to which this
   * posts belongs.
   * @type {Boolean}
   */
  isClosed:            { type: Boolean, default: false },
  /**
   * INPUT. Do not bump thread. This field can be changed by user with role
   * with write permission which assigned on board to which this posts belongs
   * or by password.
   * @type {Boolean}
   */
  isSage:              { type: Boolean, default: false },
  /**
   * READ ONLY. Poster IP. Users are required to have role on post's board with
   * permission.
   * @type {String}
   */
  ip:                  { type: String, required: true },
  /**
   * READ ONLY. Hash of poster posting password (for edition/deletion)
   * @type {String}
   */
  password:            { type: String, default: '' },
  /**
   * INPUT. Parsed useragent of poster.
   * @see models/schema/useragent
   * @type {UseragentSchema}
   */
  useragent:           { type: useragentSchema, required: true },
  /**
   * Reserved for future use. This field can be changed by user with role with
   * write permission which assigned on board to which this post belongs.
   * @type {Boolean}
   */
  isApproved:          { type: Boolean, default: true },
  /**
   * Is post marked as deleted. Deleted posts are not shown and can be
   * either restored by changing this flag or be deleted permanently. This
   * field can be changed by user with role with write permission which
   * assigned on board to which this posts belongs or by password.
   * @type {Boolean}
   */
  isDeleted:           { type: Boolean, default: false },
  /**
   * READ ONLY. Priorities for previous changes to lock property from changing
   * by user with lower priority. Object contains paths as keys and values are
   * Int32.
   * @type {Object}
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
 * Compares this post's password hash with supplied password.
 * @param {String} password - raw, unencrypted password
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

postSchema.statics.isPostField = regExpTester(createRegExpFromArray(postFields));
postSchema.statics.isAttachmentField = regExpTester(createRegExpFromArray(attachmentFields));
postSchema.statics.isEditablePostField = regExpTester(createRegExpFromArray(allEditableFields));
postSchema.statics.toKey = ({boardUri, postId}) => `post-${boardUri}-${postId}`;


const cachedUniqueUserPosts = {};

/**
 * Get number of unique IP addresses of posters on a board.
 * @param {String} boardUri
 * @returns {Number} Number of unique IP addresses of posters on given board.
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
};

/**
 * Find threads by mongo document _id.
 * @param {Array<ObjectId>} ids - Array of ObjectId.
 */
postSchema.statics.findThreadsByIds = (ids) => {
  return Post.find({ _id: { $in: ids }, isOp: true });
};

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
