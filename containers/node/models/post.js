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

const postSchema = Schema({
  postId:              { type: Number, default: 1, min: 1, index: true },
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
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Post'
  }],
  references: [{
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
  return Post.aggregate([
    {
      $match: {
        $or: postsQueryList
      }
    },
    {
      $lookup: {
        from: "posts",
        localField: "parent",
        foreignField: "_id",
        as: "threadId"
      }
    },
    {
      $project: {
        _id: 0,
        postId: 1,
        boardUri: 1,
        threadId: {
          $cond: ['$isOp', '$postId',
            {
              $let: {
                vars: {
                  op: {
                    $arrayElemAt: ['$threadId', 0]
                  }
                },
                in: '$$op.postId'
              }
            }
          ]
        }
      }
    }
  ]);
};


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
          rawHtml: 1,
          attachments: 1,
          isSage: 1,
          isSticky: 1,
          children: 1,
          isOp: 1,
          children: {
            postId: 1,
            boardUri: 1,
            timestamp: 1,
            name: 1,
            attachments: 1,
            tripcode: 1,
            email: 1,
            subject: 1,
            rawHtml: 1,
            isSage: 1,
            isOp: 1,
            threadId: '$postId'
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
      rawHtml: 1,
      isSage: 1,
      isOp: 1
    })
    .populate([
      { path: 'replies', select: 'postId -_id' },
      { path: 'parent', select: 'postId -_id' },
      { path: 'references', select: 'postId -_id' },
      { path: 'attachments', select: '-_id -file_hex' }
    ]);
};

const Post = module.exports = mongoose.model('Post', postSchema);
