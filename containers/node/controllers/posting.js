/**
 * This module handles post manipulation, creation of new post and threads,
 * as well as editing and deletion
 * @module controllers/posting
 */

const ObjectId = require('mongoose').Types.ObjectId;
const { generateThread, generateThreads, generateBoards, generateBoardPagesAndCatalog } = require('./generate');
const { uploadFiles } = require('./upload');
const Board = require('../models/board');
const Post = require('../models/post');
const Parser = require('./parser');
const fs = require('fs-extra');
const config = require('../config');
const path = require('path');
const _ = require('lodash');


/**
 * @todo create custom error types for each case and move somehwere not here
 */
const InputError = (msg, reason) => {
  const error = Error(msg);
  error.type = 'input_error';
  error.reason = reason;
  return error;
};


/**
 * Create new thread by adding it to DB, updating all related records in DB,
 * uplading attachments and generating all related HTML files
 * @async
 * @param {string} boardUri - board directory
 * @param {object} postData - an object containg all necessary fields according
 * to Post schema
 * @param {Array.<object>} files - array of files from req.files (multer)
 * @returns {number} postId - sequential number of new thread
 */
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


/**
 * Create reply in thread by adding it to DB, updating all related records in
 * DB, uplading attachments and generating all related HTML files
 * @async
 * @param {string} boardUri - board directory
 * @param {number} threadId - sequential number of parent post on board
 * @param {object} postData - an object containg all necessary fields according
 * to Post schema
 * @param {Array.<object>} files - array of files from req.files (multer)
 * @returns {number} postId - sequential number of new post
 */
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
    .findThread(boardUri, threadId)
    .populate('children')
    .then(generateThread);
  await Board
    .findByIdAndUpdate(ObjectId(board._id), boardUpdateParams, { new: true })
    .then(generateBoardPagesAndCatalog);

  return post.postId;
};


/**
 * Remove selected posts from database and corresponding attachment files
 * @async
 * @param {Array.<Post>} postsToDelete - array of post mongoose documents
 * @param {boolean} regenerate - regenerate corresponding html files
 * @returns {{ threads: number, replies: number, attachments: number }}
 * An object with fields containing a number of how many threads, replies or
 * attachments were deleted
 */
module.exports.deletePosts = async (postsToDelete, regenerate = true) => {
  // leave only unique posts just in case
  postsToDelete = [...new Set(postsToDelete)];
  // all board pages that contain deleted posts will be regenerated
  const boardsToRegenerate = [...new Set(
    postsToDelete.map(p => ({ uri: p.boardUri}))
  )];
  // if threads was selected for deletion, replies also has to be deleted
  const threadsToDelete = postsToDelete.filter(p => p.isOp);
  const threadsRepliesIds = threadsToDelete
    // extract arrays of children from threads
    .map(t => t.children)
    // flatten to single array
    .reduce((a, b) => a.concat(b), [])
    // exclude ids of posts that are already selected for deletion
    .filter(id => !postsToDelete.find(post => post._id.equals(id)));

  // normal non-op posts selected for deletion
  const repliesToDelete = postsToDelete.filter(p => !p.isOp);
  // threads that contain posts selected for deletion will be regenerated
  const threadsToRegenerate = repliesToDelete
    // but not threads that will be deleted themselves
    .filter(p => !threadsToDelete.find(t => t._id.equals(p.threadId)))
    .map(p => ({ boardUri: p.boardUri, postId: p.threadId }));

  if (threadsRepliesIds.length) {
    // select replies to deleted threads from database
    const threadsReplies = await Post.find({ _id: { $in: threadsRepliesIds } });
    // add replies to deleted threads to deletion list
    postsToDelete = postsToDelete.concat(threadsReplies);
  }

  // now figure out file paths of attachments to deleted posts
  const attachmentsToDelete = postsToDelete
    // extract arrays of attachments form posts
    .map(post => post.attachments)
    // flatten array of attachments
    .reduce((a, b) => a.concat(b), []);
  const attachmentFilesToDelete = attachmentsToDelete
    .map(attachment => [
      path.join(config.html_path, path.dirname(attachment.file)),
      path.join(config.html_path, attachment.thumb)
    ])
    // flatten result again to get plain array of paths to both thumbs and originals
    .reduce((a, b) => a.concat(b), []);

  // delete thread.html, thread-preview.html, images and thumbnail files
  const delThreadsPaths = threadsToDelete.map(t =>
    path.join(config.html_path, t.boardUri, 'res', t.threadId.toString()));
  const filesToDelete = [
    ...delThreadsPaths.map(p => p + '.html'),
    ...delThreadsPaths.map(p => p + '-preview.html'),
    ...attachmentFilesToDelete
  ];

  // prelude ends here, now actually do stuff
  if (postsToDelete.length) {
    // delte posts from database
    const deleteMongoIds = postsToDelete.map(p => p._id);
    await Post.deleteMany({
      _id: { $in: deleteMongoIds }
    });

    // delete all replies and references from other posts in database
    await Post.update({
        $or: [
          {'replies.src': { $in: deleteMongoIds }},
          {'references.src': { $in: deleteMongoIds }}
        ]
      }, {
        $pull: {
          replies: { src: { $in: deleteMongoIds } },
          references: { src: { $in: deleteMongoIds } }
        }
      })
      .exec();
  }
  // regenerate threads
  if (regenerate && threadsToRegenerate.length) {
    await Post.findThreads(threadsToRegenerate)
      .populate('children')
      .then(threads =>
          Promise.all(threads.map(generateThread)));
  }
  // regenerate boards
  if (regenerate && boardsToRegenerate.length) {
    await Board.find({ $or: boardsToRegenerate })
      .then(boards =>
        Promise.all(boards.map(generateBoardPagesAndCatalog)));
  }
  // delete files
  if (filesToDelete.length) {
    await Promise.all(filesToDelete.map(f =>
      new Promise((resolve, reject) => fs.remove(f, () => resolve()))));
  }

  return {
    threads: threadsToDelete.length,
    replies: repliesToDelete.length,
    attachments: attachmentsToDelete.length
  };
};


/**
 * Update fields of posts and save it to DB.
 * @async
 * @param {Array.<Post>} posts - array of post mongoose documents
 * @param {Object} setPosts - object with fields to change in documents
 * @param {Array.<ObjectId>} attachmentsObjectIds - array of ObjectIds of attachments
 * @param {Object} setAttachments - object with fields to change in attahments in posts
 * @param {boolean} regenerate - regenerate corresponding html files
 * @returns result of Post.updateMany, or an emty object if no posts were updated
 */
module.exports.updatePosts = async (posts, setPosts, attachmentsObjectIds, setAttachments, regenerate = true) => {
  const response = {};

  if (!_.isEmpty(posts) && !_.isEmpty(setPosts)) {
    const postsObjectIds = posts.map(_.partialRight(_.pick, ['_id']));
    const selectQuery = { $or: postsObjectIds };
    const updateQuery = { $set: setPosts };
    const postResponse = await Post.updateMany(selectQuery, updateQuery);
    response.posts = postResponse;
  }

  if (!_.isEmpty(attachmentsObjectIds) && !_.isEmpty(setAttachments)) {
    // { attachments.$[elem].is(Deleted|NSFW|Spoiler): (true|false) }
    const setObj = _.mapKeys(setAttachments, (value, key) => 'attachments.$[elem].' + key);

    const selectQuery = { 'attachments._id': { $in: attachmentsObjectIds } };
    const updateQuery = { $set: setObj };
    const arrayFilters = [{ 'elem._id': { $in: attachmentsObjectIds } }];
    const queryOptions = { arrayFilters: arrayFilters, multi: true };

    const attachmentResponse = await Post.update(selectQuery, updateQuery, queryOptions).exec();
    response.attachments = attachmentResponse;
  }

  if (regenerate && (response.posts || response.attachments)) {
    const replies = posts.filter(r => !r.isOp);
    const threads = posts.filter(t => t.isOp);

    const threadsAffected = _.unionBy(
      replies.map(_.property('parent')),
      threads.map(_.property('_id')),
      String);

    const boardsAffected = _.uniqBy(
      posts.map(_.property('board')),
      String);

    const [threadDocuments, boardDocuments] = await Promise
      .all([
        Post.findThreadsByIds(threadsAffected).populate('children'),
        Board.findBoardsByIds(boardsAffected)
      ]);
    await generateThreads(threadDocuments);
    await Promise.all(boardDocuments.map(bd => generateBoardPagesAndCatalog(bd)));
  }
  return response;
};
