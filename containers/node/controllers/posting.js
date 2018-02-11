const ObjectId = require('mongoose').Types.ObjectId;
const { generateThread, generateBoardPagesAndCatalog } = require('./generate');
const { uploadFile } = require('./upload');
const Board = require('../models/board');
const Post = require('../models/post');
const Parser = require('./parser');


const InputError = (msg, reason) => {
  const error = Error(msg);
  error.type = 'input_error';
  error.reason = reason;
  return error;
};


const uploadFiles = (boardUri, files) =>
  Promise.all(files.map(file => uploadFile(boardUri, file)));


module.exports.createThread = async (boardUri, postData, files = []) => {
  const board = await Board.findOne({ uri: boardUri }).exec();
  if (!board) {
    throw InputError('no such board: ' + boardUri, 'invalid_value');
  }
  if (files.length > board.maxFilesPerPost) {
    throw InputError('Too many files', 'max_array_length');
  }
  if (!postData.body && !files.length) {
    throw InputError('No comment entered', 'missing_value');
  }
  if (board.newThreadsRequired.message && !postData.body) {
    throw InputError('New threads must contain message', 'missing_value');
  }
  if (board.newThreadsRequired.subject && !postData.subject) {
    throw InputError('New threads must contain subject', 'missing_value');
  }
  if (board.newThreadsRequired.files && !files.length) {
    throw InputError('New threads must include image', 'missing_value');
  }

  if (files.length) {
    postData.attachments = await uploadFiles(boardUri, files);
  }

  if (board.isForcedAnon || !postData.name) {
    postData.name = board.defaultPosterName;
  }
  postData.postId = postData.threadId = board.postcount + 1;
  postData.board = board._id;
  postData.isOp = true;

  const post = new Post(postData);
  await Parser.parsePost(post);
  await post
    .save()
    .then(generateThread);
  await Board
      .findByIdAndUpdate(board._id, { $inc: { postcount: 1 } }, { new: true })
      .then(generateBoardPagesAndCatalog);

  return post.postId;
};


module.exports.createReply = async (boardUri, threadId, postData, files = []) => {
  const [thread, board] = await Promise.all([
      Post.findThread(boardUri, threadId).exec(),
      Board.findOne({ uri: boardUri }).exec()
    ]);

  if (!board) {
    throw InputError('no such board: ' + boardUri, 'invalid_value');
  }
  if (!thread) {
    throw InputError(`No thread to reply to: ${ boardUri }/${ threadId }`, 'invalid_value');
  }
  if (files.length > board.maxFilesPerPost) {
    throw InputError('Too many files', 'max_array_length');
  }
  if (!postData.body && !files.length) {
    throw InputError('No comment entered', 'missing_value');
  }

  if (files.length) {
    postData.attachments = await uploadFiles(boardUri, files);
  }

  if (board.isForcedAnon || !postData.name) {
    postData.name = board.defaultPosterName;
  }
  postData.postId = board.postcount + 1;
  postData.threadId = thread.postId;
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
    .then(generateBoardPagesAndCatalog);

  return post.postId;
};
