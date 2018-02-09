const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const attachmentSchema = Schema({
  file:                String,
  hash:                Number,
  name:                String,
  size:                Number,
  width:               Number,
  height:              Number,
  thumb:               String,
  thumbWidth:          Number,
  thumbHeight:         Number,
  duration:            Number,
  type:                String
});

const reflinkSchema = Schema({
  src: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  boardUri: String,
  threadId: Number,
  postId: Number,
  isOp: Boolean
});

const postSchema = Schema({
  postId:              { type: Number, default: 1, min: 1, index: true },
  threadId:            { type: Number },
  boardUri:            { type: String, required: true },
  board: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Board'
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'Post'
  }],
  timestamp:           { type: Date, default: Date.now },
  bumped:              { type: Date, default: Date.now },
  name:                { type: String, default: '' },
  tripcode:            { type: String, default: '' },
  email:               { type: String, default: '' },
  subject:             { type: String, default: '' },
  body:                { type: String, default: '' },
  rawHtml:             { type: String, default: '' },
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
  ip:                  { type: String, required: true, select: false },
  password:            { type: String, default: '', select: false },
  isApproved:          { type: Boolean, default: true, select: false },
  isDeleted:           { type: Boolean, default: false, select: false }
});


postSchema.pre('save', async function(next) {
  if (this.isNew) {
    const isRef = el => el.type === 'reference' && el.resolved;
    const isRep = el => el.type === 'reply' && el.resolved;
    const toQuery = el => {
      return {_id: el.resolved.src}
    };
    const refs = this.parsed.filter(isRef).map(toQuery);
    const repls = this.parsed.filter(isRep).map(toQuery);
    const queries = [];
    const refToThis = {
      src: this._id,
      boardUri: this.boardUri,
      threadId: this.threadId,
      postId: this.postId,
      isOp: this.isOp
    };
    if (refs.length) {
      queries.push(
        Post.updateMany({$or: refs}, { $addToSet: { references: refToThis } }));
    }
    if (repls.length) {
      queries.push(
        Post.updateMany({$or: repls}, { $addToSet: { replies: refToThis } }));
    }
    await Promise.all(queries);
  }
  next();
});


postSchema.pre('remove', function(next, done) {
  console.log('removepost')
  // remove all child posts
  Post.find({
    _id: {
      $in: this.children
    }
  })
  .remove()
  // remove references to this post
  .then(
    Post.update(
      {
        $or: [
          { replies: this._id },
          { references: this._id }
        ]
      },
      {
        $pullAll: {
          replies: [this._id],
          references: [this._id]
        }
      }
    )
  )
  .then(done);
  next();
});


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
  console.log(queryResult);
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


postSchema.statics.findThreads = (boardUri, threadId, removeId = true) => {
  // const q = {
  //   parent: { $exists: false }
  // };
  // if (boardUri) {
  //   q.boardUri = boardUri;
  // }
  // if (threadId) {
  //   q.postId = threadId;
  // }
  // const query = boardUri && threadId
  //   ? Post.findOne(q)
  //   : Post.find(q);
  const match = {
    boardUri: boardUri,
    isOp: true
  };
  if (threadId) {
    match.postId = parseInt(threadId)
  }
  return Post.aggregate([
    {
      $match: match
    },
    {
      $lookup: {
        from: "posts",
        localField: "children",
        foreignField: "_id",
        as: "children"
      }
    },
    {
      $project: {
          _id: removeId ? 0 : 1,
          postId: 1,
          boardUri: 1,
          timestamp: 1,
          bumped: 1,
          name: 1,
          tripcode: 1,
          email: 1,
          subject: 1,
          parsed: 1,
          attachments: 1,
          isSage: 1,
          isSticky: 1,
          children: 1,
          isOp: 1,
          replies: 1,
          references: 1,
          children: {
            postId: 1,
            boardUri: 1,
            timestamp: 1,
            name: 1,
            attachments: 1,
            tripcode: 1,
            email: 1,
            subject: 1,
            parsed: 1,
            isSage: 1,
            isOp: 1,
            replies: 1,
            references: 1,
            threadId: 1
          }
        }
      }
    ]);
};


postSchema.statics.findThread = (boardUri, postId) => {
  return Post.findOne({
    boardUri: boardUri,
    postId: postId,
    isOp: true,
    parent: { $exists: false }
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
