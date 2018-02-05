const ObjectId = require('mongoose').Types.ObjectId;
const { generateThread, generateBoardPages } = require('./generate');
const { uploadFile } = require('./upload');
const Board = require('../models/board');
const Post = require('../models/post');
const Parser = require('./parser');


module.exports.createThread = async (boardUri, postData, file) => {
  const board = await Board.findOne({ uri: boardUri }).exec();

  if (!board) {
    const error = Error('no such board: ' + boardUri);
    error.type = 'input_error';
    error.reason = 'invalid_value';
    throw error;
  }
  if (board.newThreadsRequired.message && !postData.body) {
    const error = Error('New threads must contain message');
    error.type = 'input_error';
    error.reason = 'missing_value';
    throw error;
  }
  if (board.newThreadsRequired.subject && !postData.subject) {
    const error = Error('New threads must contain subject');
    error.type = 'input_error';
    error.reason = 'missing_value';
    throw error;
  }
  if (board.newThreadsRequired.files && !file) {
    const error = Error('New threads must include image');
    error.type = 'input_error';
    error.reason = 'missing_value';
    throw error;
  }
  if (!postData.body && !file) {
    const error = Error('No comment entered');
    error.type = 'input_error';
    error.reason = 'missing_value';
    throw error;
  }

  if (file) {
    try {
      const fileDocument = await uploadFile(boardUri, file);
      postData.attachments = [fileDocument];
    } catch (error) {
      throw error;
    }
  }

  if (board.isForcedAnon || !postData.name) {
    postData.name = board.defaultPosterName;
  }
  postData.postId = board.postcount + 1;
  postData.board = board._id;
  postData.isOp = true;

  const post = new Post(postData);
  await Parser.parsePost(post);
  await post
    .save()
    .then(generateThread);
  await Board
      .findByIdAndUpdate(board._id, { $inc: { postcount: 1 } }, { new: true })
      .then(generateBoardPages);

  return post.postId;
};


module.exports.createReply = async (boardUri, threadId, postData, file) => {
  const thread = await Post
    .findThread(boardUri, threadId)
    .exec();
  const board = await Board.findOne({ uri: boardUri }).exec();

  if (!board) {
    const error = Error('no such board: ' + boardUri);
    error.type = 'input_error';
    error.reason = 'invalid_value';
    throw error;
  }
  if (!thread) {
    const error = Error(`No thread to reply to: ${ boardUri }/${ threadId }`);
    error.type = 'input_error';
    error.reason = 'invalid_value';
    throw error;
  }
  if (!postData.body && !file) {
    const error = Error('No comment entered');
    error.type = 'input_error';
    error.reason = 'missing_value';
    throw error;
  }

  if (file) {
    try {
      const fileDocument = await uploadFile(boardUri, file);
      postData.attachments = [fileDocument];
    } catch (error) {
      throw error;
    }
  }

  if (board.isForcedAnon || !postData.name) {
    postData.name = board.defaultPosterName;
  }
  postData.postId = board.postcount + 1;
  postData.board = ObjectId(board._id);
  postData.parent = ObjectId(thread._id);
  postData.isOp = false;

  const post = new Post(postData);
  const boardUpdateParams = { $inc: { postcount: 1 } };
  const threadUpdateParams = { $push: { children: ObjectId(post._id) } };
  if (!postData.isSage) {
    threadUpdateParams.bumped = post.timestamp;
  }
  await Parser.parsePost(post);
  await post.save();
  await Post
    .findByIdAndUpdate(ObjectId(thread._id), threadUpdateParams, { new: true })
  await Post
    .findThreads(boardUri, threadId, true)
    .then((t) => generateThread(t[0]));
  await Board
    .findByIdAndUpdate(ObjectId(board._id), boardUpdateParams, { new: true })
    .then(generateBoardPages);

  return post.postId;
};
